import { describe, expect, it } from 'vitest'
import {
  parseScorecardReviewDecision,
  scorecardWasAmended,
} from '../src/scorecardReviews.js'

const holes = Array.from({ length: 18 }, (_, index) => ({
  holeNumber: index + 1,
  par: index % 3 === 0 ? 3 : index % 3 === 1 ? 4 : 5,
  strokeIndex: index + 1,
  yardage: 140 + index * 10,
}))

describe('parseScorecardReviewDecision', () => {
  it('accepts a complete approved scorecard', () => {
    expect(
      parseScorecardReviewDecision({ action: 'APPROVE', holes }),
    ).toEqual({ action: 'APPROVE', holes })
  })

  it('rejects duplicate stroke indexes', () => {
    expect(() =>
      parseScorecardReviewDecision({
        action: 'APPROVE',
        holes: holes.map((hole) => ({ ...hole, strokeIndex: 1 })),
      }),
    ).toThrow('holes 1–18 and each stroke index once')
  })

  it('accepts a rejection without amended holes', () => {
    expect(parseScorecardReviewDecision({ action: 'REJECT' })).toEqual({
      action: 'REJECT',
    })
  })
})

describe('scorecardWasAmended', () => {
  it('detects an admin yardage amendment without changing player strokes', () => {
    expect(
      scorecardWasAmended(holes, [
        { ...holes[0], yardage: 999 },
        ...holes.slice(1),
      ]),
    ).toBe(true)
  })
})
