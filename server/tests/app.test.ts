import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAuthenticatedUserMock,
  getVerifiedTokenSubjectMock,
  getAccountStatusByAuthUserIdMock,
  inviteAuthUserMock,
  updateAuthUserEmailMock,
  setAuthUserSuspendedMock,
  deleteAuthUserMock,
  updateRoundAsAdminMock,
  deleteRoundAsAdminMock,
  prismaTransactionMock,
  clubCountMock,
  clubCreateMock,
  clubFindFirstMock,
  clubFindUniqueMock,
  clubFindManyMock,
  clubUpdateMock,
  courseCountMock,
  courseFindUniqueMock,
  courseFindManyMock,
  courseUpdateMock,
  getCourseRatingsMock,
  getProviderClubCourseRatingsMock,
  searchCourseProviderClubsMock,
  getProviderTeeScorecardMock,
  teeFindUniqueMock,
  teeFindFirstMock,
  teeUpdateMock,
  teeHoleCreateManyMock,
  teeHoleDeleteManyMock,
  scorecardReviewFindManyMock,
  scorecardReviewDeleteManyMock,
  logRoundMock,
  parseLogRoundInputMock,
  roundCountMock,
  roundFindManyMock,
  roundFindFirstMock,
  roundFindUniqueMock,
  roundUpdateManyMock,
  roundDeleteManyMock,
  submissionCountMock,
  submissionCreateMock,
  submissionFindFirstMock,
  submissionFindUniqueMock,
  submissionFindManyMock,
  submissionUpdateMock,
  submissionDeleteManyMock,
  submissionMessageCountMock,
  submissionMessageCreateMock,
  submissionMessageFindManyMock,
  submissionMessageDeleteManyMock,
  adminAuditLogCreateMock,
  userCountMock,
  userCreateMock,
  userFindManyMock,
  userFindFirstMock,
  userFindUniqueMock,
  userUpdateMock,
  userDeleteMock,
  userCoursePreferenceFindManyMock,
  userCoursePreferenceFindUniqueMock,
  userCoursePreferenceUpsertMock,
  userCoursePreferenceUpdateMock,
  userCoursePreferenceDeleteManyMock,
  friendshipFindManyMock,
  friendshipFindUniqueMock,
  friendshipFindFirstMock,
  friendshipCreateMock,
  friendshipUpdateMock,
  friendshipDeleteMock,
  friendshipDeleteManyMock,
  playerGoalFindManyMock,
  playerGoalUpsertMock,
  playerGoalDeleteManyMock,
} = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  getVerifiedTokenSubjectMock: vi.fn(),
  getAccountStatusByAuthUserIdMock: vi.fn(),
  inviteAuthUserMock: vi.fn(),
  updateAuthUserEmailMock: vi.fn(),
  setAuthUserSuspendedMock: vi.fn(),
  deleteAuthUserMock: vi.fn(),
  updateRoundAsAdminMock: vi.fn(),
  deleteRoundAsAdminMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
  clubCountMock: vi.fn(),
  clubCreateMock: vi.fn(),
  clubFindFirstMock: vi.fn(),
  clubFindUniqueMock: vi.fn(),
  clubFindManyMock: vi.fn(),
  clubUpdateMock: vi.fn(),
  courseCountMock: vi.fn(),
  courseFindUniqueMock: vi.fn(),
  courseFindManyMock: vi.fn(),
  courseUpdateMock: vi.fn(),
  getCourseRatingsMock: vi.fn(),
  getProviderClubCourseRatingsMock: vi.fn(),
  searchCourseProviderClubsMock: vi.fn(),
  getProviderTeeScorecardMock: vi.fn(),
  teeFindUniqueMock: vi.fn(),
  teeFindFirstMock: vi.fn(),
  teeUpdateMock: vi.fn(),
  teeHoleCreateManyMock: vi.fn(),
  teeHoleDeleteManyMock: vi.fn(),
  scorecardReviewFindManyMock: vi.fn(),
  scorecardReviewDeleteManyMock: vi.fn(),
  logRoundMock: vi.fn(),
  parseLogRoundInputMock: vi.fn(),
  roundCountMock: vi.fn(),
  roundFindManyMock: vi.fn(),
  roundFindFirstMock: vi.fn(),
  roundFindUniqueMock: vi.fn(),
  roundUpdateManyMock: vi.fn(),
  roundDeleteManyMock: vi.fn(),
  submissionCountMock: vi.fn(),
  submissionCreateMock: vi.fn(),
  submissionFindFirstMock: vi.fn(),
  submissionFindUniqueMock: vi.fn(),
  submissionFindManyMock: vi.fn(),
  submissionUpdateMock: vi.fn(),
  submissionDeleteManyMock: vi.fn(),
  submissionMessageCountMock: vi.fn(),
  submissionMessageCreateMock: vi.fn(),
  submissionMessageFindManyMock: vi.fn(),
  submissionMessageDeleteManyMock: vi.fn(),
  adminAuditLogCreateMock: vi.fn(),
  userCountMock: vi.fn(),
  userCreateMock: vi.fn(),
  userFindManyMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
  userDeleteMock: vi.fn(),
  userCoursePreferenceFindManyMock: vi.fn(),
  userCoursePreferenceFindUniqueMock: vi.fn(),
  userCoursePreferenceUpsertMock: vi.fn(),
  userCoursePreferenceUpdateMock: vi.fn(),
  userCoursePreferenceDeleteManyMock: vi.fn(),
  friendshipFindManyMock: vi.fn(),
  friendshipFindUniqueMock: vi.fn(),
  friendshipFindFirstMock: vi.fn(),
  friendshipCreateMock: vi.fn(),
  friendshipUpdateMock: vi.fn(),
  friendshipDeleteMock: vi.fn(),
  friendshipDeleteManyMock: vi.fn(),
  playerGoalFindManyMock: vi.fn(),
  playerGoalUpsertMock: vi.fn(),
  playerGoalDeleteManyMock: vi.fn(),
}))

vi.mock('../src/database.js', () => ({
  prisma: {
    $transaction: prismaTransactionMock,
    club: {
      count: clubCountMock,
      create: clubCreateMock,
      findFirst: clubFindFirstMock,
      findUnique: clubFindUniqueMock,
      findMany: clubFindManyMock,
      update: clubUpdateMock,
    },
    course: {
      count: courseCountMock,
      findUnique: courseFindUniqueMock,
      findMany: courseFindManyMock,
      update: courseUpdateMock,
    },
    tee: {
      findFirst: teeFindFirstMock,
      findUnique: teeFindUniqueMock,
      update: teeUpdateMock,
    },
    teeHole: {
      createMany: teeHoleCreateManyMock,
      deleteMany: teeHoleDeleteManyMock,
    },
    scorecardReview: {
      findMany: scorecardReviewFindManyMock,
      deleteMany: scorecardReviewDeleteManyMock,
    },
    user: {
      count: userCountMock,
      create: userCreateMock,
      findFirst: userFindFirstMock,
      findMany: userFindManyMock,
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
      delete: userDeleteMock,
    },
    userCoursePreference: {
      findMany: userCoursePreferenceFindManyMock,
      findUnique: userCoursePreferenceFindUniqueMock,
      upsert: userCoursePreferenceUpsertMock,
      update: userCoursePreferenceUpdateMock,
      deleteMany: userCoursePreferenceDeleteManyMock,
    },
    friendship: {
      findMany: friendshipFindManyMock,
      findUnique: friendshipFindUniqueMock,
      findFirst: friendshipFindFirstMock,
      create: friendshipCreateMock,
      update: friendshipUpdateMock,
      delete: friendshipDeleteMock,
      deleteMany: friendshipDeleteManyMock,
    },
    playerGoal: {
      findMany: playerGoalFindManyMock,
      upsert: playerGoalUpsertMock,
      deleteMany: playerGoalDeleteManyMock,
    },
    round: {
      count: roundCountMock,
      findFirst: roundFindFirstMock,
      findMany: roundFindManyMock,
      findUnique: roundFindUniqueMock,
      updateMany: roundUpdateManyMock,
      deleteMany: roundDeleteManyMock,
    },
    submission: {
      count: submissionCountMock,
      create: submissionCreateMock,
      findFirst: submissionFindFirstMock,
      findUnique: submissionFindUniqueMock,
      findMany: submissionFindManyMock,
      update: submissionUpdateMock,
      deleteMany: submissionDeleteManyMock,
    },
    submissionMessage: {
      count: submissionMessageCountMock,
      create: submissionMessageCreateMock,
      findMany: submissionMessageFindManyMock,
      deleteMany: submissionMessageDeleteManyMock,
    },
    adminAuditLog: {
      create: adminAuditLogCreateMock,
    },
  },
}))

vi.mock('../src/courseRatings.js', () => ({
  getCourseRatings: getCourseRatingsMock,
  getProviderClubCourseRatings: getProviderClubCourseRatingsMock,
  searchCourseProviderClubs: searchCourseProviderClubsMock,
}))

vi.mock('../src/courseScorecards.js', () => ({
  getProviderTeeScorecard: getProviderTeeScorecardMock,
  isCompleteScorecard: (holes: unknown[]) => holes.length === 18,
}))

vi.mock('../src/auth.js', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  getVerifiedTokenSubject: getVerifiedTokenSubjectMock,
}))

vi.mock('../src/accountAccess.js', () => ({
  getAccountStatusByAuthUserId: getAccountStatusByAuthUserIdMock,
}))

vi.mock('../src/adminAuth.js', () => ({
  inviteAuthUser: inviteAuthUserMock,
  updateAuthUserEmail: updateAuthUserEmailMock,
  setAuthUserSuspended: setAuthUserSuspendedMock,
  deleteAuthUser: deleteAuthUserMock,
  AdminAuthOperationError: class AdminAuthOperationError extends Error {
    constructor(
      readonly reason: string,
      message: string,
    ) {
      super(message)
      this.name = 'AdminAuthOperationError'
    }
  },
}))

vi.mock('../src/adminRounds.js', () => ({
  updateRoundAsAdmin: updateRoundAsAdminMock,
  deleteRoundAsAdmin: deleteRoundAsAdminMock,
  AdminRoundError: class AdminRoundError extends Error {
    constructor(
      readonly reason: string,
      message: string,
    ) {
      super(message)
      this.name = 'AdminRoundError'
    }
  },
}))

vi.mock('../src/rounds.js', async () => {
  const actual = await vi.importActual<typeof import('../src/rounds.js')>(
    '../src/rounds.js',
  )

  return {
    ...actual,
    logRound: logRoundMock,
    parseLogRoundInput: parseLogRoundInputMock,
  }
})

import app from '../src/app.js'

