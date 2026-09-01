import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAuthenticatedUserMock,
  profileFindUniqueMock,
  roundCreateMock,
  roundFindManyMock,
  roundUpdateManyMock,
  teeFindUniqueMock,
  transactionMock,
  userFindUniqueMock,
  userUpdateMock,
} = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  profileFindUniqueMock: vi.fn(),
  roundCreateMock: vi.fn(),
  roundFindManyMock: vi.fn(),
  roundUpdateManyMock: vi.fn(),
  teeFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
}))

const transactionClient = {
  round: {
    create: roundCreateMock,
    findMany: roundFindManyMock,
    updateMany: roundUpdateManyMock,
  },
  tee: {
    findUnique: teeFindUniqueMock,
  },
  user: {
    findUnique: userFindUniqueMock,
    update: userUpdateMock,
  },
}

vi.mock('../src/database.js', () => ({
  prisma: {
    $transaction: transactionMock,
    user: {
      findUnique: profileFindUniqueMock,
    },
  },
}))

vi.mock('../src/auth.js', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}))

vi.mock('../src/courseRatings.js', () => ({
  getCourseRatings: vi.fn(),
}))

import app from '../src/app.js'

const userId = '11111111-1111-4111-8111-111111111111'
const teeId = '22222222-2222-4222-8222-222222222222'
const roundId = '33333333-3333-4333-8333-333333333333'
const datePlayed = new Date('2026-08-30T00:00:00.000Z')
const createdAt = new Date('2026-08-30T12:00:00.000Z')

