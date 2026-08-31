import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAuthenticatedUserMock,
  prismaTransactionMock,
  clubCountMock,
  clubCreateMock,
  clubFindFirstMock,
  clubFindUniqueMock,
  clubFindManyMock,
  clubUpdateMock,
  getCourseRatingsMock,
  logRoundMock,
  parseLogRoundInputMock,
  roundCountMock,
  submissionCountMock,
  submissionCreateMock,
  submissionFindFirstMock,
  submissionFindUniqueMock,
  submissionFindManyMock,
  submissionUpdateMock,
  submissionMessageCreateMock,
  submissionMessageFindManyMock,
  adminAuditLogCreateMock,
  userCountMock,
  userCreateMock,
  userFindManyMock,
  userFindFirstMock,
  userFindUniqueMock,
  userUpdateMock,
} = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
  clubCountMock: vi.fn(),
  clubCreateMock: vi.fn(),
  clubFindFirstMock: vi.fn(),
  clubFindUniqueMock: vi.fn(),
  clubFindManyMock: vi.fn(),
  clubUpdateMock: vi.fn(),
  getCourseRatingsMock: vi.fn(),
  logRoundMock: vi.fn(),
  parseLogRoundInputMock: vi.fn(),
  roundCountMock: vi.fn(),
  submissionCountMock: vi.fn(),
  submissionCreateMock: vi.fn(),
  submissionFindFirstMock: vi.fn(),
  submissionFindUniqueMock: vi.fn(),
  submissionFindManyMock: vi.fn(),
  submissionUpdateMock: vi.fn(),
  submissionMessageCreateMock: vi.fn(),
  submissionMessageFindManyMock: vi.fn(),
  adminAuditLogCreateMock: vi.fn(),
  userCountMock: vi.fn(),
  userCreateMock: vi.fn(),
  userFindManyMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
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
    user: {
      count: userCountMock,
      create: userCreateMock,
      findFirst: userFindFirstMock,
      findMany: userFindManyMock,
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
    round: {
      count: roundCountMock,
    },
    submission: {
      count: submissionCountMock,
      create: submissionCreateMock,
      findFirst: submissionFindFirstMock,
      findUnique: submissionFindUniqueMock,
      findMany: submissionFindManyMock,
      update: submissionUpdateMock,
    },
    submissionMessage: {
      create: submissionMessageCreateMock,
      findMany: submissionMessageFindManyMock,
    },
    adminAuditLog: {
      create: adminAuditLogCreateMock,
    },
  },
}))

vi.mock('../src/courseRatings.js', () => ({
  getCourseRatings: getCourseRatingsMock,
}))

vi.mock('../src/auth.js', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
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
  clubCountMock.mockReset()
  clubCreateMock.mockReset()
  clubFindFirstMock.mockReset()
  clubFindFirstMock.mockResolvedValue(null)
  clubFindUniqueMock.mockReset()
  clubFindManyMock.mockReset()
  clubFindManyMock.mockResolvedValue([])
  clubUpdateMock.mockReset()
  getCourseRatingsMock.mockReset()
  logRoundMock.mockReset()
  parseLogRoundInputMock.mockReset()
  roundCountMock.mockReset()
  submissionCountMock.mockReset()
  submissionCreateMock.mockReset()
  submissionFindFirstMock.mockReset()
  submissionFindUniqueMock.mockReset()
  submissionFindManyMock.mockReset()
  submissionUpdateMock.mockReset()
  submissionMessageCreateMock.mockReset()
  submissionMessageFindManyMock.mockReset()
  adminAuditLogCreateMock.mockReset()
  userCountMock.mockReset()
  userCreateMock.mockReset()
  userFindManyMock.mockReset()
  userFindFirstMock.mockReset()
  userFindFirstMock.mockResolvedValue(null)
  userFindUniqueMock.mockReset()
  userUpdateMock.mockReset()
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
        name: 'Recent Player',
        email: 'recent@example.com',
        role: 'PLAYER',
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
        name: true,
        email: true,
        role: true,
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
        name: 'Jack Player',
        email: 'jack.player@example.com',
        role: 'PLAYER',
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
        name: true,
        email: true,
        role: true,
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
    createdAt: true,
    updatedAt: true,
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
      createdAt: '2026-08-31T20:00:00.000Z',
      updatedAt: '2026-08-31T20:00:00.000Z',
    })
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      select: { id: true },
    })
    expect(submissionCreateMock).toHaveBeenCalledWith({
      data: {
        userId,
        type: 'ISSUE',
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
        createdAt: true,
        updatedAt: true,
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
    expect(submissionMessageCreateMock).toHaveBeenCalledWith({
      data: {
        submissionId,
        senderUserId: playerId,
        body: 'I was using the latest version of Firefox.',
      },
      select: messageSelect,
    })
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
    userFindUniqueMock.mockResolvedValueOnce({
      rounds: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          userId,
          teeId: '44444444-4444-4444-8444-444444444444',
          datePlayed: new Date('2026-08-30T00:00:00.000Z'),
          grossScore: 90,
          adjustedGrossScore: 88,
          isCapped: true,
          weatherCondition: 'WET',
          pccAdjustment: '1.0',
          scoreDifferential: '12.3',
          isAcceptable: true,
          usedInHandicapCalc: true,
          createdAt: new Date('2026-08-30T12:00:00.000Z'),
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
        grossScore: 90,
        adjustedGrossScore: 88,
        isCapped: true,
        weatherCondition: 'WET',
        pccAdjustment: 1,
        scoreDifferential: 12.3,
        isAcceptable: true,
        usedInHandicapCalc: true,
        createdAt: '2026-08-30T12:00:00.000Z',
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