beforeEach(() => {
  prismaTransactionMock.mockReset()
  prismaTransactionMock.mockImplementation((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  )
  getAuthenticatedUserMock.mockReset()
  getAuthenticatedUserMock.mockResolvedValue({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'jack@example.com',
    emailConfirmed: true,
  })
  getVerifiedTokenSubjectMock.mockReset()
  getVerifiedTokenSubjectMock.mockResolvedValue(null)
  getAccountStatusByAuthUserIdMock.mockReset()
  getAccountStatusByAuthUserIdMock.mockResolvedValue('ACTIVE')
  inviteAuthUserMock.mockReset()
  updateAuthUserEmailMock.mockReset()
  updateAuthUserEmailMock.mockResolvedValue(undefined)
  setAuthUserSuspendedMock.mockReset()
  setAuthUserSuspendedMock.mockResolvedValue(undefined)
  deleteAuthUserMock.mockReset()
  deleteAuthUserMock.mockResolvedValue(undefined)
  updateRoundAsAdminMock.mockReset()
  deleteRoundAsAdminMock.mockReset()
  clubCountMock.mockReset()
  clubCreateMock.mockReset()
  clubFindFirstMock.mockReset()
  clubFindFirstMock.mockResolvedValue(null)
  clubFindUniqueMock.mockReset()
  clubFindManyMock.mockReset()
  clubFindManyMock.mockResolvedValue([])
  clubUpdateMock.mockReset()
  courseCountMock.mockReset()
  courseFindUniqueMock.mockReset()
  courseFindManyMock.mockReset()
  courseUpdateMock.mockReset()
  getCourseRatingsMock.mockReset()
  getProviderClubCourseRatingsMock.mockReset()
  searchCourseProviderClubsMock.mockReset()
  getProviderTeeScorecardMock.mockReset()
  teeFindUniqueMock.mockReset()
  teeFindFirstMock.mockReset()
  teeUpdateMock.mockReset()
  teeHoleCreateManyMock.mockReset()
  teeHoleDeleteManyMock.mockReset()
  scorecardReviewFindManyMock.mockReset()
  scorecardReviewFindManyMock.mockResolvedValue([])
  scorecardReviewDeleteManyMock.mockReset()
  scorecardReviewDeleteManyMock.mockResolvedValue({ count: 0 })
  teeHoleCreateManyMock.mockResolvedValue({ count: 0 })
  teeHoleDeleteManyMock.mockResolvedValue({ count: 0 })
  logRoundMock.mockReset()
  parseLogRoundInputMock.mockReset()
  roundCountMock.mockReset()
  roundFindFirstMock.mockReset()
  roundFindManyMock.mockReset()
  roundFindUniqueMock.mockReset()
  roundUpdateManyMock.mockReset()
  roundDeleteManyMock.mockReset()
  roundDeleteManyMock.mockResolvedValue({ count: 0 })
  submissionCountMock.mockReset()
  submissionCountMock.mockResolvedValue(0)
  submissionCreateMock.mockReset()
  submissionFindFirstMock.mockReset()
  submissionFindUniqueMock.mockReset()
  submissionFindManyMock.mockReset()
  submissionUpdateMock.mockReset()
  submissionDeleteManyMock.mockReset()
  submissionDeleteManyMock.mockResolvedValue({ count: 0 })
  submissionMessageCountMock.mockReset()
  submissionMessageCountMock.mockResolvedValue(0)
  submissionMessageCreateMock.mockReset()
  submissionMessageFindManyMock.mockReset()
  submissionMessageDeleteManyMock.mockReset()
  submissionMessageDeleteManyMock.mockResolvedValue({ count: 0 })
  adminAuditLogCreateMock.mockReset()
  userCountMock.mockReset()
  userCreateMock.mockReset()
  userFindManyMock.mockReset()
  userFindFirstMock.mockReset()
  userFindFirstMock.mockResolvedValue(null)
  userFindUniqueMock.mockReset()
  userUpdateMock.mockReset()
  userDeleteMock.mockReset()
  userDeleteMock.mockResolvedValue({})
  userCoursePreferenceFindManyMock.mockReset()
  userCoursePreferenceFindManyMock.mockResolvedValue([])
  userCoursePreferenceFindUniqueMock.mockReset()
  userCoursePreferenceUpsertMock.mockReset()
  userCoursePreferenceUpdateMock.mockReset()
  userCoursePreferenceDeleteManyMock.mockReset()
  userCoursePreferenceDeleteManyMock.mockResolvedValue({ count: 0 })
  friendshipFindManyMock.mockReset()
  friendshipFindManyMock.mockResolvedValue([])
  friendshipFindUniqueMock.mockReset()
  friendshipFindFirstMock.mockReset()
  friendshipCreateMock.mockReset()
  friendshipUpdateMock.mockReset()
  friendshipDeleteMock.mockReset()
  friendshipDeleteManyMock.mockReset()
  friendshipDeleteManyMock.mockResolvedValue({ count: 0 })
  playerGoalFindManyMock.mockReset()
  playerGoalFindManyMock.mockResolvedValue([])
  playerGoalUpsertMock.mockReset()
  playerGoalDeleteManyMock.mockReset()
  playerGoalDeleteManyMock.mockResolvedValue({ count: 0 })
})

describe('GET /api/health', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})

describe('API authentication', () => {
  it('should reject a protected request without a verified session', async () => {
    getAuthenticatedUserMock.mockResolvedValueOnce(null)

    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Authentication required' })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('should reject every protected request from a suspended account', async () => {
    getAccountStatusByAuthUserIdMock.mockResolvedValueOnce('SUSPENDED')

    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: 'This account has been suspended. Contact the administrator.',
    })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('should preserve the suspension notice when Supabase rejects the banned session', async () => {
    getAuthenticatedUserMock.mockResolvedValueOnce(null)
    getVerifiedTokenSubjectMock.mockResolvedValueOnce(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
    getAccountStatusByAuthUserIdMock.mockResolvedValueOnce('SUSPENDED')

    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: 'This account has been suspended. Contact the administrator.',
    })
    expect(getAccountStatusByAuthUserIdMock).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/me', () => {
  const adminProfile = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  it('should return the current administrator identity', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)

    const response = await request(app).get('/api/admin/me')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(adminProfile)
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })
  })

  it('should reject a player account', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      ...adminProfile,
      role: 'PLAYER',
    })

    const response = await request(app).get('/api/admin/me')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Administrator access required' })
  })

  it('should reject an authenticated account without a linked profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).get('/api/admin/me')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Administrator access required' })
  })
})

describe('GET /api/admin/overview', () => {
  const adminProfile = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  it('should return operational totals and recent registrations', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    userCountMock.mockResolvedValueOnce(14)
    roundCountMock.mockResolvedValueOnce(38)
    clubCountMock.mockResolvedValueOnce(6)
    userFindManyMock.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        authUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Recent Player',
        email: 'recent@example.com',
        role: 'PLAYER',
        status: 'ACTIVE',
        handicapIndex: '12.4',
        createdAt: new Date('2026-08-31T18:15:00.000Z'),
        homeClub: {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Example Golf Club',
        },
        _count: { rounds: 4 },
      },
    ])

    const response = await request(app).get('/api/admin/overview')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      totals: {
        users: 14,
        rounds: 38,
        clubs: 6,
      },
      recentRegistrations: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Recent Player',
          email: 'recent@example.com',
          role: 'PLAYER',
          status: 'ACTIVE',
          hasLogin: true,
          handicapIndex: 12.4,
          createdAt: '2026-08-31T18:15:00.000Z',
          homeClub: {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Example Golf Club',
          },
          roundCount: 4,
        },
      ],
    })
    expect(userCountMock).toHaveBeenCalledWith()
    expect(roundCountMock).toHaveBeenCalledWith()
    expect(clubCountMock).toHaveBeenCalledWith()
    expect(userFindManyMock).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        id: true,
        authUserId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        handicapIndex: true,
        createdAt: true,
        homeClub: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { rounds: true },
        },
      },
    })
  })

  it('should reject a player before reading operational data', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      ...adminProfile,
      role: 'PLAYER',
    })

    const response = await request(app).get('/api/admin/overview')

    expect(response.status).toBe(403)
    expect(userCountMock).not.toHaveBeenCalled()
    expect(roundCountMock).not.toHaveBeenCalled()
    expect(clubCountMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/catalogue', () => {
  const adminProfile = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  it('returns nested catalogue records with safe usage controls', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    clubCountMock.mockResolvedValueOnce(1)
    clubFindManyMock.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        externalId: null,
        name: 'Example Golf Club',
        city: 'Sheffield',
        county: 'South Yorkshire',
        postcode: null,
        countryCode: 'ENG',
        latitude: null,
        longitude: null,
        googleRating: null,
        clubType: null,
        courseType: null,
        _count: { members: 1, courses: 1 },
        courses: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            externalId: null,
            name: 'Main Course',
            holes: 18,
            par: 72,
            designedBy: null,
            yearOpened: null,
            _count: { tees: 1 },
            tees: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                externalId: null,
                teeName: 'White',
                colour: 'white',
                gender: 'male',
                totalYardage: 6500,
                totalMetres: null,
                par: 72,
                courseRating: '71.8',
                slopeRating: 128,
                source: 'MANUAL',
                holes: [],
                _count: { rounds: 2, scorecardReviews: 0 },
              },
            ],
          },
        ],
      },
    ])

    const response = await request(app).get(
      '/api/admin/catalogue?search=example&page=1&pageSize=10',
    )

    expect(response.status).toBe(200)
    expect(response.body.clubs[0]).toMatchObject({
      name: 'Example Golf Club',
      canDelete: false,
      courses: [
        {
          canDelete: false,
          tees: [
            {
              courseRating: 71.8,
              isUsed: true,
              canDelete: false,
            },
          ],
        },
      ],
    })
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    })
  })

  it('rejects a player before reading catalogue data', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      ...adminProfile,
      role: 'PLAYER',
    })

    const response = await request(app).get('/api/admin/catalogue')

    expect(response.status).toBe(403)
    expect(clubFindManyMock).not.toHaveBeenCalled()
  })
})

describe('administrator catalogue mutations', () => {
  const adminProfile = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  it('creates a club and writes an audit record in the same transaction', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    clubCreateMock.mockResolvedValueOnce({
      id: '22222222-2222-4222-8222-222222222222',
    })
    adminAuditLogCreateMock.mockResolvedValueOnce({})

    const response = await request(app)
      .post('/api/admin/catalogue/clubs')
      .send({ name: 'New Golf Club', countryCode: 'eng' })

    expect(response.status).toBe(201)
    expect(prismaTransactionMock).toHaveBeenCalledOnce()
    expect(clubCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'New Golf Club',
        countryCode: 'ENG',
      }),
      select: { id: true },
    })
    expect(adminAuditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: adminProfile.id,
        action: 'CATALOGUE_CLUB_CREATED',
        targetType: 'Club',
      }),
    })
  })

  it('locks ratings when a recorded round already uses the tee', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    teeFindUniqueMock.mockResolvedValueOnce({
      id: '44444444-4444-4444-8444-444444444444',
      teeName: 'White',
      courseRating: '71.8',
      slopeRating: 128,
      par: 72,
      _count: { rounds: 2 },
    })

    const response = await request(app)
      .patch(
        '/api/admin/catalogue/tees/44444444-4444-4444-8444-444444444444',
      )
      .send({
        teeName: 'White',
        courseRating: 72,
        slopeRating: 128,
        par: 72,
      })

    expect(response.status).toBe(409)
    expect(response.body.error).toContain('rounds already use this tee')
    expect(teeUpdateMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/users', () => {
  const adminProfile = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  it('should search safe user fields with server-side pagination', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    userCountMock.mockResolvedValueOnce(5)
    userFindManyMock.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        authUserId: null,
        name: 'Jack Player',
        email: 'jack.player@example.com',
        role: 'PLAYER',
        status: 'ACTIVE',
        handicapIndex: null,
        createdAt: new Date('2026-08-30T09:00:00.000Z'),
        homeClub: null,
        _count: { rounds: 0 },
      },
    ])

    const response = await request(app).get(
      '/api/admin/users?search=jack&page=2&pageSize=2',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Jack Player',
          email: 'jack.player@example.com',
          role: 'PLAYER',
          status: 'ACTIVE',
          hasLogin: false,
          handicapIndex: null,
          createdAt: '2026-08-30T09:00:00.000Z',
          homeClub: null,
          roundCount: 0,
        },
      ],
      pagination: {
        page: 2,
        pageSize: 2,
        total: 5,
        totalPages: 3,
      },
    })

    const where = {
      OR: [
        {
          name: {
            contains: 'jack',
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: 'jack',
            mode: 'insensitive',
          },
        },
      ],
    }
    expect(userCountMock).toHaveBeenCalledWith({ where })
    expect(userFindManyMock).toHaveBeenCalledWith({
      where,
      orderBy: [{ name: 'asc' }, { email: 'asc' }, { id: 'asc' }],
      skip: 2,
      take: 2,
      select: {
        id: true,
        authUserId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        handicapIndex: true,
        createdAt: true,
        homeClub: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { rounds: true },
        },
      },
    })
  })

  it('should reject invalid pagination before querying users', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)

    const response = await request(app).get(
      '/api/admin/users?page=0&pageSize=100',
    )

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid pagination' })
    expect(userCountMock).not.toHaveBeenCalled()
    expect(userFindManyMock).not.toHaveBeenCalled()
  })
})

