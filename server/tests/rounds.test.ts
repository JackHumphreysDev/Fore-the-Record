import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  roundCreateMock,
  roundFindManyMock,
  roundUpdateManyMock,
  teeFindUniqueMock,
  transactionMock,
  userFindUniqueMock,
  userUpdateMock,
} = vi.hoisted(() => ({
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
  },
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
  it('logs a total score and updates the current handicap atomically', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ handicapIndex: 12.4 })
    teeFindUniqueMock.mockResolvedValueOnce({
      courseRating: 73.1,
      slopeRating: 137,
      par: 70,
    })
    const createdRound = {
      id: roundId,
      userId,
      teeId,
      datePlayed,
      grossScore: 95,
      adjustedGrossScore: 95,
      isCapped: false,
      weatherCondition: 'DRY',
      pccAdjustment: '0',
      scoreDifferential: '18.1',
      isAcceptable: true,
      usedInHandicapCalc: false,
      createdAt,
      holeScores: [],
    }
    roundCreateMock.mockResolvedValueOnce(createdRound)
    roundFindManyMock.mockResolvedValueOnce([
      {
        id: roundId,
        datePlayed,
        scoreDifferential: 18.1,
        isAcceptable: true,
      },
    ])

    const response = await request(app).post('/api/rounds').send({
      userId,
      teeId,
      datePlayed: '2026-08-30',
      grossScore: 95,
      weatherCondition: 'DRY',
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      round: {
        ...createdRound,
        pccAdjustment: 0,
        scoreDifferential: 18.1,
        datePlayed: datePlayed.toISOString(),
        createdAt: createdAt.toISOString(),
        usedInHandicapCalc: true,
      },
      handicapIndex: 18.1,
      usedRoundIds: [roundId],
    })
    expect(transactionMock).toHaveBeenCalledOnce()
    expect(roundCreateMock).toHaveBeenCalledWith({
      data: {
        userId,
        teeId,
        datePlayed,
        grossScore: 95,
        adjustedGrossScore: 95,
        isCapped: false,
        weatherCondition: 'DRY',
        pccAdjustment: 0,
        scoreDifferential: 18.1,
        isAcceptable: true,
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
      data: { handicapIndex: 18.1 },
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
          adjustedGrossScore: 75,
          isCapped: true,
          scoreDifferential: 3,
          holeScores: { create: holeScores },
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
    })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
    expect(roundCreateMock).not.toHaveBeenCalled()
    expect(userUpdateMock).not.toHaveBeenCalled()
  })
})
