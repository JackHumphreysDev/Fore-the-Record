import { describe, expect, it } from 'vitest'
import { isAchievementsResponse } from './achievementsApi.ts'

const item = { id: 'rounds-1', title: 'First card', description: 'Record a round.', category: 'PROGRESS', icon: 'rounds', achievedAt: '2026-09-23T00:00:00.000Z', qualifyingRoundId: 'round', current: 1, target: 1, direction: 'UP' }

describe('isAchievementsResponse', () => {
  it('accepts consistent achievement data', () => {
    expect(isAchievementsResponse({ summary: { total: 1, earned: 1, inProgress: 0 }, achievements: [item] })).toBe(true)
  })
  it('rejects inconsistent summary totals', () => {
    expect(isAchievementsResponse({ summary: { total: 2, earned: 1, inProgress: 0 }, achievements: [item] })).toBe(false)
  })
  it('rejects unsupported categories', () => {
    expect(isAchievementsResponse({ summary: { total: 1, earned: 1, inProgress: 0 }, achievements: [{ ...item, category: 'SECRET' }] })).toBe(false)
  })
})