describe('administrator account management', () => {
  const administrator = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'jackhumphreys.dev@gmail.com',
    role: 'ADMIN',
  }
  const playerId = '22222222-2222-4222-8222-222222222222'
  const authUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const player = {
    id: playerId,
    authUserId,
    name: 'Example Player',
    email: 'player@example.com',
    role: 'PLAYER',
    status: 'ACTIVE',
    handicapIndex: null,
    createdAt: new Date('2026-09-02T09:00:00.000Z'),
    homeClub: null,
    _count: { rounds: 3 },
  }

  it('should invite a player without accepting or generating a password', async () => {
    userFindUniqueMock.mockResolvedValueOnce(administrator)
    inviteAuthUserMock.mockResolvedValueOnce({ authUserId })
    userCreateMock.mockResolvedValueOnce(player)
    adminAuditLogCreateMock.mockResolvedValueOnce({})

    const response = await request(app)
      .post('/api/admin/users')
      .set('Origin', 'https://fore-the-record.vercel.app')
      .send({
        name: '  Example   Player ',
        email: ' PLAYER@EXAMPLE.COM ',
        password: 'must-not-be-used',
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      id: playerId,
      name: 'Example Player',
      email: 'player@example.com',
      role: 'PLAYER',
      status: 'ACTIVE',
      hasLogin: true,
      roundCount: 3,
    })
    expect(inviteAuthUserMock).toHaveBeenCalledWith({
      name: 'Example Player',
      email: 'player@example.com',
      redirectTo: 'https://fore-the-record.vercel.app/?set-password=true',
    })
    expect(inviteAuthUserMock.mock.calls[0]?.[0]).not.toHaveProperty('password')
    expect(userCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authUserId,
        name: 'Example Player',
        email: 'player@example.com',
        status: 'ACTIVE',
      }),
      select: expect.objectContaining({ authUserId: true, status: true }),
    })
    expect(adminAuditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: administrator.id,
        action: 'USER_INVITED',
        targetType: 'User',
      }),
    })
  })

  it('should update a linked player email in Auth and the profile audit log', async () => {
    userFindUniqueMock
      .mockResolvedValueOnce(administrator)
      .mockResolvedValueOnce(player)
    userUpdateMock.mockResolvedValueOnce({
      ...player,
      name: 'Updated Player',
      email: 'updated@example.com',
    })
    adminAuditLogCreateMock.mockResolvedValueOnce({})

    const response = await request(app)
      .patch(`/api/admin/users/${playerId}`)
      .send({ name: 'Updated Player', email: 'updated@example.com' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      name: 'Updated Player',
      email: 'updated@example.com',
      hasLogin: true,
    })
    expect(updateAuthUserEmailMock).toHaveBeenCalledWith(
      authUserId,
      'updated@example.com',
    )
    expect(adminAuditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_DETAILS_UPDATED',
        targetId: playerId,
      }),
    })
  })

  it('should suspend a linked login and audit the status change', async () => {
    userFindUniqueMock
      .mockResolvedValueOnce(administrator)
      .mockResolvedValueOnce(player)
    userUpdateMock.mockResolvedValueOnce({
      ...player,
      status: 'SUSPENDED',
    })
    adminAuditLogCreateMock.mockResolvedValueOnce({})

    const response = await request(app)
      .patch(`/api/admin/users/${playerId}/status`)
      .send({ status: 'SUSPENDED' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('SUSPENDED')
    expect(setAuthUserSuspendedMock).toHaveBeenCalledWith(authUserId, true)
    expect(adminAuditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_SUSPENDED',
        targetId: playerId,
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED' },
      }),
    })
  })

  it('should protect the sole administrator from account mutations', async () => {
    userFindUniqueMock
      .mockResolvedValueOnce(administrator)
      .mockResolvedValueOnce({
        ...player,
        id: administrator.id,
        name: administrator.name,
        email: administrator.email,
        role: 'ADMIN',
      })

    const response = await request(app)
      .patch(`/api/admin/users/${administrator.id}/status`)
      .send({ status: 'SUSPENDED' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'The sole administrator account is protected.',
    })
    expect(setAuthUserSuspendedMock).not.toHaveBeenCalled()
    expect(userUpdateMock).not.toHaveBeenCalled()
  })

  it('should require suspension before permanent deletion', async () => {
    userFindUniqueMock
      .mockResolvedValueOnce(administrator)
      .mockResolvedValueOnce(player)

    const response = await request(app)
      .delete(`/api/admin/users/${playerId}`)
      .send({ confirmation: player.email })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'Suspend this account before permanently deleting it.',
    })
    expect(deleteAuthUserMock).not.toHaveBeenCalled()
    expect(userDeleteMock).not.toHaveBeenCalled()
  })

  it('should permanently delete a suspended login and its player records', async () => {
    const suspendedPlayer = { ...player, status: 'SUSPENDED' }
    userFindUniqueMock
      .mockResolvedValueOnce(administrator)
      .mockResolvedValueOnce(suspendedPlayer)
    adminAuditLogCreateMock.mockResolvedValueOnce({})

    const response = await request(app)
      .delete(`/api/admin/users/${playerId}`)
      .send({ confirmation: ' PLAYER@EXAMPLE.COM ' })

    expect(response.status).toBe(204)
    expect(deleteAuthUserMock).toHaveBeenCalledWith(authUserId)
    expect(scorecardReviewDeleteManyMock).toHaveBeenCalledWith({
      where: { round: { userId: playerId } },
    })
    expect(submissionMessageDeleteManyMock).toHaveBeenCalledWith({
      where: { senderUserId: playerId },
    })
    expect(submissionDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: playerId },
    })
    expect(roundDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: playerId },
    })
    expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: playerId } })
    expect(adminAuditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_DELETED',
        targetId: playerId,
        after: { deleted: true },
      }),
    })
  })
})

describe('administrator round management', () => {
  const administrator = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'jackhumphreys.dev@gmail.com',
    role: 'ADMIN',
  }
  const userId = '22222222-2222-4222-8222-222222222222'
  const roundId = '33333333-3333-4333-8333-333333333333'
  const round = {
    id: roundId,
    userId,
    datePlayed: new Date('2026-09-01T00:00:00.000Z'),
    pccAdjustment: '0.0',
    scoreDifferential: '12.3',
    tee: { courseRating: '71.2' },
  }

  it('returns paginated rounds for the selected player', async () => {
    userFindUniqueMock
      .mockResolvedValueOnce(administrator)
      .mockResolvedValueOnce({ id: userId, name: 'Player', handicapIndex: '12.3' })
    roundCountMock.mockResolvedValueOnce(1)
    roundFindManyMock.mockResolvedValueOnce([round])

    const response = await request(app).get(
      `/api/admin/users/${userId}/rounds?page=1&pageSize=10`,
    )

    expect(response.status).toBe(200)
    expect(response.body.player).toEqual({
      id: userId,
      name: 'Player',
      handicapIndex: 12.3,
    })
    expect(response.body.rounds[0]).toMatchObject({
      id: roundId,
      datePlayed: '2026-09-01T00:00:00.000Z',
      pccAdjustment: 0,
      scoreDifferential: 12.3,
      tee: { courseRating: 71.2 },
    })
  })

  it('updates a round through the audited domain service', async () => {
    userFindUniqueMock.mockResolvedValueOnce(administrator)
    updateRoundAsAdminMock.mockResolvedValueOnce({ handicapIndex: 11.8 })
    roundFindUniqueMock.mockResolvedValueOnce(round)
    const body = { datePlayed: '2026-09-02', grossScore: 84 }

    const response = await request(app)
      .patch(`/api/admin/rounds/${roundId}`)
      .send(body)

    expect(response.status).toBe(200)
    expect(response.body.handicapIndex).toBe(11.8)
    expect(updateRoundAsAdminMock).toHaveBeenCalledWith({
      roundId,
      administratorId: administrator.id,
      body,
    })
  })

  it('requires typed confirmation before deleting a round', async () => {
    userFindUniqueMock.mockResolvedValueOnce(administrator)
    const { AdminRoundError } = await import('../src/adminRounds.js')
    deleteRoundAsAdminMock.mockRejectedValueOnce(
      new AdminRoundError('validation', 'Type DELETE to confirm permanent round deletion.'),
    )

    const response = await request(app)
      .delete(`/api/admin/rounds/${roundId}`)
      .send({ confirmation: 'delete' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Type DELETE to confirm permanent round deletion.',
    })
  })
})

describe('player submissions', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const submissionId = '22222222-2222-4222-8222-222222222222'
  const submissionSelect = {
    id: true,
    type: true,
    status: true,
    subject: true,
    message: true,
    clubName: true,
    townCounty: true,
    websiteUrl: true,
    courseName: true,
    teeDetails: true,
    round: {
      select: {
        id: true,
        datePlayed: true,
        category: true,
        participation: true,
        grossScore: true,
        tee: {
          select: {
            teeName: true,
            course: {
              select: {
                name: true,
                club: { select: { name: true } },
              },
            },
          },
        },
      },
    },
    createdAt: true,
    updatedAt: true,
    playerHasUnread: true,
  }

  it('should create a submission for the authenticated profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    submissionCreateMock.mockResolvedValueOnce({
      id: submissionId,
      type: 'ISSUE',
      status: 'NEW',
      subject: 'Round history is unclear',
      message: 'The counting badge is difficult to understand.',
      clubName: null,
      townCounty: null,
      websiteUrl: null,
      courseName: null,
      teeDetails: null,
      round: null,
      playerHasUnread: false,
      createdAt: new Date('2026-08-31T20:00:00.000Z'),
      updatedAt: new Date('2026-08-31T20:00:00.000Z'),
    })

    const response = await request(app).post('/api/submissions').send({
      type: 'ISSUE',
      subject: '  Round history is unclear  ',
      message: '  The counting badge is difficult to understand.  ',
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: submissionId,
      type: 'ISSUE',
      status: 'NEW',
      subject: 'Round history is unclear',
      message: 'The counting badge is difficult to understand.',
      clubName: null,
      townCounty: null,
      websiteUrl: null,
      courseName: null,
      teeDetails: null,
      round: null,
      hasUnread: false,
      createdAt: '2026-08-31T20:00:00.000Z',
      updatedAt: '2026-08-31T20:00:00.000Z',
    })
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      select: { id: true },
    })
    expect(submissionCountMock).toHaveBeenCalledWith({
      where: {
        userId,
        type: { not: 'SCORECARD_REVIEW' },
        createdAt: { gte: expect.any(Date) },
      },
    })
    expect(submissionCreateMock).toHaveBeenCalledWith({
      data: {
        userId,
        adminHasUnread: true,
        type: 'ISSUE',
        roundId: null,
        subject: 'Round history is unclear',
        message: 'The counting badge is difficult to understand.',
        clubName: null,
        townCounty: null,
        websiteUrl: null,
        courseName: null,
        teeDetails: null,
      },
      select: submissionSelect,
    })
  })

  it('should rate limit repeated support requests from one profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    submissionCountMock.mockResolvedValueOnce(5)

    const response = await request(app).post('/api/submissions').send({
      type: 'ISSUE',
      subject: 'Another support problem',
      message: 'This is another valid request within the same hour.',
    })

    expect(response.status).toBe(429)
    expect(response.headers['retry-after']).toBe('3600')
    expect(response.body).toEqual({
      error:
        'You have sent 5 support requests within the last hour. Please wait before sending another.',
      retryAfterSeconds: 3600,
    })
    expect(submissionCreateMock).not.toHaveBeenCalled()
  })

  it('should return a validation message without writing invalid data', async () => {
    const response = await request(app).post('/api/submissions').send({
      type: 'ISSUE',
      subject: 'Bug',
      message: 'This message is long enough.',
    })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Subject must be between 5 and 120 characters',
    })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
    expect(submissionCreateMock).not.toHaveBeenCalled()
  })

  it('should securely link a correction to a round owned by the profile', async () => {
    const roundId = '33333333-3333-4333-8333-333333333333'
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    roundFindFirstMock.mockResolvedValueOnce({ id: roundId })
    submissionCreateMock.mockResolvedValueOnce({
      id: submissionId,
      type: 'DATA_CORRECTION',
      status: 'NEW',
      subject: 'Incorrect round score',
      message: 'The total for this round needs to be corrected.',
      clubName: null,
      townCounty: null,
      websiteUrl: null,
      courseName: null,
      teeDetails: null,
      round: null,
      playerHasUnread: false,
      createdAt: new Date('2026-09-07T20:00:00.000Z'),
      updatedAt: new Date('2026-09-07T20:00:00.000Z'),
    })

    const response = await request(app).post('/api/submissions').send({
      type: 'DATA_CORRECTION',
      subject: 'Incorrect round score',
      message: 'The total for this round needs to be corrected.',
      roundId,
    })

    expect(response.status).toBe(201)
    expect(roundFindFirstMock).toHaveBeenCalledWith({
      where: { id: roundId, userId },
      select: { id: true },
    })
    expect(submissionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId, roundId }),
      }),
    )
  })

  it('should not link another profile’s round', async () => {
    const roundId = '33333333-3333-4333-8333-333333333333'
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    roundFindFirstMock.mockResolvedValueOnce(null)

    const response = await request(app).post('/api/submissions').send({
      type: 'DATA_CORRECTION',
      subject: 'Incorrect round score',
      message: 'The total for this round needs to be corrected.',
      roundId,
    })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Round not found for this profile' })
    expect(submissionCreateMock).not.toHaveBeenCalled()
  })

  it('should return only the authenticated profile’s round options', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    roundFindManyMock.mockResolvedValueOnce([])

    const response = await request(app).get('/api/submissions/round-options')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ rounds: [] })
    expect(roundFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    )
  })

  it('should return only the authenticated profile submissions', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    submissionCountMock.mockResolvedValueOnce(1)
    submissionFindManyMock.mockResolvedValueOnce([
      {
        id: submissionId,
        type: 'IDEA',
        status: 'IN_PROGRESS',
        subject: 'Season review',
        message: 'A yearly performance summary would be useful.',
        clubName: null,
        townCounty: null,
        websiteUrl: null,
        courseName: null,
        teeDetails: null,
        round: null,
        playerHasUnread: true,
        createdAt: new Date('2026-08-31T19:00:00.000Z'),
        updatedAt: new Date('2026-08-31T20:00:00.000Z'),
      },
    ])

    const response = await request(app).get(
      '/api/submissions?page=1&pageSize=20',
    )

    expect(response.status).toBe(200)
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(response.body.submissions).toHaveLength(1)
    expect(response.body.submissions[0].hasUnread).toBe(true)
    expect(submissionCountMock).toHaveBeenCalledWith({ where: { userId } })
    expect(submissionFindManyMock).toHaveBeenCalledWith({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
      select: submissionSelect,
    })
  })
})

