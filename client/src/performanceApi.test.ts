import { describe, expect, it } from 'vitest'
import { isPerformanceSummaryData } from './performanceApi.ts'

const summary = {
  roundsLogged: 8,
  scoredRounds: 7,
  casualRounds: 5,
  individualCompetitionRounds: 2,
  teamCompetitionRounds: 1,
  countingRounds: 3,
  bestDifferential: 8.2,
  averageDifferential: 11.4,
  recentDifferentials: [
    {
      roundId: 'round-1',
      datePlayed: '2026-09-09T00:00:00.000Z',
      scoreDifferential: 10.1,
      usedInHandicapCalc: true,
    },
  ],
}

describe('isPerformanceSummaryData', () => {
  it('should accept a complete performance summary', () => {
    expect(isPerformanceSummaryData(summary)).toBe(true)
    expect(
      isPerformanceSummaryData({
        ...summary,
        bestDifferential: null,
        averageDifferential: null,
        recentDifferentials: [],
      }),
    ).toBe(true)
  })

  it('should reject malformed totals and recent scores', () => {
    expect(isPerformanceSummaryData({ ...summary, roundsLogged: -1 })).toBe(
      false,
    )
    expect(
      isPerformanceSummaryData({
        ...summary,
        recentDifferentials: [
          { ...summary.recentDifferentials[0], scoreDifferential: '10.1' },
        ],
      }),
    ).toBe(false)
    expect(
      isPerformanceSummaryData({
        ...summary,
        recentDifferentials: Array.from({ length: 6 }, () =>
          summary.recentDifferentials[0],
        ),
      }),
    ).toBe(false)
  })
})
