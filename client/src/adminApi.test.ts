import { describe, expect, it } from 'vitest'
import {
  buildAdminUserPath,
  buildAdminUserStatusPath,
  buildAdminUsersPath,
  isAdminIdentity,
  isAdminOverview,
  isAdminUsersResponse,
} from './adminApi.ts'

describe('buildAdminUsersPath', () => {
  it('should trim and encode the search term with pagination', () => {
    expect(buildAdminUsersPath('  Jack + Player  ', 2, 20)).toBe(
      '/api/admin/users?search=Jack+%2B+Player&page=2&pageSize=20',
    )
  })

  it('should omit an empty search term', () => {
    expect(buildAdminUsersPath('   ', 1, 20)).toBe(
      '/api/admin/users?page=1&pageSize=20',
    )
  })
})

describe('administrator account paths', () => {
  it('should safely encode player IDs for detail and status requests', () => {
    expect(buildAdminUserPath('player/id')).toBe('/api/admin/users/player%2Fid')
    expect(buildAdminUserStatusPath('player/id')).toBe(
      '/api/admin/users/player%2Fid/status',
    )
  })
})

describe('admin response validation', () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Example Player',
    email: 'player@example.com',
    role: 'PLAYER',
    status: 'ACTIVE',
    hasLogin: true,
    handicapIndex: 12.4,
    createdAt: '2026-08-31T18:15:00.000Z',
    homeClub: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Example Golf Club',
    },
    roundCount: 4,
  }

  it('should recognize only a complete administrator identity', () => {
    expect(
      isAdminIdentity({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'ADMIN',
      }),
    ).toBe(true)
    expect(isAdminIdentity(user)).toBe(false)
  })

  it('should accept a complete overview', () => {
    expect(
      isAdminOverview({
        totals: { users: 14, rounds: 38, clubs: 6 },
        recentRegistrations: [user],
      }),
    ).toBe(true)
  })

  it('should reject an overview containing unsafe or incomplete user data', () => {
    expect(
      isAdminOverview({
        totals: { users: 14, rounds: 38, clubs: 6 },
        recentRegistrations: [{ ...user, role: 'OWNER' }],
      }),
    ).toBe(false)
    expect(
      isAdminOverview({
        totals: { users: 14, rounds: 38, clubs: 6 },
        recentRegistrations: [{ ...user, status: 'DELETED' }],
      }),
    ).toBe(false)
    expect(
      isAdminOverview({
        totals: { users: 14, rounds: 38, clubs: 6 },
        recentRegistrations: [{ ...user, hasLogin: 'yes' }],
      }),
    ).toBe(false)
    expect(
      isAdminOverview({
        totals: { users: 14, rounds: 38, clubs: 6 },
        recentRegistrations: [{ ...user, createdAt: 'not-a-date' }],
      }),
    ).toBe(false)
  })

  it('should accept a paginated user response', () => {
    expect(
      isAdminUsersResponse({
        users: [user],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    ).toBe(true)
  })

  it('should reject invalid pagination metadata', () => {
    expect(
      isAdminUsersResponse({
        users: [user],
        pagination: {
          page: 0,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    ).toBe(false)
  })
})
