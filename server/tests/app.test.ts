import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { userCreateMock } = vi.hoisted(() => ({
  userCreateMock: vi.fn(),
}))

vi.mock('../src/database.js', () => ({
  prisma: {
    user: {
      create: userCreateMock,
    },
  },
}))

import app from '../src/app.js'

beforeEach(() => {
  userCreateMock.mockReset()
})

describe('GET /api/health', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
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