describe('GET /api/admin/submissions', () => {
  const adminProfile = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Site Administrator',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  it('should exclude closed requests from the default active queue', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    submissionCountMock.mockResolvedValueOnce(0)
    submissionFindManyMock.mockResolvedValueOnce([])

    const response = await request(app).get(
      '/api/admin/submissions?page=1&pageSize=10',
    )

    expect(response.status).toBe(200)
    const where = { status: { not: 'CLOSED' } }
    expect(submissionCountMock).toHaveBeenCalledWith({ where })
    expect(submissionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    )
  })

  it('should return the searchable closed archive when requested', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    submissionCountMock.mockResolvedValueOnce(0)
    submissionFindManyMock.mockResolvedValueOnce([])

    const response = await request(app).get(
      '/api/admin/submissions?status=CLOSED&search=player&page=1&pageSize=10',
    )

    expect(response.status).toBe(200)
    expect(submissionCountMock).toHaveBeenCalledWith({
      where: {
        status: 'CLOSED',
        OR: [
          { subject: { contains: 'player', mode: 'insensitive' } },
          { message: { contains: 'player', mode: 'insensitive' } },
          { clubName: { contains: 'player', mode: 'insensitive' } },
          { courseName: { contains: 'player', mode: 'insensitive' } },
          { user: { name: { contains: 'player', mode: 'insensitive' } } },
          { user: { email: { contains: 'player', mode: 'insensitive' } } },
        ],
      },
    })
  })

  it('should return a filtered paginated review queue', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    submissionCountMock.mockResolvedValueOnce(1)
    submissionFindManyMock.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'ISSUE',
        status: 'NEW',
        subject: 'Login problem',
        message: 'The login screen returned an unexpected message.',
        clubName: null,
        townCounty: null,
        websiteUrl: null,
        courseName: null,
        teeDetails: null,
        round: null,
        adminHasUnread: true,
        createdAt: new Date('2026-08-31T20:00:00.000Z'),
        updatedAt: new Date('2026-08-31T20:00:00.000Z'),
        user: {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Example Player',
          email: 'player@example.com',
        },
      },
    ])

    const response = await request(app).get(
      '/api/admin/submissions?status=NEW&type=ISSUE&search=login&page=1&pageSize=10',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      submissions: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          type: 'ISSUE',
          status: 'NEW',
          subject: 'Login problem',
          message: 'The login screen returned an unexpected message.',
          clubName: null,
          townCounty: null,
          websiteUrl: null,
          courseName: null,
          teeDetails: null,
          round: null,
          hasUnread: true,
          createdAt: '2026-08-31T20:00:00.000Z',
          updatedAt: '2026-08-31T20:00:00.000Z',
          user: {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Example Player',
            email: 'player@example.com',
          },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })

    const where = {
      status: 'NEW',
      type: 'ISSUE',
      OR: [
        { subject: { contains: 'login', mode: 'insensitive' } },
        { message: { contains: 'login', mode: 'insensitive' } },
        { clubName: { contains: 'login', mode: 'insensitive' } },
        { courseName: { contains: 'login', mode: 'insensitive' } },
        { user: { name: { contains: 'login', mode: 'insensitive' } } },
        { user: { email: { contains: 'login', mode: 'insensitive' } } },
      ],
    }
    expect(submissionCountMock).toHaveBeenCalledWith({ where })
    expect(submissionFindManyMock).toHaveBeenCalledWith({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        subject: true,
        message: true,
        clubName: true,
        townCounty: true,
        websiteUrl: true,
        courseName: true,
        teeDetails: true,
        round: {
          select: {
            id: true,
            datePlayed: true,
            category: true,
            participation: true,
            grossScore: true,
            tee: {
              select: {
                teeName: true,
                course: {
                  select: {
                    name: true,
                    club: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
        adminHasUnread: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  })

  it('should reject an invalid status before querying the queue', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)

    const response = await request(app).get(
      '/api/admin/submissions?status=PENDING',
    )

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid submission filters' })
    expect(submissionCountMock).not.toHaveBeenCalled()
  })

  it('should return the administrator unread request count', async () => {
    userFindUniqueMock.mockResolvedValueOnce(adminProfile)
    submissionCountMock.mockResolvedValueOnce(4)

    const response = await request(app).get(
      '/api/admin/submissions/unread-count',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ count: 4 })
    expect(submissionCountMock).toHaveBeenCalledWith({
      where: { adminHasUnread: true },
    })
  })
})

describe('GET /api/admin/scorecard-reviews', () => {
  it('returns the pending manual scorecard queue to the administrator', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Jack Humphreys',
      email: 'jackhumphreys.dev@gmail.com',
      role: 'ADMIN',
    })

    const response = await request(app).get('/api/admin/scorecard-reviews')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ reviews: [] })
    expect(scorecardReviewFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          reviewedAt: null,
          submission: { status: { in: ['NEW', 'IN_PROGRESS'] } },
        },
      }),
    )
  })
})

describe('submission conversations', () => {
  const submissionId = '22222222-2222-4222-8222-222222222222'
  const playerId = '11111111-1111-4111-8111-111111111111'
  const adminId = '33333333-3333-4333-8333-333333333333'
  const messageId = '44444444-4444-4444-8444-444444444444'
  const messageSelect = {
    id: true,
    body: true,
    createdAt: true,
    sender: {
      select: {
        id: true,
        name: true,
        role: true,
      },
    },
  }

  it('should return replies only for a submission owned by the player', async () => {
    submissionFindFirstMock.mockResolvedValueOnce({ id: submissionId })
    submissionMessageFindManyMock.mockResolvedValueOnce([
      {
        id: messageId,
        body: 'Please confirm which browser you were using.',
        createdAt: new Date('2026-08-31T21:00:00.000Z'),
        sender: {
          id: adminId,
          name: 'Site Administrator',
          role: 'ADMIN',
        },
      },
    ])

    const response = await request(app).get(
      `/api/submissions/${submissionId}/messages`,
    )

    expect(response.status).toBe(200)
    expect(response.body.messages).toEqual([
      {
        id: messageId,
        body: 'Please confirm which browser you were using.',
        createdAt: '2026-08-31T21:00:00.000Z',
        sender: {
          id: adminId,
          name: 'Site Administrator',
          role: 'ADMIN',
        },
      },
    ])
    expect(submissionFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: submissionId,
        user: {
          authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
      },
      select: { id: true },
    })
    expect(submissionMessageFindManyMock).toHaveBeenCalledWith({
      where: { submissionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: messageSelect,
    })
    expect(submissionUpdateMock).toHaveBeenCalledWith({
      where: { id: submissionId },
      data: { playerHasUnread: false },
      select: { id: true },
    })
  })

  it('should return the player unread conversation count', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: playerId })
    submissionCountMock.mockResolvedValueOnce(2)

    const response = await request(app).get('/api/submissions/unread-count')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ count: 2 })
    expect(submissionCountMock).toHaveBeenCalledWith({
      where: { userId: playerId, playerHasUnread: true },
    })
  })

  it('should let a player reply to their open submission', async () => {
    submissionFindFirstMock.mockResolvedValueOnce({
      id: submissionId,
      userId: playerId,
      status: 'IN_PROGRESS',
    })
    submissionMessageCreateMock.mockResolvedValueOnce({
      id: messageId,
      body: 'I was using the latest version of Firefox.',
      createdAt: new Date('2026-08-31T21:05:00.000Z'),
      sender: {
        id: playerId,
        name: 'Example Player',
        role: 'PLAYER',
      },
    })

    const response = await request(app)
      .post(`/api/submissions/${submissionId}/messages`)
      .send({ message: '  I was using the latest version of Firefox.  ' })

    expect(response.status).toBe(201)
    expect(response.body.body).toBe(
      'I was using the latest version of Firefox.',
    )
    expect(submissionFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: submissionId,
        user: {
          authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
      },
      select: { id: true, userId: true, status: true },
    })
    expect(submissionMessageCountMock).toHaveBeenCalledWith({
      where: {
        senderUserId: playerId,
        createdAt: { gte: expect.any(Date) },
      },
    })
    expect(submissionMessageCreateMock).toHaveBeenCalledWith({
      data: {
        submissionId,
        senderUserId: playerId,
        body: 'I was using the latest version of Firefox.',
      },
      select: messageSelect,
    })
    expect(submissionUpdateMock).toHaveBeenCalledWith({
      where: { id: submissionId },
      data: { playerHasUnread: false, adminHasUnread: true },
      select: { id: true },
    })
  })

  it('should rate limit repeated player replies', async () => {
    submissionFindFirstMock.mockResolvedValueOnce({
      id: submissionId,
      userId: playerId,
      status: 'IN_PROGRESS',
    })
    submissionMessageCountMock.mockResolvedValueOnce(20)

    const response = await request(app)
      .post(`/api/submissions/${submissionId}/messages`)
      .send({ message: 'One more piece of information for this request.' })

    expect(response.status).toBe(429)
    expect(response.headers['retry-after']).toBe('3600')
    expect(response.body).toEqual({
      error:
        'You have sent 20 support replies within the last hour. Please wait before sending another.',
      retryAfterSeconds: 3600,
    })
    expect(submissionMessageCreateMock).not.toHaveBeenCalled()
    expect(submissionUpdateMock).not.toHaveBeenCalled()
  })

  it('should not reveal another player submission conversation', async () => {
    submissionFindFirstMock.mockResolvedValueOnce(null)

    const response = await request(app).get(
      `/api/submissions/${submissionId}/messages`,
    )

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Submission not found' })
    expect(submissionMessageFindManyMock).not.toHaveBeenCalled()
  })

  it('should prevent replies to a closed submission', async () => {
    submissionFindFirstMock.mockResolvedValueOnce({
      id: submissionId,
      userId: playerId,
      status: 'CLOSED',
    })

    const response = await request(app)
      .post(`/api/submissions/${submissionId}/messages`)
      .send({ message: 'I need to add one more detail.' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'Closed submissions cannot receive replies',
    })
    expect(submissionMessageCreateMock).not.toHaveBeenCalled()
  })

  it('should mark a conversation read when the administrator opens it', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: adminId,
      name: 'Site Administrator',
      email: 'admin@example.com',
      role: 'ADMIN',
    })
    submissionFindUniqueMock.mockResolvedValueOnce({ id: submissionId })
    submissionMessageFindManyMock.mockResolvedValueOnce([])

    const response = await request(app).get(
      `/api/admin/submissions/${submissionId}/messages`,
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ messages: [] })
    expect(submissionUpdateMock).toHaveBeenCalledWith({
      where: { id: submissionId },
      data: { adminHasUnread: false },
      select: { id: true },
    })
  })

  it('should let the administrator reply to an open submission', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: adminId,
      name: 'Site Administrator',
      email: 'admin@example.com',
      role: 'ADMIN',
    })
    submissionFindUniqueMock.mockResolvedValueOnce({
      id: submissionId,
      status: 'NEW',
    })
    submissionMessageCreateMock.mockResolvedValueOnce({
      id: messageId,
      body: 'Could you provide the club website?',
      createdAt: new Date('2026-08-31T21:10:00.000Z'),
      sender: {
        id: adminId,
        name: 'Site Administrator',
        role: 'ADMIN',
      },
    })

    const response = await request(app)
      .post(`/api/admin/submissions/${submissionId}/messages`)
      .send({ message: 'Could you provide the club website?' })

    expect(response.status).toBe(201)
    expect(submissionMessageCreateMock).toHaveBeenCalledWith({
      data: {
        submissionId,
        senderUserId: adminId,
        body: 'Could you provide the club website?',
      },
      select: messageSelect,
    })
    expect(adminAuditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorUserId: adminId,
        action: 'SUBMISSION_MESSAGE_CREATED',
        targetType: 'Submission',
        targetId: submissionId,
        after: { senderRole: 'ADMIN' },
      },
    })
    expect(submissionUpdateMock).toHaveBeenCalledWith({
      where: { id: submissionId },
      data: { adminHasUnread: false, playerHasUnread: true },
      select: { id: true },
    })
  })

  it('should update a status and audit the administrator mutation', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: adminId,
      name: 'Site Administrator',
      email: 'admin@example.com',
      role: 'ADMIN',
    })
    submissionFindUniqueMock.mockResolvedValueOnce({
      id: submissionId,
      status: 'IN_PROGRESS',
    })
    submissionUpdateMock.mockResolvedValueOnce({
      id: submissionId,
      status: 'RESOLVED',
      updatedAt: new Date('2026-08-31T21:15:00.000Z'),
    })
    adminAuditLogCreateMock.mockResolvedValueOnce({ id: 'audit-id' })

    const response = await request(app)
      .patch(`/api/admin/submissions/${submissionId}/status`)
      .send({ status: 'RESOLVED' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: submissionId,
      status: 'RESOLVED',
      updatedAt: '2026-08-31T21:15:00.000Z',
    })
    expect(submissionUpdateMock).toHaveBeenCalledWith({
      where: { id: submissionId },
      data: { status: 'RESOLVED' },
      select: { id: true, status: true, updatedAt: true },
    })
    expect(adminAuditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorUserId: adminId,
        action: 'SUBMISSION_STATUS_UPDATED',
        targetType: 'Submission',
        targetId: submissionId,
        before: { status: 'IN_PROGRESS' },
        after: { status: 'RESOLVED' },
      },
    })
  })

  it('should reject a player attempting to update a submission status', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: playerId,
      name: 'Example Player',
      email: 'player@example.com',
      role: 'PLAYER',
    })

    const response = await request(app)
      .patch(`/api/admin/submissions/${submissionId}/status`)
      .send({ status: 'RESOLVED' })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Administrator access required' })
    expect(submissionFindUniqueMock).not.toHaveBeenCalled()
    expect(submissionUpdateMock).not.toHaveBeenCalled()
    expect(adminAuditLogCreateMock).not.toHaveBeenCalled()
  })

  it('should not audit an unchanged submission status', async () => {
    const updatedAt = new Date('2026-08-31T21:15:00.000Z')
    userFindUniqueMock.mockResolvedValueOnce({
      id: adminId,
      name: 'Site Administrator',
      email: 'admin@example.com',
      role: 'ADMIN',
    })
    submissionFindUniqueMock.mockResolvedValueOnce({
      id: submissionId,
      status: 'RESOLVED',
      updatedAt,
    })

    const response = await request(app)
      .patch(`/api/admin/submissions/${submissionId}/status`)
      .send({ status: 'RESOLVED' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: submissionId,
      status: 'RESOLVED',
      updatedAt: updatedAt.toISOString(),
    })
    expect(submissionUpdateMock).not.toHaveBeenCalled()
    expect(adminAuditLogCreateMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/users/me/personal-milestones', () => {
  it('derives lifetime totals from the authenticated player record', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      rounds: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          datePlayed: new Date('2026-09-09T00:00:00.000Z'),
          createdAt: new Date('2026-09-09T12:00:00.000Z'),
          category: 'CASUAL',
          participation: 'INDIVIDUAL',
          grossScore: 4,
          scoreDifferential: '12.4',
          isAcceptable: true,
          scorecardStatus: 'VERIFIED',
          holeScores: [
            { holeNumber: 1, par: 4, strokesTaken: 4 },
          ],
          tee: {
            holes: [{ holeNumber: 1, yardage: 410 }],
          },
        },
      ],
    })

    const response = await request(app).get(
      '/api/users/me/personal-milestones',
    )

    expect(response.status).toBe(200)
    expect(response.body.totals).toEqual({
      holesPlayed: 1,
      totalShots: 4,
      yardsCovered: 410,
      eagles: 0,
      birdies: 0,
      pars: 1,
      bogeys: 0,
    })
    expect(response.body.personalBests.lowestDifferential.value).toBe(12.4)
    expect(userFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      }),
    )
  })

  it('returns 404 when the authenticated account has no profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).get(
      '/api/users/me/personal-milestones',
    )

    expect(response.status).toBe(404)
  })
})

