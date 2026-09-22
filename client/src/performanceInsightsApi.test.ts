import { describe, expect, it } from 'vitest'
import { buildPerformanceInsightsPath, isPerformanceInsightsData } from './performanceInsightsApi.ts'

const valid = {
  qualifyingRounds: 2,
  strokePlayTrend: { direction: 'INSUFFICIENT_DATA', recentAverage: 90, previousAverage: null, change: null, recentSample: 2, previousSample: 0 },
  stablefordTrend: { direction: 'INSUFFICIENT_DATA', recentAverage: null, previousAverage: null, change: null, recentSample: 0, previousSample: 0 },
  consistency: { rounds: 2, averageGross: 90, standardDeviation: 2, range: { lowest: 88, highest: 92 }, level: 'CONSISTENT' },
  parPerformance: [{ par: 4, holes: 2, averageToPar: 1 }],
  ninePerformance: [{ segment: 'FRONT_NINE', nines: 2, averageToPar: 4 }],
  bestVenues: { strokePlay: { teeId: 'tee', teeName: 'White', courseName: 'Course', clubName: 'Club', rounds: 2, average: 90 }, stableford: null },
  holeExplorer: { tees: [{ id: 'tee', name: 'White', courseId: 'course', courseName: 'Course', clubName: 'Club', holes: [{ holeNumber: 1, par: 4, strokeIndex: 1, yardage: 400 }] }], selectedTeeId: null, selectedHole: null, definition: null, averageStrokes: null, direction: 'INSUFFICIENT_DATA', points: [] },
}

describe('performance insights API helpers', () => {
  it('validates a complete response and rejects an incomplete response', () => {
    expect(isPerformanceInsightsData(valid)).toBe(true)
    expect(isPerformanceInsightsData({ ...valid, holeExplorer: { points: [] } })).toBe(false)
  })

  it('builds selection paths only when tee and hole are both present', () => {
    expect(buildPerformanceInsightsPath()).toBe('/api/users/me/performance-insights')
    expect(buildPerformanceInsightsPath('tee id', 7)).toBe('/api/users/me/performance-insights?teeId=tee+id&hole=7')
  })
})
