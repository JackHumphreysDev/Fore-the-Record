import { describe, expect, it } from 'vitest'
import {
  calculateAdjustedGrossScore,
  calculateCourseHandicap,
  calculateHandicap,
  calculateHandicapIndex,
  calculateHandicapStrokesReceived,
  calculateScoreDifferential,
  type HandicapRoundInput,
} from '../src/handicap.js'

describe('calculateAdjustedGrossScore', () => {
  it('uses the gross score without capping when hole scores are unavailable', () => {
    const result = calculateAdjustedGrossScore({ grossScore: 95 })

    expect(result).toEqual({
      adjustedGrossScore: 95,
      isCapped: false,
    })
  })

  it('caps each hole at net double bogey when hole scores are available', () => {
    const result = calculateAdjustedGrossScore({
      grossScore: 14,
      holeScores: [
        {
          par: 4,
          strokesTaken: 9,
          handicapStrokesReceived: 1,
        },
        {
          par: 3,
          strokesTaken: 5,
          handicapStrokesReceived: 0,
        },
      ],
    })

    expect(result).toEqual({
      adjustedGrossScore: 12,
      isCapped: true,
    })
  })
})

describe('calculateScoreDifferential', () => {
  it('calculates and rounds a score differential to one decimal place', () => {
    const result = calculateScoreDifferential({
      adjustedGrossScore: 95,
      courseRating: 72.4,
      slopeRating: 125,
      pccAdjustment: 0,
    })

    expect(result).toBe(20.4)
  })

  it('includes the playing conditions calculation adjustment', () => {
    const result = calculateScoreDifferential({
      adjustedGrossScore: 95,
      courseRating: 72.4,
      slopeRating: 125,
      pccAdjustment: 1,
    })

    expect(result).toBe(19.5)
  })

  it('supports a negative score differential', () => {
    const result = calculateScoreDifferential({
      adjustedGrossScore: 70,
      courseRating: 72.7,
      slopeRating: 113,
      pccAdjustment: 0,
    })

    expect(result).toBe(-2.7)
  })

  it('rejects a slope rating of zero', () => {
    expect(() =>
      calculateScoreDifferential({
        adjustedGrossScore: 95,
        courseRating: 72.4,
        slopeRating: 0,
        pccAdjustment: 0,
      }),
    ).toThrow('slopeRating must be greater than zero')
  })
})

describe('calculateCourseHandicap', () => {
  it('includes slope, course rating, and par', () => {
    const result = calculateCourseHandicap({
      handicapIndex: 12.4,
      slopeRating: 137,
      courseRating: 73.1,
      par: 70,
    })

    expect(result).toBe(18)
  })

  it('rounds negative course handicaps away from zero at a half', () => {
    const result = calculateCourseHandicap({
      handicapIndex: -0.5,
      slopeRating: 113,
      courseRating: 72,
      par: 72,
    })

    expect(result).toBe(-1)
  })
})

describe('calculateHandicapStrokesReceived', () => {
  it('allocates second strokes from the lowest stroke indexes', () => {
    expect(calculateHandicapStrokesReceived(20, 2)).toBe(2)
    expect(calculateHandicapStrokesReceived(20, 3)).toBe(1)
  })

  it('gives strokes back on the highest stroke indexes for plus handicaps', () => {
    expect(calculateHandicapStrokesReceived(-2, 16)).toBe(0)
    expect(calculateHandicapStrokesReceived(-2, 17)).toBe(-1)
  })

  it('limits the maximum hole score to par plus five', () => {
    expect(calculateHandicapStrokesReceived(72, 1)).toBe(3)
  })
})

describe('calculateHandicapIndex', () => {
  it('averages the lowest eight score differentials', () => {
    const result = calculateHandicapIndex([10, 8, 1, 7, 2, 6, 3, 5, 4, 9])

    expect(result).toBe(4.5)
  })

  it('truncates the handicap index to one decimal place', () => {
    const result = calculateHandicapIndex([10, 10, 10.2])

    expect(result).toBe(10)
  })

  it('returns no index when there are no score differentials', () => {
    expect(calculateHandicapIndex([])).toBeNull()
  })
})

function createRound(
  id: string,
  datePlayed: string,
  scoreDifferential: number,
  isAcceptable = true,
): HandicapRoundInput {
  return { id, datePlayed, scoreDifferential, isAcceptable }
}

describe('calculateHandicap', () => {
  it('averages the lowest eight differentials from the latest 20 acceptable rounds', () => {
    const rounds = Array.from({ length: 21 }, (_, index) =>
      createRound(
        `round-${index + 1}`,
        `2026-08-${String(index + 1).padStart(2, '0')}`,
        index === 0 ? -10 : index,
      ),
    )

    const result = calculateHandicap(rounds)

    expect(result.handicapIndex).toBe(4.5)
    expect(result.consideredRoundIds).toHaveLength(20)
    expect(result.consideredRoundIds).not.toContain('round-1')
    expect(result.usedRoundIds).toEqual([
      'round-2',
      'round-3',
      'round-4',
      'round-5',
      'round-6',
      'round-7',
      'round-8',
      'round-9',
    ])
  })

  it('excludes unacceptable rounds before limiting the history', () => {
    const rounds = [
      createRound('unacceptable', '2026-08-22', -20, false),
      ...Array.from({ length: 20 }, (_, index) =>
        createRound(
          `round-${index + 1}`,
          `2026-08-${String(index + 1).padStart(2, '0')}`,
          index + 1,
        ),
      ),
    ]

    const result = calculateHandicap(rounds)

    expect(result.consideredRoundIds).toHaveLength(20)
    expect(result.consideredRoundIds).not.toContain('unacceptable')
    expect(result.usedRoundIds).not.toContain('unacceptable')
    expect(result.handicapIndex).toBe(4.5)
  })

  it('uses every available round when there are fewer than eight', () => {
    const result = calculateHandicap([
      createRound('round-1', '2026-08-01', 10.1),
      createRound('round-2', '2026-08-02', 12.2),
      createRound('round-3', '2026-08-03', 14.3),
    ])

    expect(result.handicapIndex).toBe(12.2)
    expect(result.usedRoundIds).toEqual(['round-1', 'round-2', 'round-3'])
  })

  it('returns no handicap when there are no acceptable rounds', () => {
    const result = calculateHandicap([
      createRound('round-1', '2026-08-01', 10, false),
    ])

    expect(result).toEqual({
      handicapIndex: null,
      consideredRoundIds: [],
      usedRoundIds: [],
    })
  })

  it('does not mutate the supplied round history', () => {
    const rounds = [
      createRound('round-1', '2026-08-02', 12),
      createRound('round-2', '2026-08-01', 10),
    ]
    const originalRounds = structuredClone(rounds)

    calculateHandicap(rounds)

    expect(rounds).toEqual(originalRounds)
  })
})
