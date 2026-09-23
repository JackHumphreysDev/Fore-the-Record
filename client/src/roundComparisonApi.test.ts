import { describe, expect, it } from 'vitest'
import { buildRoundComparisonPath, isRoundComparisonData } from './roundComparisonApi.ts'

const option = {
  id: 'baseline', datePlayed: '2026-09-01', courseId: 'course', clubName: 'Example Golf Club',
  courseName: 'Main Course', teeName: 'White', scoringFormat: 'STROKE_PLAY', holeCount: 18,
  nineHoleSegment: null,
}
const summary = {
  ...option, category: 'CASUAL', grossScore: 90, par: 72, scoreToPar: 18,
  stablefordPoints: null, scoreDifferential: 18, handicapIndexAfter: 18,
  countedAtTheTime: true, frontNine: 45, backNine: 45,
}
const response = {
  options: [option, { ...option, id: 'compared', datePlayed: '2026-09-08', teeName: 'Yellow' }],
  selected: { baselineRoundId: 'baseline', comparedRoundId: 'compared' },
  comparison: {
    baseline: summary,
    compared: { ...summary, id: 'compared', datePlayed: '2026-09-08', teeName: 'Yellow', grossScore: 80 },
    grossChange: -10, stablefordChange: null, gainedHoles: 5, lostHoles: 2,
    matchedHoles: 18, netStrokeChange: -10,
    holes: [{ holeNumber: 1, baselinePar: 4, comparedPar: 4, baselineStrokes: 5, comparedStrokes: 4, baselinePickedUp: false, comparedPickedUp: false, change: -1, result: 'GAINED' }],
    statistics: [{ metric: 'PUTTS', label: 'Total putts', unit: 'NUMBER', lowerIsBetter: true, baselineValue: 36, comparedValue: 32, baselineObservations: 18, comparedObservations: 18, change: -4 }],
  },
}

describe('round comparison API helpers', () => {
  it('accepts complete comparisons and empty compatible histories', () => {
    expect(isRoundComparisonData(response)).toBe(true)
    expect(isRoundComparisonData({ options: [option], selected: { baselineRoundId: null, comparedRoundId: null }, comparison: null })).toBe(true)
    expect(isRoundComparisonData({ ...response, comparison: { ...response.comparison, matchedHoles: -1 } })).toBe(false)
    expect(isRoundComparisonData({ ...response, selected: { baselineRoundId: 'other', comparedRoundId: 'compared' } })).toBe(false)
  })

  it('builds an encoded comparison path only when both rounds are supplied', () => {
    expect(buildRoundComparisonPath()).toBe('/api/users/me/round-comparison')
    expect(buildRoundComparisonPath('round one', 'round/two')).toBe('/api/users/me/round-comparison?baselineRoundId=round+one&comparedRoundId=round%2Ftwo')
    expect(buildRoundComparisonPath('round one')).toBe('/api/users/me/round-comparison')
  })
})
