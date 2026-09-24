import { describe, expect, it } from 'vitest'
import { DEFAULT_STATISTICS_DASHBOARD, parseStatisticsDashboardConfig, readStatisticsDashboardConfig } from '../src/statisticsDashboard.js'

describe('statistics dashboard configuration', () => {
  it('accepts an ordered set of unique cards and filters', () => {
    expect(parseStatisticsDashboardConfig({ cards: ['AVERAGE_GROSS', 'FAIRWAYS_HIT'], filters: { dateRange: '90_DAYS', customFrom: null, customTo: null, courseId: null, teeId: null, category: 'CASUAL', holeCount: 18 } })).toEqual({ cards: ['AVERAGE_GROSS', 'FAIRWAYS_HIT'], filters: { dateRange: '90_DAYS', customFrom: null, customTo: null, courseId: null, teeId: null, category: 'CASUAL', holeCount: 18 } })
  })
  it('rejects duplicate cards and reversed custom dates', () => {
    expect(() => parseStatisticsDashboardConfig({ cards: ['AVERAGE_GROSS', 'AVERAGE_GROSS'], filters: DEFAULT_STATISTICS_DASHBOARD.filters })).toThrow('different statistic cards')
    expect(() => parseStatisticsDashboardConfig({ cards: ['AVERAGE_GROSS'], filters: { ...DEFAULT_STATISTICS_DASHBOARD.filters, dateRange: 'CUSTOM', customFrom: '2026-09-24', customTo: '2026-09-01' } })).toThrow('start date')
  })
  it('falls back safely when a stored configuration is no longer valid', () => {
    expect(readStatisticsDashboardConfig({ cards: [] })).toEqual(DEFAULT_STATISTICS_DASHBOARD)
  })
})
