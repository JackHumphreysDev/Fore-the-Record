import { describe, expect, it } from 'vitest'
import {
  buildAdvancedStatistics,
  type AdvancedStatisticRound,
} from '../src/advancedStatistics.js'

function round(
  index: number,
  overrides: Partial<AdvancedStatisticRound> = {},
): AdvancedStatisticRound {
  const recent = index > 5
  return {
    id: `round-${index}`,
    datePlayed: new Date(`2026-09-${String(index).padStart(2, '0')}T00:00:00.000Z`),
    holeCount: 18,
    tee: {
      id: 'tee-1',
      teeName: 'White',
      course: { name: 'Main Course', club: { name: 'Example Golf Club' } },
    },
    holeScores: Array.from({ length: 18 }, (_, hole) => ({
      par: hole % 3 === 0 ? 3 : hole % 3 === 1 ? 4 : 5,
      putts: recent ? 1 : 2,
      fairwayResult: hole % 3 === 0 ? 'NOT_APPLICABLE' : recent ? 'HIT' : 'MISSED_LEFT',
      greenInRegulation: recent,
      penaltyStrokes: recent ? 0 : 1,
      bunkerVisits: recent ? 0 : 1,
      upAndDownResult: recent ? 'SUCCESSFUL' : 'UNSUCCESSFUL',
    })),
    ...overrides,
  }
}

describe('buildAdvancedStatistics', () => {
  it('compares the latest five recorded rounds with the previous five', () => {
    const result = buildAdvancedStatistics(
      Array.from({ length: 10 }, (_, index) => round(index + 1)),
    )

    expect(result.trends.find(({ metric }) => metric === 'PUTTS_PER_HOLE')).toMatchObject({
      direction: 'IMPROVING',
      recentAverage: 1,
      previousAverage: 2,
      change: -1,
      recentRounds: 5,
      previousRounds: 5,
      recentObservations: 90,
      previousObservations: 90,
    })
    expect(result.trends.find(({ metric }) => metric === 'PUTTS_PER_ROUND')).toMatchObject({
      direction: 'IMPROVING',
      recentAverage: 18,
      previousAverage: 36,
    })
    expect(result.trends.find(({ metric }) => metric === 'FAIRWAYS_HIT_PERCENTAGE')).toMatchObject({
      direction: 'IMPROVING',
      recentAverage: 100,
      previousAverage: 0,
    })
    expect(result.trends.find(({ metric }) => metric === 'MISSED_LEFT_PERCENTAGE')).toMatchObject({
      direction: 'IMPROVING',
      recentAverage: 0,
      previousAverage: 100,
    })
    expect(result.trends.find(({ metric }) => metric === 'MISSED_RIGHT_PERCENTAGE')).toMatchObject({
      direction: 'STEADY',
      recentAverage: 0,
      previousAverage: 0,
    })
    expect(result.biggestGain).not.toBeNull()
    expect(result.focusArea).toBeNull()
    expect(result.greensByPar).toEqual([
      { par: 3, holes: 60, hits: 30, percentage: 50 },
      { par: 4, holes: 60, hits: 30, percentage: 50 },
      { par: 5, holes: 60, hits: 30, percentage: 50 },
    ])
  })

  it('requires ten metric rounds for a direction and two for a venue comparison', () => {
    const otherTee = {
      id: 'tee-2',
      teeName: 'Yellow',
      course: { name: 'Second Course', club: { name: 'Other Golf Club' } },
    }
    const result = buildAdvancedStatistics([
      round(1),
      round(2),
      round(3, { tee: otherTee }),
      round(4, { tee: otherTee }),
    ])

    expect(result.trends.every(({ direction }) => direction === 'INSUFFICIENT_DATA')).toBe(true)
    const putting = result.venues.find(({ metric }) => metric === 'PUTTS_PER_HOLE')
    expect(putting?.results).toHaveLength(2)
    expect(putting?.results.every(({ rounds }) => rounds === 2)).toBe(true)
  })

  it('does not treat missing statistics as zero', () => {
    const missing = round(1, {
      holeScores: round(1).holeScores.map((hole) => ({
        ...hole,
        putts: null,
        fairwayResult: null,
        greenInRegulation: null,
        penaltyStrokes: null,
        bunkerVisits: null,
        upAndDownResult: null,
      })),
    })
    const result = buildAdvancedStatistics([missing])

    expect(result.trends.every(({ recentRounds }) => recentRounds === 0)).toBe(true)
    expect(result.venues.every(({ results }) => results.length === 0)).toBe(true)
    expect(result.greensByPar.every(({ holes }) => holes === 0)).toBe(true)
  })
})