describe('player goals API', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const goalId = '22222222-2222-4222-8222-222222222222'
  const createdAt = new Date('2026-09-10T10:00:00.000Z')

  it('returns progress derived from the authenticated player record', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: userId,
      handicapIndex: '18.0',
      rounds: [],
    })
    playerGoalFindManyMock.mockResolvedValueOnce([
      {
        id: goalId,
        type: 'HANDICAP_INDEX',
        targetValue: '15.0',
        targetDate: new Date('2026-12-31T00:00:00.000Z'),
        createdAt,
        updatedAt: createdAt,
      },
    ])

    const response = await request(app).get('/api/users/me/goals')

    expect(response.status).toBe(200)
    expect(response.body.goals[0]).toMatchObject({
      id: goalId,
      type: 'HANDICAP_INDEX',
      currentValue: 18,
      targetValue: 15,
      progressPercent: 83,
      isComplete: false,
      targetDate: '2026-12-31',
    })
    expect(playerGoalFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    )
  })

  it('creates or replaces one player-owned goal per type', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    playerGoalUpsertMock.mockResolvedValueOnce({
      id: goalId,
      type: 'ROUNDS_PLAYED',
      targetValue: '25.0',
      targetDate: null,
      createdAt,
      updatedAt: createdAt,
    })

    const response = await request(app)
      .put('/api/users/me/goals/ROUNDS_PLAYED')
      .send({ targetValue: 25 })

    expect(response.status).toBe(200)
    expect(response.body.targetValue).toBe(25)
    expect(playerGoalUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type: { userId, type: 'ROUNDS_PLAYED' } },
        create: expect.objectContaining({ userId, type: 'ROUNDS_PLAYED' }),
      }),
    )
  })

  it('rejects an invalid target before writing a goal', async () => {
    const response = await request(app)
      .put('/api/users/me/goals/BIRDIES')
      .send({ targetValue: 2.5 })

    expect(response.status).toBe(400)
    expect(playerGoalUpsertMock).not.toHaveBeenCalled()
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('removes only a goal owned by the authenticated player', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    playerGoalDeleteManyMock.mockResolvedValueOnce({ count: 1 })

    const response = await request(app).delete(
      '/api/users/me/goals/LOWEST_GROSS_SCORE',
    )

    expect(response.status).toBe(204)
    expect(playerGoalDeleteManyMock).toHaveBeenCalledWith({
      where: { userId, type: 'LOWEST_GROSS_SCORE' },
    })
  })
})

describe('player course preferences', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const courseId = '22222222-2222-4222-8222-222222222222'
  const teeId = '33333333-3333-4333-8333-333333333333'
  const preference = {
    id: '44444444-4444-4444-8444-444444444444',
    defaultTeeId: teeId,
    createdAt: new Date('2026-09-09T10:00:00.000Z'),
    updatedAt: new Date('2026-09-09T10:05:00.000Z'),
    course: {
      id: courseId,
      name: 'Old Course',
      holes: 18,
      par: 70,
      designedBy: null,
      yearOpened: null,
      club: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Example Golf Club',
        city: null,
        county: null,
      },
      tees: [
        {
          id: teeId,
          teeName: 'White',
          colour: 'white',
          gender: 'male',
          totalYardage: 6500,
          totalMetres: null,
          par: 70,
          courseRating: '71.2',
          slopeRating: 128,
        },
      ],
    },
  }

  it('returns only the authenticated player favourites', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    userCoursePreferenceFindManyMock.mockResolvedValueOnce([preference])

    const response = await request(app).get(
      '/api/users/me/course-preferences',
    )

    expect(response.status).toBe(200)
    expect(response.body.favourites[0].course.tees[0].courseRating).toBe(71.2)
    expect(userCoursePreferenceFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    )
  })

  it('adds a shared course to the authenticated player favourites', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    courseFindUniqueMock.mockResolvedValueOnce({ id: courseId })
    userCoursePreferenceUpsertMock.mockResolvedValueOnce(preference)

    const response = await request(app)
      .post('/api/users/me/course-preferences')
      .send({ courseId })

    expect(response.status).toBe(200)
    expect(response.body.course.id).toBe(courseId)
    expect(userCoursePreferenceUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_courseId: { userId, courseId } },
        create: { userId, courseId },
      }),
    )
  })

  it('rejects a default tee that does not belong to the favourite course', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    userCoursePreferenceFindUniqueMock.mockResolvedValueOnce({
      id: preference.id,
    })
    teeFindFirstMock.mockResolvedValueOnce(null)

    const response = await request(app)
      .patch(`/api/users/me/course-preferences/${courseId}`)
      .send({ defaultTeeId: teeId })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'The default tee must belong to this course',
    })
    expect(userCoursePreferenceUpdateMock).not.toHaveBeenCalled()
  })
})

describe('friend connections API', () => {
  const currentUserId = '11111111-1111-4111-8111-111111111111'
  const otherUserId = '22222222-2222-4222-8222-222222222222'
  const friendshipId = '33333333-3333-4333-8333-333333333333'
  const otherPlayer = {
    id: otherUserId,
    name: 'Tiger Woods',
    handicapIndex: '1.4',
    friendRequestsEnabled: true,
    showHandicapToFriends: true,
    homeClub: { id: '44444444-4444-4444-8444-444444444444', name: 'Medinah' },
  }

  it('returns accepted and pending connections without private account data', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: currentUserId })
    friendshipFindManyMock.mockResolvedValueOnce([
      {
        id: friendshipId,
        status: 'ACCEPTED',
        createdAt: new Date('2026-09-10T09:00:00.000Z'),
        updatedAt: new Date('2026-09-10T10:00:00.000Z'),
        requester: {
          id: currentUserId,
          name: 'Jack',
          handicapIndex: null,
          friendRequestsEnabled: true,
          showHandicapToFriends: true,
          homeClub: null,
        },
        addressee: otherPlayer,
      },
    ])

    const response = await request(app).get('/api/users/me/friends')

    expect(response.status).toBe(200)
    expect(response.body.friends).toHaveLength(1)
    expect(response.body.friends[0].player).toEqual({
      id: otherPlayer.id,
      name: otherPlayer.name,
      acceptsFriendRequests: true,
      handicapIndex: 1.4,
      handicapVisible: true,
      homeClub: otherPlayer.homeClub,
    })
    expect(response.body.friends[0].player).not.toHaveProperty('email')
    expect(response.body.incoming).toEqual([])
    expect(response.body.outgoing).toEqual([])
  })

  it('searches active linked profiles by each supplied name term', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: currentUserId })
    userFindManyMock.mockResolvedValueOnce([otherPlayer])
    friendshipFindManyMock.mockResolvedValueOnce([])

    const response = await request(app).get(
      '/api/users/me/friends/search?q=Tiger%20Woods',
    )

    expect(response.status).toBe(200)
    expect(response.body.players[0]).toEqual({
      id: otherPlayer.id,
      name: otherPlayer.name,
      acceptsFriendRequests: true,
      handicapIndex: 1.4,
      handicapVisible: true,
      homeClub: otherPlayer.homeClub,
      relationship: null,
    })
    expect(userFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: currentUserId },
          authUserId: { not: null },
          status: 'ACTIVE',
          AND: [
            { name: { contains: 'Tiger', mode: 'insensitive' } },
            { name: { contains: 'Woods', mode: 'insensitive' } },
          ],
        }),
        take: 20,
      }),
    )
  })

  it('does not expose a handicap when the player has hidden it', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: currentUserId })
    userFindManyMock.mockResolvedValueOnce([
      {
        ...otherPlayer,
        friendRequestsEnabled: false,
        showHandicapToFriends: false,
      },
    ])
    friendshipFindManyMock.mockResolvedValueOnce([])

    const response = await request(app).get(
      '/api/users/me/friends/search?q=Tiger',
    )

    expect(response.status).toBe(200)
    expect(response.body.players[0]).toEqual({
      id: otherPlayer.id,
      name: otherPlayer.name,
      acceptsFriendRequests: false,
      handicapIndex: null,
      handicapVisible: false,
      homeClub: otherPlayer.homeClub,
      relationship: null,
    })
  })

  it('creates one direction-independent friend request', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: currentUserId })
    userFindFirstMock.mockResolvedValueOnce(otherPlayer)
    friendshipFindUniqueMock.mockResolvedValueOnce(null)
    friendshipCreateMock.mockResolvedValueOnce({
      id: friendshipId,
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
      updatedAt: new Date('2026-09-10T10:00:00.000Z'),
    })

    const response = await request(app)
      .post('/api/users/me/friend-requests')
      .send({ playerId: otherUserId })

    expect(response.status).toBe(201)
    expect(friendshipCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          pairKey: `${currentUserId}:${otherUserId}`,
          requesterId: currentUserId,
          addresseeId: otherUserId,
        },
      }),
    )
  })

  it('prevents a player from sending a request to themselves', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: currentUserId })

    const response = await request(app)
      .post('/api/users/me/friend-requests')
      .send({ playerId: currentUserId })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'You cannot add yourself as a friend',
    })
    expect(friendshipCreateMock).not.toHaveBeenCalled()
  })

  it('only lets the receiving player accept a pending request', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: currentUserId })
    friendshipFindFirstMock.mockResolvedValueOnce({ id: friendshipId })
    friendshipUpdateMock.mockResolvedValueOnce({})

    const response = await request(app)
      .patch(`/api/users/me/friend-requests/${friendshipId}`)
      .send({ action: 'accept' })

    expect(response.status).toBe(200)
    expect(friendshipFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: friendshipId,
        addresseeId: currentUserId,
        status: 'PENDING',
        requester: {
          authUserId: { not: null },
          status: 'ACTIVE',
        },
      },
      select: { id: true },
    })
    expect(friendshipUpdateMock).toHaveBeenCalledWith({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    })
  })
})

describe('GET /api/users/me', () => {
  const userId = '11111111-1111-4111-8111-111111111111'

  it('should return the profile with a numeric handicap index', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: userId,
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: '22222222-2222-4222-8222-222222222222',
      handicapIndex: '14.2',
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
      homeClub: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Example Golf Club',
      },
    })

    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: userId,
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: '22222222-2222-4222-8222-222222222222',
      handicapIndex: 14.2,
      createdAt: '2026-08-29T12:00:00.000Z',
      homeClub: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Example Golf Club',
      },
    })
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      select: {
        id: true,
        name: true,
        email: true,
        homeClubId: true,
        handicapIndex: true,
        createdAt: true,
        homeClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  })

  it('should return 404 when the user does not exist', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
  })
})

