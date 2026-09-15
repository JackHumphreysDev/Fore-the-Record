import { describe, expect, it } from 'vitest'
import {
  calculateCourseHandicap,
  calculateStablefordPoints,
  calculateStablefordTotals,
} from './stableford.ts'

describe('Stableford helpers', () => {
  it('suggests a Course Handicap from the selected tee', () => {
    expect(calculateCourseHandicap(18.2, 125, 71.4, 72)).toBe(20)
  })

  it('calculates points after allocated strokes', () => {
    expect(calculateStablefordPoints({ par: 4, strokeIndex: 1, strokesTaken: 5 }, 18)).toBe(2)
  })

  it('gives a picked-up hole zero points', () => {
    expect(calculateStablefordPoints({ par: 4, strokeIndex: 1, strokesTaken: '', pickedUp: true }, 18)).toBe(0)
  })

  it('does not calculate points without a valid Playing Handicap', () => {
    const hole = { par: 4, strokeIndex: 1, strokesTaken: 5 }

    expect(calculateStablefordPoints(hole, Number.NaN)).toBeNull()
    expect(calculateStablefordPoints(hole, 55)).toBeNull()
  })

  it('only returns completed totals', () => {
    const complete = Array.from({ length: 18 }, (_, index) => ({
      par: 4,
      strokeIndex: index + 1,
      strokesTaken: 5,
    }))
    expect(calculateStablefordTotals(complete, 18)).toMatchObject({
      frontNine: 18,
      backNine: 18,
      total: 36,
    })
    expect(calculateStablefordTotals(complete.slice(0, 17), 18).total).toBeNull()
  })
})
