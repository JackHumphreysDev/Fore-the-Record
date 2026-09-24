import { describe, expect, it } from 'vitest'
import { buildStatisticsDashboardCard } from './statisticsDashboardCards.ts'
import type { PerformanceAnalysisData } from './performanceAnalysisApi.ts'

const analysis = {
  overall: { rounds: 4, scoredRounds: 3, averageGrossScore: 82.5, relativeToParRounds: 3, averageToPar: 10.5 },
  detailedStatistics: {
    putts: { holes: 36, completeRounds: 2, total: 70, averagePerHole: 1.9, averagePerRound: 35, threePutts: 3, threePuttPercentage: 8.3 },
    fairways: { holes: 28, hits: 18, missedLeft: 5, missedRight: 5, hitPercentage: 64.3, missedLeftPercentage: 17.9, missedRightPercentage: 17.9 },
    greens: { holes: 36, hits: 16, percentage: 44.4 }, scrambling: { attempts: 12, successful: 5, percentage: 41.7 },
    penalties: { completeRounds: 2, total: 3, averagePerRound: 1.5 }, bunkers: { completeRounds: 2, total: 4, averagePerRound: 2 },
  },
} as PerformanceAnalysisData

describe('statistics dashboard cards', () => {
  it('formats scoring and optional-stat samples honestly', () => {
    expect(buildStatisticsDashboardCard('AVERAGE_TO_PAR', analysis, 12.4).value).toBe('+10.5')
    expect(buildStatisticsDashboardCard('FAIRWAYS_HIT', analysis, 12.4)).toMatchObject({ value: '64.3%', sample: '18 of 28 applicable holes' })
  })
  it('keeps unavailable values visibly unavailable', () => {
    const empty = { ...analysis, detailedStatistics: { ...analysis.detailedStatistics, scrambling: { attempts: 0, successful: 0, percentage: null } } }
    expect(buildStatisticsDashboardCard('SCRAMBLING', empty, null).value).toBe('—')
    expect(buildStatisticsDashboardCard('CURRENT_HANDICAP', empty, null).value).toBe('—')
  })
})