describe('account settings profile API', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const profile = {
    id: userId,
    name: 'Jack Humphreys',
    email: 'jack@example.com',
    homeClubId: null,
    handicapIndex: null,
    createdAt: new Date('2026-08-29T12:00:00.000Z'),
    homeClub: null,
  }

  it('updates only the authenticated profile with a normalized name', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    userUpdateMock.mockResolvedValueOnce({
      ...profile,
      name: "Jack O'Brien-Smith",
    })

    const response = await request(app)
      .patch('/api/users/me/settings/profile')
      .send({ name: "  Jack   O'Brien-Smith " })

    expect(response.status).toBe(200)
    expect(response.body.name).toBe("Jack O'Brien-Smith")
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: { name: "Jack O'Brien-Smith" },
      select: expect.objectContaining({ id: true, name: true, email: true }),
    })
  })

  it('rejects an invalid profile name before querying the database', async () => {
    const response = await request(app)
      .patch('/api/users/me/settings/profile')
      .send({ name: 'Jack 123' })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Use letters')
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('rejects an email already connected to another profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: userId,
      email: 'jack@example.com',
    })
    userFindFirstMock.mockResolvedValueOnce({ id: 'another-user' })

    const response = await request(app)
      .post('/api/users/me/settings/email-availability')
      .send({ email: ' Player@Example.com ' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'That email address is already connected to another profile',
    })
    expect(userFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: { not: userId },
        email: { equals: 'player@example.com', mode: 'insensitive' },
      },
      select: { id: true },
    })
  })

  it('synchronizes only the verified email from the authenticated identity', async () => {
    getAuthenticatedUserMock.mockResolvedValueOnce({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'New.Email@Example.com',
      emailConfirmed: true,
    })
    userFindUniqueMock.mockResolvedValueOnce(profile)
    userFindFirstMock.mockResolvedValueOnce(null)
    userUpdateMock.mockResolvedValueOnce({
      ...profile,
      email: 'new.email@example.com',
    })

    const response = await request(app)
      .post('/api/users/me/settings/sync-email')
      .send({ email: 'attacker@example.com' })

    expect(response.status).toBe(200)
    expect(response.body.email).toBe('new.email@example.com')
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: { email: 'new.email@example.com' },
      select: expect.objectContaining({ id: true, name: true, email: true }),
    })
  })

  it('does not synchronize an unconfirmed identity email', async () => {
    getAuthenticatedUserMock.mockResolvedValueOnce({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'new.email@example.com',
      emailConfirmed: false,
    })

    const response = await request(app).post(
      '/api/users/me/settings/sync-email',
    )

    expect(response.status).toBe(403)
    expect(userFindUniqueMock).not.toHaveBeenCalled()
    expect(userUpdateMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/users/me/handicap-progression', () => {
  it('returns a progression derived from the authenticated player rounds', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      rounds: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          datePlayed: new Date('2026-09-08T00:00:00.000Z'),
          createdAt: new Date('2026-09-08T12:00:00.000Z'),
          scoreDifferential: '12.4',
          isAcceptable: true,
          tee: {
            teeName: 'White',
            course: {
              name: 'Main Course',
              club: { name: 'Example Golf Club' },
            },
          },
        },
      ],
    })

    const response = await request(app).get(
      '/api/users/me/handicap-progression',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      {
        roundId: '33333333-3333-4333-8333-333333333333',
        datePlayed: '2026-09-08T00:00:00.000Z',
        clubName: 'Example Golf Club',
        courseName: 'Main Course',
        teeName: 'White',
        scoreDifferential: 12.4,
        handicapIndex: 12.4,
        countedAtTheTime: true,
      },
    ])
    expect(userFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      }),
    )
  })

  it('returns 404 when the authenticated account has no profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).get(
      '/api/users/me/handicap-progression',
    )

    expect(response.status).toBe(404)
  })
})

describe('GET /api/users/me/performance-summary', () => {
  it('should return a summary derived only from the authenticated profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      rounds: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          datePlayed: new Date('2026-09-09T00:00:00.000Z'),
          category: 'CASUAL',
          participation: 'INDIVIDUAL',
          scoreDifferential: '11.4',
          isAcceptable: true,
          usedInHandicapCalc: true,
          scorecardStatus: 'VERIFIED',
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          datePlayed: new Date('2026-09-08T00:00:00.000Z'),
          category: 'COMPETITION',
          participation: 'TEAM',
          scoreDifferential: null,
          isAcceptable: false,
          usedInHandicapCalc: false,
          scorecardStatus: 'NOT_REQUIRED',
        },
      ],
    })

    const response = await request(app).get(
      '/api/users/me/performance-summary',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      roundsLogged: 2,
      scoredRounds: 1,
      casualRounds: 1,
      individualCompetitionRounds: 0,
      teamCompetitionRounds: 1,
      countingRounds: 1,
      bestDifferential: 11.4,
      averageDifferential: 11.4,
      recentDifferentials: [
        {
          roundId: '33333333-3333-4333-8333-333333333333',
          datePlayed: '2026-09-09T00:00:00.000Z',
          scoreDifferential: 11.4,
          usedInHandicapCalc: true,
        },
      ],
    })
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      select: {
        rounds: {
          orderBy: [{ datePlayed: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            datePlayed: true,
            category: true,
            participation: true,
            scoreDifferential: true,
            isAcceptable: true,
            usedInHandicapCalc: true,
            scorecardStatus: true,
          },
        },
      },
    })
  })

  it('should return 404 when the profile does not exist', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).get(
      '/api/users/me/performance-summary',
    )

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
  })
})

describe('PATCH /api/users/me', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const homeClubId = '22222222-2222-4222-8222-222222222222'
  const profileSelect = {
    id: true,
    name: true,
    email: true,
    homeClubId: true,
    handicapIndex: true,
    createdAt: true,
    homeClub: {
      select: {
        id: true,
        name: true,
      },
    },
  }

  it('should update and return the selected home club', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    clubFindUniqueMock.mockResolvedValueOnce({ id: homeClubId })
    userUpdateMock.mockResolvedValueOnce({
      id: userId,
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId,
      handicapIndex: '14.2',
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
      homeClub: {
        id: homeClubId,
        name: 'Example Golf Club',
      },
    })

    const response = await request(app).patch('/api/users/me').send({
      homeClubId,
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: userId,
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId,
      handicapIndex: 14.2,
      createdAt: '2026-08-29T12:00:00.000Z',
      homeClub: {
        id: homeClubId,
        name: 'Example Golf Club',
      },
    })
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      select: { id: true },
    })
    expect(clubFindUniqueMock).toHaveBeenCalledWith({
      where: { id: homeClubId },
      select: { id: true },
    })
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: { homeClubId },
      select: profileSelect,
    })
  })

  it('should clear the current home club', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    userUpdateMock.mockResolvedValueOnce({
      id: userId,
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: null,
      handicapIndex: null,
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
      homeClub: null,
    })

    const response = await request(app).patch('/api/users/me').send({
      homeClubId: null,
    })

    expect(response.status).toBe(200)
    expect(response.body.homeClubId).toBeNull()
    expect(response.body.homeClub).toBeNull()
    expect(clubFindUniqueMock).not.toHaveBeenCalled()
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: { homeClubId: null },
      select: profileSelect,
    })
  })

  it('should reject an invalid home club ID', async () => {
    const response = await request(app).patch('/api/users/me').send({
      homeClubId: 'not-a-uuid',
    })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid home club ID' })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('should return 404 when the user does not exist', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).patch('/api/users/me').send({
      homeClubId,
    })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
    expect(clubFindUniqueMock).not.toHaveBeenCalled()
    expect(userUpdateMock).not.toHaveBeenCalled()
  })

  it('should return 404 when the home club does not exist', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    clubFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).patch('/api/users/me').send({
      homeClubId,
    })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Home club not found' })
    expect(userUpdateMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/users/me/rounds', () => {
  const userId = '11111111-1111-4111-8111-111111111111'

  it('should return newest-first round history with course context', async () => {
    const holeScores = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1,
      strokesTaken: 5,
    }))
    userFindUniqueMock.mockResolvedValueOnce({
      rounds: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          userId,
          teeId: '44444444-4444-4444-8444-444444444444',
          datePlayed: new Date('2026-08-30T00:00:00.000Z'),
          timePlayed: '08:15',
          category: 'COMPETITION',
          participation: 'INDIVIDUAL',
          competitionName: 'Captain’s Day',
          competitionFormat: 'Medal',
          numberOfPlayers: 84,
          notes: 'Great recovery on the back nine.',
          grossScore: 90,
          adjustedGrossScore: 88,
          isCapped: true,
          weatherCondition: 'WET',
          pccAdjustment: '1.0',
          scoreDifferential: '12.3',
          isAcceptable: true,
          usedInHandicapCalc: true,
          scorecardStatus: 'VERIFIED',
          createdAt: new Date('2026-08-30T12:00:00.000Z'),
          holeScores,
          tee: {
            id: '44444444-4444-4444-8444-444444444444',
            teeName: 'Championship',
            courseRating: '73.1',
            slopeRating: 137,
            par: 70,
            course: {
              id: '55555555-5555-4555-8555-555555555555',
              name: 'Old Course',
              club: {
                id: '66666666-6666-4666-8666-666666666666',
                name: 'Example Golf Club',
              },
            },
          },
        },
      ],
    })

    const response = await request(app).get('/api/users/me/rounds')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      {
        id: '33333333-3333-4333-8333-333333333333',
        userId,
        teeId: '44444444-4444-4444-8444-444444444444',
        datePlayed: '2026-08-30T00:00:00.000Z',
        timePlayed: '08:15',
        category: 'COMPETITION',
        participation: 'INDIVIDUAL',
        competitionName: 'Captain’s Day',
        competitionFormat: 'Medal',
          numberOfPlayers: 84,
          notes: 'Great recovery on the back nine.',
        grossScore: 90,
        adjustedGrossScore: 88,
        isCapped: true,
        weatherCondition: 'WET',
        pccAdjustment: 1,
        scoreDifferential: 12.3,
        isAcceptable: true,
        usedInHandicapCalc: true,
        scorecardStatus: 'VERIFIED',
        createdAt: '2026-08-30T12:00:00.000Z',
        holeScores,
        tee: {
          id: '44444444-4444-4444-8444-444444444444',
          teeName: 'Championship',
          courseRating: 73.1,
          slopeRating: 137,
          par: 70,
          course: {
            id: '55555555-5555-4555-8555-555555555555',
            name: 'Old Course',
            club: {
              id: '66666666-6666-4666-8666-666666666666',
              name: 'Example Golf Club',
            },
          },
        },
      },
    ])
    expect(userFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        select: expect.objectContaining({
          rounds: expect.objectContaining({
            orderBy: [{ datePlayed: 'desc' }, { createdAt: 'desc' }],
          }),
        }),
      }),
    )
  })

  it('should preserve null score fields for a record-only team competition', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      rounds: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          userId,
          teeId: '44444444-4444-4444-8444-444444444444',
          datePlayed: new Date('2026-09-01T00:00:00.000Z'),
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
          pccAdjustment: '0.0',
          scoreDifferential: null,
          isAcceptable: false,
          usedInHandicapCalc: false,
          scorecardStatus: 'NOT_REQUIRED',
          createdAt: new Date('2026-09-01T15:00:00.000Z'),
          holeScores: [],
          tee: {
            id: '44444444-4444-4444-8444-444444444444',
            teeName: 'White',
            courseRating: '72.0',
            slopeRating: 113,
            par: 72,
            course: {
              id: '55555555-5555-4555-8555-555555555555',
              name: 'Main Course',
              club: {
                id: '66666666-6666-4666-8666-666666666666',
                name: 'Example Golf Club',
              },
            },
          },
        },
      ],
    })

    const response = await request(app).get('/api/users/me/rounds')

    expect(response.status).toBe(200)
    expect(response.body[0]).toMatchObject({
      participation: 'TEAM',
      grossScore: null,
      adjustedGrossScore: null,
      weatherCondition: null,
      scoreDifferential: null,
      isAcceptable: false,
      usedInHandicapCalc: false,
      scorecardStatus: 'NOT_REQUIRED',
    })
  })

  it('should return an empty list when the user has no rounds', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ rounds: [] })

    const response = await request(app).get('/api/users/me/rounds')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('should return 404 when the user does not exist', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).get('/api/users/me/rounds')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
  })

})

describe('PATCH /api/users/me/rounds/:roundId/notes', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const roundId = '33333333-3333-4333-8333-333333333333'

  it('updates a note only through the authenticated round owner', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    roundUpdateManyMock.mockResolvedValueOnce({ count: 1 })

    const response = await request(app)
      .patch(`/api/users/me/rounds/${roundId}/notes`)
      .send({ notes: '  Great recovery on the back nine.  ' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      roundId,
      notes: 'Great recovery on the back nine.',
    })
    expect(roundUpdateManyMock).toHaveBeenCalledWith({
      where: { id: roundId, userId },
      data: { notes: 'Great recovery on the back nine.' },
    })
  })

  it('clears a blank note', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    roundUpdateManyMock.mockResolvedValueOnce({ count: 1 })

    const response = await request(app)
      .patch(`/api/users/me/rounds/${roundId}/notes`)
      .send({ notes: '   ' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ roundId, notes: null })
    expect(roundUpdateManyMock).toHaveBeenCalledWith({
      where: { id: roundId, userId },
      data: { notes: null },
    })
  })

  it('rejects invalid notes before accessing a round', async () => {
    const response = await request(app)
      .patch(`/api/users/me/rounds/${roundId}/notes`)
      .send({ notes: 'x'.repeat(2001) })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Round notes must be 2,000 characters or fewer',
    })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
    expect(roundUpdateManyMock).not.toHaveBeenCalled()
  })

  it('requires an explicit note value', async () => {
    const response = await request(app)
      .patch(`/api/users/me/rounds/${roundId}/notes`)
      .send({})

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Round notes are required' })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
    expect(roundUpdateManyMock).not.toHaveBeenCalled()
  })

  it('does not reveal or update another player’s round', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: userId })
    roundUpdateManyMock.mockResolvedValueOnce({ count: 0 })

    const response = await request(app)
      .patch(`/api/users/me/rounds/${roundId}/notes`)
      .send({ notes: 'Private note' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Round not found' })
    expect(roundUpdateManyMock).toHaveBeenCalledWith({
      where: { id: roundId, userId },
      data: { notes: 'Private note' },
    })
  })
})

