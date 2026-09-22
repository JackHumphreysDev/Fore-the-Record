import { describe, expect, it } from 'vitest'
import { isCoursePersonalBestsData } from './coursePersonalBestsApi.ts'

const response = {
  courses: [{
    teeId: 'tee-1', teeName: 'White', courseId: 'course-1', courseName: 'Main Course',
    clubName: 'Example Golf Club', rounds: 2,
    lowestGross: { score: 72, toPar: 0, datePlayed: '2026-09-20', roundId: 'round-1' },
    highestStableford: null,
    frontNine: { score: 36, toPar: 0, datePlayed: '2026-09-20', roundId: 'round-1' },
    backNine: null,
    holes: [{ holeNumber: 1, par: 4, score: 3, toPar: -1, datePlayed: '2026-09-20', roundId: 'round-1' }],
  }],
}

describe('isCoursePersonalBestsData', () => {
  it('accepts a complete personal bests response', () => {
    expect(isCoursePersonalBestsData(response)).toBe(true)
  })

  it('rejects incomplete record data', () => {
    expect(isCoursePersonalBestsData({ ...response, courses: [{ ...response.courses[0], holes: [{ holeNumber: 1 }] }] })).toBe(false)
  })
})
