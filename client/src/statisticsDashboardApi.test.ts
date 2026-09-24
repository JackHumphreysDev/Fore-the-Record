import { describe, expect, it } from 'vitest'
import { isStatisticsDashboardConfig } from './statisticsDashboardApi.ts'

const config = { cards: ['ROUNDS_PLAYED', 'AVERAGE_GROSS'], filters: { dateRange: 'ALL_TIME', customFrom: null, customTo: null, courseId: null, teeId: null, category: null, holeCount: null } }

describe('statistics dashboard API contract', () => {
  it('accepts a complete ordered dashboard configuration', () => expect(isStatisticsDashboardConfig(config)).toBe(true))
  it('rejects duplicate cards and incomplete filters', () => {
    expect(isStatisticsDashboardConfig({ ...config, cards: ['ROUNDS_PLAYED', 'ROUNDS_PLAYED'] })).toBe(false)
    expect(isStatisticsDashboardConfig({ cards: ['ROUNDS_PLAYED'], filters: { dateRange: 'ALL_TIME' } })).toBe(false)
  })
})
