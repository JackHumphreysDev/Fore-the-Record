import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  clubCreateMock,
  clubFindFirstMock,
  clubFindUniqueMock,
  clubFindManyMock,
  clubUpdateMock,
  getCourseRatingsMock,
  userCreateMock,
  userFindUniqueMock,
  userUpdateMock,
} = vi.hoisted(() => ({
  clubCreateMock: vi.fn(),
  clubFindFirstMock: vi.fn(),
  clubFindUniqueMock: vi.fn(),
  clubFindManyMock: vi.fn(),
  clubUpdateMock: vi.fn(),
  getCourseRatingsMock: vi.fn(),
  userCreateMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
}))

vi.mock('../src/database.js', () => ({
  prisma: {
    club: {
      create: clubCreateMock,
      findFirst: clubFindFirstMock,
      findUnique: clubFindUniqueMock,
      findMany: clubFindManyMock,
      update: clubUpdateMock,
    },
    user: {
      create: userCreateMock,
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
  },
}))

vi.mock('../src/courseRatings.js', () => ({
  getCourseRatings: getCourseRatingsMock,
}))

import app from '../src/app.js'

beforeEach(() => {
  clubCreateMock.mockReset()
  clubFindFirstMock.mockReset()
  clubFindFirstMock.mockResolvedValue(null)
  clubFindUniqueMock.mockReset()
  clubFindManyMock.mockReset()
  clubFindManyMock.mockResolvedValue([])
  clubUpdateMock.mockReset()
  getCourseRatingsMock.mockReset()
  userCreateMock.mockReset()
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

describe('GET /api/users/:id', () => {
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

    const response = await request(app).get(`/api/users/${userId}`)

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
      where: { id: userId },
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

    const response = await request(app).get(`/api/users/${userId}`)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
  })
})

describe('PATCH /api/users/:id', () => {
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

    const response = await request(app).patch(`/api/users/${userId}`).send({
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
      where: { id: userId },
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

    const response = await request(app).patch(`/api/users/${userId}`).send({
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

  it('should reject an invalid user ID', async () => {
    const response = await request(app).patch('/api/users/not-a-uuid').send({
      homeClubId: null,
    })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid user ID' })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('should reject an invalid home club ID', async () => {
    const response = await request(app).patch(`/api/users/${userId}`).send({
      homeClubId: 'not-a-uuid',
    })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid home club ID' })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
  })

  it('should return 404 when the user does not exist', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).patch(`/api/users/${userId}`).send({
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

    const response = await request(app).patch(`/api/users/${userId}`).send({
      homeClubId,
    })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Home club not found' })
    expect(userUpdateMock).not.toHaveBeenCalled()
  })
})

describe('GET /api/users/:id/rounds', () => {
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

    const response = await request(app).get(`/api/users/${userId}/rounds`)

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
        where: { id: userId },
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

    const response = await request(app).get(`/api/users/${userId}/rounds`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('should return 404 when the user does not exist', async () => {
    userFindUniqueMock.mockResolvedValueOnce(null)

    const response = await request(app).get(`/api/users/${userId}/rounds`)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'User not found' })
  })

  it('should reject an invalid user ID before querying the database', async () => {
    const response = await request(app).get('/api/users/not-a-uuid/rounds')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Invalid user ID' })
    expect(userFindUniqueMock).not.toHaveBeenCalled()
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
  it('should return 400 when name and email are missing', async () => {
    const response = await request(app).post('/api/users').send({})

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Name and email are required',
    })
  })

  it('should return 201 with the created profile', async () => {
    userCreateMock.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: null,
      handicapIndex: null,
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
    })

    const response = await request(app).post('/api/users').send({
      name: 'Jack Humphreys',
      email: 'jack@example.com',
    })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: expect.any(String),
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId: null,
      handicapIndex: null,
      createdAt: expect.any(String),
    })
    expect(userCreateMock).toHaveBeenCalledWith({
      data: {
        name: 'Jack Humphreys',
        email: 'jack@example.com',
      },
    })
  })

  it('should include an optional home club when creating a profile', async () => {
    const homeClubId = '22222222-2222-4222-8222-222222222222'

    userCreateMock.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId,
      handicapIndex: null,
      createdAt: new Date('2026-08-29T12:00:00.000Z'),
    })

    const response = await request(app).post('/api/users').send({
      name: 'Jack Humphreys',
      email: 'jack@example.com',
      homeClubId,
    })

    expect(response.status).toBe(201)
    expect(response.body.homeClubId).toBe(homeClubId)
    expect(userCreateMock).toHaveBeenCalledWith({
      data: {
        name: 'Jack Humphreys',
        email: 'jack@example.com',
        homeClubId,
      },
    })
  })

  it('should return 409 when the email already exists', async () => {
    userCreateMock.mockRejectedValueOnce({ code: 'P2002' })

    const response = await request(app).post('/api/users').send({
      name: 'Jack Humphreys',
      email: 'jack@example.com',
    })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'A user with this email already exists',
    })
  })
})
