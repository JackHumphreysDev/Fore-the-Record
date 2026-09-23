import { describe, expect, it } from 'vitest'
import { buildSeasonYearReviewsPath, isSeasonYearReviewsResponse } from './seasonYearReviewsApi.ts'

const period = {
  year: 2026, season: 'SUMMER', roundsPlayed: 2, holesPlayed: 36, totalShots: 150, yardsCovered: 12000,
  eagles: 0, birdies: 3, pars: 18, bogeys: 10,
  handicap: { startingIndex: 12.4, endingIndex: 11.8, change: -0.6 },
  mostPlayedCourse: { courseId: 'course', clubName: 'Example Club', courseName: 'Main', rounds: 2 },
  notableRounds: { lowestGross: null, highestStableford: null, bestDifferential: null },
}

describe('season and year review API helpers', () => {
  it('validates a complete response', () => {
    expect(isSeasonYearReviewsResponse({
      options: { years: [2026, 2025], seasons: [{ id: 'SUMMER', name: 'Summer', months: 'June to August' }] },
      selected: { year: 2026, season: 'SUMMER' }, review: period,
      previous: { ...period, year: 2025 },
    })).toBe(true)
  })

  it('rejects a mismatched comparison period', () => {
    expect(isSeasonYearReviewsResponse({
      options: { years: [2026], seasons: [] }, selected: { year: 2026, season: 'SUMMER' }, review: period,
      previous: { ...period, year: 2024 },
    })).toBe(false)
  })

  it('builds explicit year and season filters', () => {
    expect(buildSeasonYearReviewsPath(2026, 'AUTUMN')).toBe('/api/users/me/season-year-reviews?year=2026&season=AUTUMN')
  })
})