beforeEach(() => {
  getAuthenticatedUserMock.mockReset()
  getAuthenticatedUserMock.mockResolvedValue({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'player@example.com',
    emailConfirmed: true,
  })
  profileFindUniqueMock.mockReset()
  profileFindUniqueMock.mockResolvedValue({ id: userId })
  roundCreateMock.mockReset()
  roundFindManyMock.mockReset()
  roundUpdateManyMock.mockReset()
  teeFindUniqueMock.mockReset()
  transactionMock.mockReset()
  userFindUniqueMock.mockReset()
  userUpdateMock.mockReset()

  transactionMock.mockImplementation(
    async (
      operation: (client: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  )
  roundUpdateManyMock.mockResolvedValue({ count: 0 })
  userUpdateMock.mockResolvedValue({})
})

describe('POST /api/rounds', () => {
  it('logs a matching total and hole-by-hole card atomically', async () => {
    const holeScores = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1,
      strokesTaken: 5,
    }))
    userFindUniqueMock.mockResolvedValueOnce({ handicapIndex: 12.4 })
    teeFindUniqueMock.mockResolvedValueOnce({
      courseRating: 73.1,
      slopeRating: 137,
      par: 70,
      holes: holeScores.map(({ strokesTaken: _strokesTaken, ...hole }) => ({
        ...hole,
        yardage: null,
      })),
    })
    const createdRound = {
      id: roundId,
      userId,
      teeId,
      datePlayed,
      grossScore: 90,
      adjustedGrossScore: 90,
      isCapped: false,
      weatherCondition: 'DRY',
      pccAdjustment: '0',
      scoreDifferential: '13.9',
      isAcceptable: true,
      scorecardStatus: 'VERIFIED',
      usedInHandicapCalc: false,
      createdAt,
      holeScores,
    }
    roundCreateMock.mockResolvedValueOnce(createdRound)
    roundFindManyMock.mockResolvedValueOnce([
      {
        id: roundId,
        datePlayed,
        scoreDifferential: 13.9,
        isAcceptable: true,
      },
    ])

    const response = await request(app).post('/api/rounds').send({
      userId,
      teeId,
      datePlayed: '2026-08-30',
      grossScore: 90,
      weatherCondition: 'DRY',
      holeScores,
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      round: {
        ...createdRound,
        pccAdjustment: 0,
        scoreDifferential: 13.9,
        datePlayed: datePlayed.toISOString(),
        createdAt: createdAt.toISOString(),
        usedInHandicapCalc: true,
      },
      handicapIndex: 13.9,
      usedRoundIds: [roundId],
    })
    expect(transactionMock).toHaveBeenCalledOnce()
    expect(roundCreateMock).toHaveBeenCalledWith({
      data: {
        userId,
        teeId,
        datePlayed,
        timePlayed: null,
        category: 'CASUAL',
        participation: 'INDIVIDUAL',
        competitionName: null,
        competitionFormat: null,
        numberOfPlayers: null,
        grossScore: 90,
        adjustedGrossScore: 90,
        isCapped: false,
        weatherCondition: 'DRY',
        pccAdjustment: 0,
        scoreDifferential: 13.9,
        isAcceptable: true,
        scorecardStatus: 'VERIFIED',
        holeScores: { create: holeScores },
      },
      include: {
        holeScores: {
          orderBy: { holeNumber: 'asc' },
        },
      },
    })
    expect(roundUpdateManyMock).toHaveBeenNthCalledWith(1, {
      where: { userId, usedInHandicapCalc: true },
      data: { usedInHandicapCalc: false },
    })
    expect(roundUpdateManyMock).toHaveBeenNthCalledWith(2, {
      where: { id: { in: [roundId] } },
      data: { usedInHandicapCalc: true },
    })
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: { handicapIndex: 13.9 },
    })
  })

  it('caps a complete scorecard at net double bogey', async () => {
    const holeScores = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1,
      strokesTaken: index === 0 ? 9 : 4,
    }))

    userFindUniqueMock.mockResolvedValueOnce({ handicapIndex: 18 })
    teeFindUniqueMock.mockResolvedValueOnce({
      courseRating: 72,
      slopeRating: 113,
      par: 72,
      holes: holeScores.map(({ strokesTaken: _strokesTaken, ...hole }) => ({
        ...hole,
        yardage: null,
      })),
    })
    roundCreateMock.mockResolvedValueOnce({
      id: roundId,
      userId,
      teeId,
      datePlayed,
      grossScore: 77,
      adjustedGrossScore: 75,
      isCapped: true,
      weatherCondition: 'WET',
      pccAdjustment: 0,
      scoreDifferential: 3,
      isAcceptable: true,
      usedInHandicapCalc: false,
      createdAt,
      holeScores,
    })
    roundFindManyMock.mockResolvedValueOnce([
      {
        id: roundId,
        datePlayed,
        scoreDifferential: 3,
        isAcceptable: true,
      },
    ])

    const response = await request(app).post('/api/rounds').send({
      userId,
      teeId,
      datePlayed: '2026-08-30',
      timePlayed: '08:45',
      category: 'COMPETITION',
      participation: 'INDIVIDUAL',
      competitionName: 'Captain’s Day',
      competitionFormat: 'Medal',
      numberOfPlayers: 84,
      grossScore: 77,
      weatherCondition: 'WET',
      holeScores,
    })

    expect(response.status).toBe(201)
    expect(response.body.round).toMatchObject({
      grossScore: 77,
      adjustedGrossScore: 75,
      isCapped: true,
      scoreDifferential: 3,
    })
    expect(roundCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          timePlayed: '08:45',
          category: 'COMPETITION',
          participation: 'INDIVIDUAL',
          competitionName: 'Captain’s Day',
          competitionFormat: 'Medal',
          numberOfPlayers: 84,
          adjustedGrossScore: 75,
          isCapped: true,
          scoreDifferential: 3,
          holeScores: { create: holeScores },
        }),
      }),
    )
  })

  it('stores a team competition as record-only without changing handicap', async () => {
    const existingCountingRoundId =
      '44444444-4444-4444-8444-444444444444'

    userFindUniqueMock.mockResolvedValueOnce({ handicapIndex: 11.7 })
    teeFindUniqueMock.mockResolvedValueOnce({
      teeName: 'White',
      courseRating: 72,
      slopeRating: 113,
      par: 72,
      holes: [],
      course: {
        name: 'Main Course',
        club: { name: 'Example Golf Club' },
      },
    })
    const createdRound = {
      id: roundId,
      userId,
      teeId,
      datePlayed,
      timePlayed: '13:30',
      category: 'COMPETITION',
      participation: 'TEAM',
      competitionName: 'Invitation Day',
      competitionFormat: 'Texas Scramble',
      numberOfPlayers: 64,
      grossScore: null,
      adjustedGrossScore: null,
      isCapped: false,
      weatherCondition: null,
      pccAdjustment: 0,
      scoreDifferential: null,
      isAcceptable: false,
      scorecardStatus: 'NOT_REQUIRED',
      usedInHandicapCalc: false,
      createdAt,
      holeScores: [],
    }
    roundCreateMock.mockResolvedValueOnce(createdRound)
    roundFindManyMock.mockResolvedValueOnce([
      { id: existingCountingRoundId },
    ])

    const response = await request(app).post('/api/rounds').send({
      teeId,
      datePlayed: '2026-08-30',
      timePlayed: '13:30',
      category: 'COMPETITION',
      participation: 'TEAM',
      competitionName: '  Invitation Day  ',
      competitionFormat: ' Texas Scramble ',
      numberOfPlayers: 64,
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      round: {
        ...createdRound,
        datePlayed: datePlayed.toISOString(),
        createdAt: createdAt.toISOString(),
      },
      handicapIndex: 11.7,
      usedRoundIds: [existingCountingRoundId],
    })
    expect(roundCreateMock).toHaveBeenCalledWith({
      data: {
        userId,
        teeId,
        datePlayed,
        timePlayed: '13:30',
        category: 'COMPETITION',
        participation: 'TEAM',
        competitionName: 'Invitation Day',
        competitionFormat: 'Texas Scramble',
        numberOfPlayers: 64,
        grossScore: null,
        adjustedGrossScore: null,
        isCapped: false,
        weatherCondition: null,
        pccAdjustment: 0,
        scoreDifferential: null,
        isAcceptable: false,
        usedInHandicapCalc: false,
        scorecardStatus: 'NOT_REQUIRED',
      },
      include: {
        holeScores: { orderBy: { holeNumber: 'asc' } },
      },
    })
    expect(roundUpdateManyMock).not.toHaveBeenCalled()
    expect(userUpdateMock).not.toHaveBeenCalled()
  })

  it('rejects a team competition that attempts to submit a gross score', async () => {
    const response = await request(app).post('/api/rounds').send({
      teeId,
      datePlayed: '2026-08-30',
      timePlayed: '13:30',
      category: 'COMPETITION',
      participation: 'TEAM',
      competitionName: 'Invitation Day',
      competitionFormat: 'Texas Scramble',
      numberOfPlayers: 64,
      grossScore: 70,
    })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid round data' })
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('saves a manually defined scorecard for review without changing handicap', async () => {
    const holeScores = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1,
      strokesTaken: 4,
      ...(index === 0 ? { yardage: 410 } : {}),
    }))
    userFindUniqueMock.mockResolvedValueOnce({ handicapIndex: 10.2 })
    teeFindUniqueMock.mockResolvedValueOnce({
      teeName: 'White',
      courseRating: 72,
      slopeRating: 113,
      par: 72,
      holes: [],
      course: {
        name: 'Main Course',
        club: { name: 'Example Golf Club' },
      },
    })
    roundCreateMock.mockResolvedValueOnce({
      id: roundId,
      userId,
      teeId,
      datePlayed,
      grossScore: 72,
      adjustedGrossScore: 72,
      isCapped: false,
      weatherCondition: 'DRY',
      pccAdjustment: 0,
      scoreDifferential: 0,
      isAcceptable: false,
      scorecardStatus: 'PENDING_REVIEW',
      usedInHandicapCalc: false,
      createdAt,
      holeScores,
    })
    roundFindManyMock.mockResolvedValueOnce([])

    const response = await request(app).post('/api/rounds').send({
      teeId,
      datePlayed: '2026-08-30',
      grossScore: 72,
      weatherCondition: 'DRY',
      holeScores,
    })

    expect(response.status).toBe(201)
    expect(response.body.round.scorecardStatus).toBe('PENDING_REVIEW')
    expect(response.body.handicapIndex).toBeNull()
    expect(roundCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isAcceptable: false,
          scorecardStatus: 'PENDING_REVIEW',
          scorecardReview: {
            create: expect.objectContaining({
              tee: { connect: { id: teeId } },
              submission: {
                create: expect.objectContaining({
                  type: 'SCORECARD_REVIEW',
                  clubName: 'Example Golf Club',
                  courseName: 'Main Course',
                  teeDetails: 'White',
                }),
              },
            }),
          },
        }),
      }),
    )
  })

  it('rejects an incomplete scorecard before opening a transaction', async () => {
    const response = await request(app)
      .post('/api/rounds')
      .send({
        userId,
        teeId,
        datePlayed: '2026-08-30',
        grossScore: 5,
        weatherCondition: 'MOIST',
        holeScores: [
          {
            holeNumber: 1,
            par: 4,
            strokeIndex: 1,
            strokesTaken: 5,
          },
        ],
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid round data' })
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('returns 404 without writing when the user does not exist', async () => {
    const holeScores = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1,
      strokesTaken: 5,
    }))
    userFindUniqueMock.mockResolvedValueOnce(null)
    teeFindUniqueMock.mockResolvedValueOnce({
      courseRating: 72,
      slopeRating: 113,
      par: 72,
    })

    const response = await request(app).post('/api/rounds').send({
      userId,
      teeId,
      datePlayed: '2026-08-30',
      grossScore: 90,
      weatherCondition: 'SUPER_WET',
      holeScores,
    })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
    expect(roundCreateMock).not.toHaveBeenCalled()
    expect(userUpdateMock).not.toHaveBeenCalled()
  })
})
