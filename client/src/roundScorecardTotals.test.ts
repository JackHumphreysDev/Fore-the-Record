import { describe, expect, it } from 'vitest'
import { calculateRoundScoreTotals } from './roundScorecardTotals.ts'

describe('round scorecard totals', () => {
  it('calculates front nine, back nine, and complete totals', () => {
    const holes = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      strokesTaken: index < 9 ? '4' : '5',
    }))

    expect(calculateRoundScoreTotals(holes)).toEqual({
      frontNine: 36,
      backNine: 45,
      total: 81,
    })
  })

  it('updates from entered scores and leaves untouched nines empty', () => {
    expect(
      calculateRoundScoreTotals([
        { holeNumber: 1, strokesTaken: '4' },
        { holeNumber: 2, strokesTaken: '' },
      ]),
    ).toEqual({ frontNine: 4, backNine: null, total: 4 })
  })
})