describe('GET /api/catalogue/clubs', () => {
  it('should return paginated partial-name club matches', async () => {
    clubCountMock.mockResolvedValueOnce(1)
    clubFindManyMock.mockResolvedValueOnce([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Sickleholme Golf Club',
        city: 'Hope Valley',
        county: 'Derbyshire',
        postcode: 'S33 0BN',
        countryCode: 'ENG',
        _count: { courses: 1 },
      },
    ])

    const response = await request(app).get(
      '/api/catalogue/clubs?search=sickle&page=1&pageSize=10',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      clubs: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Sickleholme Golf Club',
          city: 'Hope Valley',
          county: 'Derbyshire',
          postcode: 'S33 0BN',
          countryCode: 'ENG',
          courseCount: 1,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    const where = {
      AND: [
        {
          name: {
            contains: 'sickle',
            mode: 'insensitive',
          },
        },
      ],
    }
    expect(clubCountMock).toHaveBeenCalledWith({ where })
    expect(clubFindManyMock).toHaveBeenCalledWith({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: 0,
      take: 10,
      select: {
        id: true,
        name: true,
        city: true,
        county: true,
        postcode: true,
        countryCode: true,
        _count: { select: { courses: true } },
      },
    })
  })

  it('should require a club search term', async () => {
    const response = await request(app).get('/api/catalogue/clubs')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Club search query is required' })
    expect(clubFindManyMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/catalogue/courses', () => {
  it('should filter by club and course names with paginated tee details', async () => {
    courseCountMock.mockResolvedValueOnce(1)
    courseFindManyMock.mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Old Course',
        holes: 18,
        par: 70,
        designedBy: 'Example Designer',
        yearOpened: '1901',
        club: {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Example Golf Club',
          city: 'Example City',
          county: 'Example County',
        },
        tees: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            teeName: 'Championship',
            colour: 'white',
            gender: 'male',
            totalYardage: 6627,
            totalMetres: 6060,
            par: 70,
            courseRating: '73.1',
            slopeRating: 137,
          },
        ],
      },
    ])

    const response = await request(app).get(
      '/api/catalogue/courses?club=Example&course=Old&page=1&pageSize=10',
    )

    expect(response.status).toBe(200)
    expect(response.body.courses[0]).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Old Course',
      holes: 18,
      par: 70,
      designedBy: 'Example Designer',
      yearOpened: '1901',
      club: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Example Golf Club',
        city: 'Example City',
        county: 'Example County',
      },
      tees: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          teeName: 'Championship',
          colour: 'white',
          gender: 'male',
          totalYardage: 6627,
          totalMetres: 6060,
          par: 70,
          courseRating: 73.1,
          slopeRating: 137,
        },
      ],
    })
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    })
    const where = {
      AND: [
        {
          club: {
            name: { contains: 'Example', mode: 'insensitive' },
          },
        },
        { name: { contains: 'Old', mode: 'insensitive' } },
      ],
    }
    expect(courseCountMock).toHaveBeenCalledWith({ where })
    expect(courseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [
          { club: { name: 'asc' } },
          { name: 'asc' },
          { id: 'asc' },
        ],
        skip: 0,
        take: 10,
      }),
    )
  })

  it('should require at least one catalogue search term', async () => {
    const response = await request(app).get('/api/catalogue/courses')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Club or course search query is required',
    })
    expect(courseFindManyMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/courses', () => {
  it('should return saved clubs, courses, and tees with numeric ratings', async () => {
    clubFindManyMock.mockResolvedValueOnce([
      {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Example Golf Club',
        courses: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Old Course',
            tees: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                teeName: 'Championship',
                courseRating: '73.1',
                slopeRating: 137,
                par: 70,
              },
            ],
          },
          {
            id: '66666666-6666-4666-8666-666666666666',
            name: 'Course Without Saved Tees',
            tees: [],
          },
        ],
      },
    ])

    const response = await request(app).get('/api/courses')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Example Golf Club',
        courses: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Old Course',
            tees: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                teeName: 'Championship',
                courseRating: 73.1,
                slopeRating: 137,
                par: 70,
              },
            ],
          },
        ],
      },
    ])
    expect(clubFindManyMock).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        courses: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            tees: {
              orderBy: { teeName: 'asc' },
              select: {
                id: true,
                teeName: true,
                courseRating: true,
                slopeRating: true,
                par: true,
              },
            },
          },
        },
      },
    })
  })

  it('should return an empty list when no tees have been saved', async () => {
    const response = await request(app).get('/api/courses')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })
})

describe('GET /api/tees/:teeId/scorecard', () => {
  const teeId = '22222222-2222-4222-8222-222222222222'
  const courseExternalId = '33333333-3333-4333-8333-333333333333'
  const holes = Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokeIndex: index + 1,
    yardage: index === 0 ? 410 : null,
  }))

  it('returns an already saved complete scorecard without using the provider', async () => {
    teeFindUniqueMock.mockResolvedValueOnce({
      id: teeId,
      externalId: null,
      teeName: 'White',
      courseRating: 72,
      slopeRating: 113,
      course: { externalId: courseExternalId },
      holes,
    })

    const response = await request(app).get(`/api/tees/${teeId}/scorecard`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      status: 'available',
      source: 'saved',
      holes,
    })
    expect(getProviderTeeScorecardMock).not.toHaveBeenCalled()
  })

  it('fetches and saves a provider scorecard once when local holes are absent', async () => {
    teeFindUniqueMock.mockResolvedValueOnce({
      id: teeId,
      externalId: '44444444-4444-4444-8444-444444444444',
      teeName: 'White',
      courseRating: 72,
      slopeRating: 113,
      course: { externalId: courseExternalId },
      holes: [],
    })
    getProviderTeeScorecardMock.mockResolvedValueOnce({ holes })

    const response = await request(app).get(`/api/tees/${teeId}/scorecard`)

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('available')
    expect(response.body.source).toBe('provider')
    expect(teeHoleDeleteManyMock).toHaveBeenCalledWith({ where: { teeId } })
    expect(teeHoleCreateManyMock).toHaveBeenCalledWith({
      data: holes.map((hole) => ({
        teeId,
        ...hole,
        source: 'API',
      })),
    })
  })

  it('recovers provider IDs for a legacy saved tee before fetching its scorecard', async () => {
    const clubId = '55555555-5555-4555-8555-555555555555'
    const providerClubId = '66666666-6666-4666-8666-666666666666'
    const providerTeeId = '77777777-7777-4777-8777-777777777777'

    teeFindUniqueMock.mockResolvedValueOnce({
      id: teeId,
      externalId: null,
      teeName: 'White',
      courseRating: 72,
      slopeRating: 113,
      course: {
        id: '88888888-8888-4888-8888-888888888888',
        externalId: null,
        name: 'Hallamshire',
        club: {
          id: clubId,
          externalId: null,
          name: 'Hallamshire Golf Club',
        },
      },
      holes: [],
    })
    searchCourseProviderClubsMock.mockResolvedValueOnce([
      { id: providerClubId, name: 'Hallamshire Golf Club' },
    ])
    getProviderClubCourseRatingsMock.mockResolvedValueOnce({
      clubExternalId: providerClubId,
      clubName: 'Hallamshire Golf Club',
      source: 'api',
      tees: [
        {
          courseExternalId,
          teeExternalId: providerTeeId,
          courseName: 'Hallamshire',
          teeName: 'White',
          courseRating: 72,
          slopeRating: 113,
          par: 71,
        },
      ],
    })
    getProviderTeeScorecardMock.mockResolvedValueOnce({ holes })

    const response = await request(app).get(`/api/tees/${teeId}/scorecard`)

    expect(response.status).toBe(200)
    expect(response.body.source).toBe('provider')
    expect(searchCourseProviderClubsMock).toHaveBeenCalledWith(
      'Hallamshire Golf Club',
    )
    expect(getProviderClubCourseRatingsMock).toHaveBeenCalledWith({
      id: providerClubId,
      name: 'Hallamshire Golf Club',
    })
    expect(courseUpdateMock).toHaveBeenCalledWith({
      where: { id: '88888888-8888-4888-8888-888888888888' },
      data: { externalId: courseExternalId },
    })
    expect(clubUpdateMock).toHaveBeenCalledWith({
      where: { id: clubId },
      data: { externalId: providerClubId },
    })
    expect(teeUpdateMock).toHaveBeenCalledWith({
      where: { id: teeId },
      data: { externalId: providerTeeId },
    })
    expect(getProviderTeeScorecardMock).toHaveBeenCalledWith(
      courseExternalId,
      {
        externalId: providerTeeId,
        teeName: 'White',
        courseRating: 72,
        slopeRating: 113,
      },
    )
  })
})

describe('GET /api/courses/search', () => {
  it('should merge a saved tee with available tees from the external lookup', async () => {
    clubFindManyMock.mockResolvedValueOnce([
      {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Example Golf Club',
        latitude: null,
        longitude: null,
        courses: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            clubId: '55555555-5555-4555-8555-555555555555',
            name: 'Old Course',
            tees: [
              {
                id: '44444444-4444-4444-8444-444444444444',
                courseId: '33333333-3333-4333-8333-333333333333',
                teeName: 'Championship',
                courseRating: 73.1,
                slopeRating: 137,
                par: 70,
                source: 'API',
              },
            ],
          },
        ],
      },
    ])
    getCourseRatingsMock.mockResolvedValueOnce({
      clubName: 'Example Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Old Course',
          teeName: 'Championship',
          courseRating: 73.1,
          slopeRating: 137,
          par: 70,
        },
        {
          courseName: 'Old Course',
          teeName: 'Forward',
          courseRating: 69.2,
          slopeRating: 125,
          par: 70,
        },
      ],
    })

    const response = await request(app).get(
      '/api/courses/search?q=Example',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      clubName: 'Example Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Old Course',
          teeName: 'Championship',
          courseRating: 73.1,
          slopeRating: 137,
          par: 70,
          isSaved: true,
        },
        {
          courseName: 'Old Course',
          teeName: 'Forward',
          courseRating: 69.2,
          slopeRating: 125,
          par: 70,
          isSaved: false,
        },
      ],
    })
    expect(clubFindManyMock).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            name: {
              contains: 'example',
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        courses: {
          include: {
            tees: true,
          },
        },
      },
    })
    expect(getCourseRatingsMock).toHaveBeenCalledWith('Example Golf Club')
  })

  it('should use the external lookup when a saved club has no tees', async () => {
    clubFindManyMock.mockResolvedValueOnce([
      {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Example Golf Club',
        latitude: null,
        longitude: null,
        courses: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            clubId: '55555555-5555-4555-8555-555555555555',
            name: 'Old Course',
            tees: [],
          },
        ],
      },
    ])
    const externalCourseData = {
      clubName: 'Example Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Old Course',
          teeName: 'Championship',
          courseRating: 73.1,
          slopeRating: 137,
          par: 70,
        },
      ],
    }
    getCourseRatingsMock.mockResolvedValueOnce(externalCourseData)

    const response = await request(app).get(
      '/api/courses/search?q=Example%20Golf%20Club',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      clubName: 'Example Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Old Course',
          teeName: 'Championship',
          courseRating: 73.1,
          slopeRating: 137,
          par: 70,
          isSaved: false,
        },
      ],
    })
    expect(getCourseRatingsMock).toHaveBeenCalledWith('Example Golf Club')
  })

  it('should return normalized ratings for a partial club name', async () => {
    const courseData = {
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape',
      tees: [
        {
          teeName: "Men's White",
          courseRating: 72.4,
          slopeRating: 130,
        },
      ],
    }
    getCourseRatingsMock.mockResolvedValueOnce(courseData)

    const response = await request(app).get(
      '/api/courses/search?q=Sickleholme',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape',
      tees: [
        {
          teeName: "Men's White",
          courseRating: 72.4,
          slopeRating: 130,
          isSaved: false,
        },
      ],
    })
    expect(getCourseRatingsMock).toHaveBeenCalledWith('Sickleholme')
  })

  it('should return 400 when the search query is missing', async () => {
    const response = await request(app).get('/api/courses/search')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Course search query is required',
    })
    expect(getCourseRatingsMock).not.toHaveBeenCalled()
  })

  it('should return 404 when course ratings are not found', async () => {
    getCourseRatingsMock.mockResolvedValueOnce(null)

    const response = await request(app).get(
      '/api/courses/search?q=Unknown',
    )

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: 'Course ratings not found',
    })
  })
})

