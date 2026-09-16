import { describe, expect, it } from 'vitest'
import {
  buildFriendActivityPath,
  isFriendActivityResponse,
} from './friendActivityApi.ts'

const activity = {
  id: 'round-id',
  datePlayed: '2026-09-16T00:00:00.000Z',
  timePlayed: '09:10',
  category: 'CASUAL',
  participation: 'INDIVIDUAL',
  scoringFormat: 'STROKE_PLAY',
  holeCount: 9,
  nineHoleSegment: 'FRONT_NINE',
  grossScore: 42,
  stablefordPoints: null,
  usedInHandicapCalc: false,
  player: {
    id: 'player-id',
    name: 'Tiger Woods',
    homeClub: { id: 'club-id', name: 'Example Club' },
    handicapVisible: true,
    handicapIndex: 1.2,
  },
  tee: {
    teeName: 'White',
    course: { name: 'Main Course', club: { name: 'Example Club' } },
  },
}

describe('friend activity API contracts', () => {
  it('accepts a paginated, limited round summary', () => {
    expect(isFriendActivityResponse({
      activities: [activity],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    })).toBe(true)
  })

  it('rejects a nine-hole activity without its segment', () => {
    expect(isFriendActivityResponse({
      activities: [{ ...activity, nineHoleSegment: null }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    })).toBe(false)
  })

  it('builds a bounded pagination path', () => {
    expect(buildFriendActivityPath(2)).toBe(
      '/api/users/me/friends/activity?page=2&pageSize=10',
    )
  })
})
