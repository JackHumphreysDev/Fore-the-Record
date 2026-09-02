import type { Request } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, getUserMock, getClaimsMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  getClaimsMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

import {
  getAuthenticatedUser,
  getBearerToken,
  getVerifiedTokenSubject,
} from '../src/auth.js'

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'publishable-key'
  createClientMock.mockReset()
  getUserMock.mockReset()
  getClaimsMock.mockReset()
  createClientMock.mockReturnValue({
    auth: {
      getUser: getUserMock,
      getClaims: getClaimsMock,
    },
  })
})

describe('getVerifiedTokenSubject', () => {
  it('returns the subject only after Supabase verifies the token claims', async () => {
    getClaimsMock.mockResolvedValueOnce({
      data: {
        claims: { sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      },
      error: null,
    })
    const request = {
      headers: { authorization: 'Bearer access-token' },
    } as Request

    await expect(getVerifiedTokenSubject(request)).resolves.toBe(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
    expect(getClaimsMock).toHaveBeenCalledWith('access-token')
  })

  it('rejects unverified or malformed token subjects', async () => {
    getClaimsMock
      .mockResolvedValueOnce({ data: null, error: new Error('Invalid token') })
      .mockResolvedValueOnce({
        data: { claims: { sub: 'not-a-user-id' } },
        error: null,
      })
    const request = {
      headers: { authorization: 'Bearer invalid-token' },
    } as Request

    await expect(getVerifiedTokenSubject(request)).resolves.toBeNull()
    await expect(getVerifiedTokenSubject(request)).resolves.toBeNull()
  })
})

describe('getBearerToken', () => {
  it('returns the token from a valid Bearer authorization header', () => {
    expect(getBearerToken('Bearer access-token')).toBe('access-token')
  })

  it('rejects missing and malformed authorization headers', () => {
    expect(getBearerToken(undefined)).toBeNull()
    expect(getBearerToken('Basic credentials')).toBeNull()
    expect(getBearerToken('Bearer')).toBeNull()
  })
})

describe('getAuthenticatedUser', () => {
  it('verifies the access token and returns the confirmed identity', async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          email: 'player@example.com',
          email_confirmed_at: '2026-08-31T09:00:00.000Z',
        },
      },
      error: null,
    })

    const request = {
      headers: { authorization: 'Bearer access-token' },
    } as Request

    await expect(getAuthenticatedUser(request)).resolves.toEqual({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'player@example.com',
      emailConfirmed: true,
    })
    expect(getUserMock).toHaveBeenCalledWith('access-token')
  })

  it('returns null when the token cannot be verified', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Invalid token'),
    })

    const request = {
      headers: { authorization: 'Bearer invalid-token' },
    } as Request

    await expect(getAuthenticatedUser(request)).resolves.toBeNull()
  })
})