describe('on-demand provider catalogue routes', () => {
  it('should return every club candidate from a partial provider search', async () => {
    const clubs = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Hallamshire Golf Club',
        city: 'Sheffield',
        county: 'South Yorkshire',
        postcode: 'S10 4LA',
        countryCode: 'ENG',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Hallowes Golf Club',
        city: 'Dronfield',
        county: 'Derbyshire',
        postcode: 'S18 1UR',
        countryCode: 'ENG',
      },
    ]
    searchCourseProviderClubsMock.mockResolvedValueOnce(clubs)

    const response = await request(app).get(
      '/api/courses/provider/clubs?q=Hall',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ clubs })
    expect(searchCourseProviderClubsMock).toHaveBeenCalledWith('Hall')
  })

  it('should load tee ratings only for the selected provider club', async () => {
    getProviderClubCourseRatingsMock.mockResolvedValueOnce({
      clubName: 'Hallamshire Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Hallamshire',
          teeName: 'White',
          courseRating: 70.8,
          slopeRating: 128,
          par: 71,
        },
      ],
    })

    const response = await request(app).get(
      '/api/courses/provider/clubs/11111111-1111-4111-8111-111111111111/courses?name=Hallamshire%20Golf%20Club',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      clubName: 'Hallamshire Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Hallamshire',
          teeName: 'White',
          courseRating: 70.8,
          slopeRating: 128,
          par: 71,
          isSaved: false,
        },
      ],
    })
    expect(getProviderClubCourseRatingsMock).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Hallamshire Golf Club',
    })
  })
})

describe('POST /api/courses', () => {
  it('should create a club with nested courses and tees', async () => {
    const createdClub = {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Example Golf Club',
      latitude: null,
      longitude: null,
      courses: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          clubId: '55555555-5555-4555-8555-555555555555',
          name: 'Old Course',
          tees: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              courseId: '33333333-3333-4333-8333-333333333333',
              teeName: 'Championship',
              courseRating: 73.1,
              slopeRating: 137,
              par: 70,
              source: 'API',
            },
          ],
        },
      ],
    }
    clubCreateMock.mockResolvedValueOnce(createdClub)

    const response = await request(app)
      .post('/api/courses')
      .send({
        clubName: 'Example Golf Club',
        source: 'api',
        tees: [
          {
            courseName: 'Old Course',
            teeName: 'Championship',
            courseRating: 73.1,
            slopeRating: 137,
            par: 70,
          },
        ],
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(createdClub)
    expect(clubCreateMock).toHaveBeenCalledWith({
      data: {
        name: 'Example Golf Club',
        courses: {
          create: [
            {
              name: 'Old Course',
              tees: {
                create: [
                  {
                    teeName: 'Championship',
                    courseRating: 73.1,
                    slopeRating: 137,
                    par: 70,
                    source: 'API',
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        courses: {
          include: {
            tees: true,
          },
        },
      },
    })
  })

  it('should add a new tee to an existing club without creating a duplicate club', async () => {
    const existingClub = {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Example Golf Club',
      latitude: null,
      longitude: null,
      courses: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          clubId: '55555555-5555-4555-8555-555555555555',
          name: 'Old Course',
          tees: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              courseId: '33333333-3333-4333-8333-333333333333',
              teeName: 'Championship',
              courseRating: 73.1,
              slopeRating: 137,
              par: 70,
              source: 'API',
            },
          ],
        },
      ],
    }
    const updatedClub = {
      ...existingClub,
      courses: [
        {
          ...existingClub.courses[0],
          tees: [
            ...existingClub.courses[0].tees,
            {
              id: '77777777-7777-4777-8777-777777777777',
              courseId: '33333333-3333-4333-8333-333333333333',
              teeName: 'Forward',
              courseRating: 69.2,
              slopeRating: 125,
              par: 70,
              source: 'API',
            },
          ],
        },
      ],
    }
    clubFindFirstMock.mockResolvedValueOnce(existingClub)
    clubUpdateMock.mockResolvedValueOnce(updatedClub)

    const response = await request(app)
      .post('/api/courses')
      .send({
        clubName: 'Example Golf Club',
        source: 'api',
        tees: [
          {
            courseName: 'Old Course',
            teeName: 'Forward',
            courseRating: 69.2,
            slopeRating: 125,
            par: 70,
          },
        ],
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(updatedClub)
    expect(clubCreateMock).not.toHaveBeenCalled()
    expect(clubUpdateMock).toHaveBeenCalledWith({
      where: { id: '55555555-5555-4555-8555-555555555555' },
      data: {
        courses: {
          create: [],
          update: [
            {
              where: { id: '33333333-3333-4333-8333-333333333333' },
              data: {
                tees: {
                  create: [
                    {
                      teeName: 'Forward',
                      courseRating: 69.2,
                      slopeRating: 125,
                      par: 70,
                      source: 'API',
                    },
                  ],
                },
              },
            },
          ],
        },
      },
      include: {
        courses: {
          include: {
            tees: true,
          },
        },
      },
    })
  })

  it('should save a same-name tee when its ratings are different', async () => {
    const existingClub = {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Example Golf Club',
      courses: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Old Course',
          tees: [
            {
              teeName: 'Championship',
              courseRating: 73.1,
              slopeRating: 137,
            },
          ],
        },
      ],
    }
    clubFindFirstMock.mockResolvedValueOnce(existingClub)
    clubUpdateMock.mockResolvedValueOnce(existingClub)

    const response = await request(app)
      .post('/api/courses')
      .send({
        clubName: 'Example Golf Club',
        source: 'api',
        tees: [
          {
            courseName: 'Old Course',
            teeName: 'Championship',
            courseRating: 75.2,
            slopeRating: 142,
          },
        ],
      })

    expect(response.status).toBe(201)
    expect(clubUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          courses: {
            create: [],
            update: [
              {
                where: { id: '33333333-3333-4333-8333-333333333333' },
                data: {
                  tees: {
                    create: [
                      {
                        teeName: 'Championship',
                        courseRating: 75.2,
                        slopeRating: 142,
                        source: 'API',
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      }),
    )
  })

  it('should reject a tee without a course name', async () => {
    const response = await request(app)
      .post('/api/courses')
      .send({
        clubName: 'Example Golf Club',
        source: 'api',
        tees: [
          {
            teeName: 'Championship',
            courseRating: 73.1,
            slopeRating: 137,
            par: 70,
          },
        ],
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Invalid course data',
    })
    expect(clubCreateMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/users', () => {
  const authUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const profileSelect = {
    id: true,
    name: true,
    email: true,
    homeClubId: true,
    handicapIndex: true,
    createdAt: true,
    homeClub: {
      select: {
        id: true,
        name: true,
      },
    },
  }

  it('should require a confirmed email before creating or claiming a profile', async () => {
    getAuthenticatedUserMock.mockResolvedValueOnce({
      id: authUserId,
      email: 'jack@example.com',
      emailConfirmed: false,
    })

    const response = await request(app).post('/api/users').send({
      name: 'Jack Humphreys',
    })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: 'Confirm your email before continuing',
    })
    expect(userCreateMock).not.toHaveBeenCalled()
  })

  it('should return 400 when a new profile has no name', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).post('/api/users').send({})

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Name is required for a new profile',
    })
  })

  it('should create a profile using the verified authentication email', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)
    userCreateMock.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: null,
      handicapIndex: null,
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
      homeClub: null,
    })

    const response = await request(app).post('/api/users').send({
      name: 'Jack Humphreys',
      email: 'attacker@example.com',
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: expect.any(String),
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: null,
      handicapIndex: null,
      createdAt: expect.any(String),
      homeClub: null,
    })
    expect(userCreateMock).toHaveBeenCalledWith({
      data: {
        name: 'Jack Humphreys',
        email: 'jack@example.com',
        authUserId,
      },
      select: profileSelect,
    })
  })

  it('should claim an existing profile with the same verified email', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)
    userFindFirstMock.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      authUserId: null,
    })
    userUpdateMock.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: null,
      handicapIndex: null,
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
      homeClub: null,
    })

    const response = await request(app).post('/api/users').send({})

    expect(response.status).toBe(200)
    expect(response.body.email).toBe('jack@example.com')
    expect(userFindFirstMock).toHaveBeenCalledWith({
      where: {
        email: {
          equals: 'jack@example.com',
          mode: 'insensitive',
        },
      },
      select: { id: true, authUserId: true },
    })
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: '11111111-1111-4111-8111-111111111111' },
      data: { authUserId },
      select: profileSelect,
    })
    expect(userCreateMock).not.toHaveBeenCalled()
  })

  it('should return an already-linked profile without creating another', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: null,
      handicapIndex: '12.4',
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
      homeClub: null,
    })

    const response = await request(app).post('/api/users').send({})

    expect(response.status).toBe(200)
    expect(response.body.handicapIndex).toBe(12.4)
    expect(userFindFirstMock).not.toHaveBeenCalled()
    expect(userCreateMock).not.toHaveBeenCalled()
  })

  it('should reject an email already linked to a different auth account', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)
    userFindFirstMock.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      authUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    })

    const response = await request(app).post('/api/users').send({})

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'This profile is already linked to another account',
    })
    expect(userUpdateMock).not.toHaveBeenCalled()
  })
})

describe('privacy and account controls', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const authUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

  it('loads and updates only the authenticated player privacy settings', async () => {
    const original = {
      profileDiscoverable: true,
      friendRequestsEnabled: true,
      showHandicapToFriends: true,
    }
    const updated = {
      profileDiscoverable: false,
      friendRequestsEnabled: false,
      showHandicapToFriends: false,
    }
    userFindUniqueMock
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce({ id: userId })
    userUpdateMock.mockResolvedValueOnce(updated)

    const getResponse = await request(app).get('/api/users/me/settings/privacy')
    const patchResponse = await request(app)
      .patch('/api/users/me/settings/privacy')
      .send(updated)

    expect(getResponse.status).toBe(200)
    expect(getResponse.body).toEqual(original)
    expect(patchResponse.status).toBe(200)
    expect(patchResponse.body).toEqual(updated)
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: updated,
      select: {
        profileDiscoverable: true,
        friendRequestsEnabled: true,
        showHandicapToFriends: true,
      },
    })
  })

  it('exports the authenticated player data', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: userId,
      name: 'Player One',
      email: 'player@example.com',
      rounds: [],
      coursePreferences: [],
      playerGoals: [],
      submissions: [],
    })

    const response = await request(app).get('/api/users/me/settings/export')

    expect(response.status).toBe(200)
    expect(response.body.product).toBe('Fore the Record')
    expect(response.body.exportedAt).toEqual(expect.any(String))
    expect(response.body.data).toMatchObject({
      id: userId,
      email: 'player@example.com',
    })
  })

  it('permanently deletes a verified non-admin account', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: userId,
      authUserId,
      email: 'player@example.com',
      role: 'PLAYER',
    })
    userDeleteMock.mockResolvedValueOnce({ id: userId })

    const response = await request(app)
      .delete('/api/users/me/settings/account')
      .send({ confirmation: 'player@example.com' })

    expect(response.status).toBe(204)
    expect(deleteAuthUserMock).toHaveBeenCalledWith(authUserId)
    expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: userId } })
  })

  it('protects the sole administrator from self-service deletion', async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: userId,
      authUserId,
      email: 'jackhumphreys.dev@gmail.com',
      role: 'ADMIN',
    })

    const response = await request(app)
      .delete('/api/users/me/settings/account')
      .send({ confirmation: 'jackhumphreys.dev@gmail.com' })

    expect(response.status).toBe(409)
    expect(deleteAuthUserMock).not.toHaveBeenCalled()
    expect(userDeleteMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/rounds authentication', () => {
  const profileId = '11111111-1111-4111-8111-111111111111'
  const parsedInput = {
    userId: profileId,
    teeId: '44444444-4444-4444-8444-444444444444',
    datePlayed: new Date('2026-08-31T00:00:00.000Z'),
    grossScore: 84,
    weatherCondition: 'DRY' as const,
    pccAdjustment: 0,
    isAcceptable: true,
  }

  it('should derive the round owner from the authenticated profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: profileId })
    parseLogRoundInputMock.mockReturnValueOnce(parsedInput)
    logRoundMock.mockResolvedValueOnce({
      round: { id: '33333333-3333-4333-8333-333333333333' },
      handicapIndex: 12.4,
    })

    const response = await request(app).post('/api/rounds').send({
      userId: '99999999-9999-4999-8999-999999999999',
      teeId: parsedInput.teeId,
      datePlayed: '2026-08-31',
      grossScore: 84,
      weatherCondition: 'DRY',
    })

    expect(response.status).toBe(201)
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      select: { id: true },
    })
    expect(parseLogRoundInputMock).toHaveBeenCalledWith({
      userId: profileId,
      teeId: parsedInput.teeId,
      datePlayed: '2026-08-31',
      grossScore: 84,
      weatherCondition: 'DRY',
    })
    expect(logRoundMock).toHaveBeenCalledWith(parsedInput)
  })

  it('should reject round entry when the account has no linked profile', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).post('/api/rounds').send({
      teeId: parsedInput.teeId,
    })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Profile not found' })
    expect(parseLogRoundInputMock).not.toHaveBeenCalled()
    expect(logRoundMock).not.toHaveBeenCalled()
  })
})
