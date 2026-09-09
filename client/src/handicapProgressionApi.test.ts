import { describe, expect, it } from 'vitest'
import { isHandicapProgression } from './handicapProgressionApi.ts'

const point = {
  roundId: 'round-1',
  datePlayed: '2026-09-09T00:00:00.000Z',
  clubName: 'Example Golf Club',
  courseName: 'Main Course',
  teeName: 'White',
  scoreDifferential: 12.4,
  handicapIndex: 11.8,
  countedAtTheTime: true,
}

describe('handicap progression response validation', () => {
  it('accepts an ordered list of progression points', () => {
    expect(isHandicapProgression([point])).toBe(true)
  })

  it('rejects incomplete points and oversized responses', () => {
    expect(
      isHandicapProgression([{ ...point, handicapIndex: null }]),
    ).toBe(false)
    expect(isHandicapProgression(new Array(21).fill(point))).toBe(false)
  })
})
