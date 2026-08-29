import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  clubCreateMock,
  clubFindFirstMock,
  getCourseRatingsMock,
  userCreateMock,
} = vi.hoisted(() => ({
    clubCreateMock: vi.fn(),
    clubFindFirstMock: vi.fn(),
    getCourseRatingsMock: vi.fn(),
    userCreateMock: vi.fn(),
  }))

vi.mock('../src/database.js', () => ({
  prisma: {
    club: {
      create: clubCreateMock,
      findFirst: clubFindFirstMock,
    },
    user: {
      create: userCreateMock,
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
  getCourseRatingsMock.mockReset()
  userCreateMock.mockReset()
})

describe('GET /api/health', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})

describe('GET /api/courses/search', () => {
  it('should return saved local ratings without calling the external lookup', async () => {
    clubFindFirstMock.mockResolvedValueOnce({
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
    })

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
        },
      ],
    })
    expect(clubFindFirstMock).toHaveBeenCalledWith({
      where: {
        name: {
          equals: 'Example Golf Club',
          mode: 'insensitive',
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
    expect(getCourseRatingsMock).not.toHaveBeenCalled()
  })

  it('should use the external lookup when a saved club has no tees', async () => {
    clubFindFirstMock.mockResolvedValueOnce({
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
    })
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
    expect(response.body).toEqual(externalCourseData)
    expect(getCourseRatingsMock).toHaveBeenCalledWith('Example Golf Club')
  })

  it('should return normalized ratings for the requested club', async () => {
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
      '/api/courses/search?q=Sickleholme%20Golf%20Club',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual(courseData)
    expect(getCourseRatingsMock).toHaveBeenCalledWith('Sickleholme Golf Club')
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
