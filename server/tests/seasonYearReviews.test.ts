import { describe, expect, it } from 'vitest'
import { buildSeasonYearReviews, type SeasonReviewRound } from '../src/seasonYearReviews.js'

function round(id: string, date: string, overrides: Partial<SeasonReviewRound> = {}): SeasonReviewRound {
  return {
    id,
    datePlayed: new Date(`${date}T00:00:00.000Z`),
    createdAt: new Date(`${date}T12:00:00.000Z`),
    participation: 'INDIVIDUAL', scorecardStatus: 'VERIFIED', scoringFormat: 'STROKE_PLAY',
    holeCount: 2, grossScore: 8, stablefordPoints: null, scoreDifferential: 10,
    isAcceptable: true,
    tee: { id: 'tee', teeName: 'White', course: { id: 'course', name: 'Main', club: { name: 'Example Club' } }, holes: [{ holeNumber: 1, yardage: 400 }, { holeNumber: 2, yardage: 160 }] },
    holeScores: [{ holeNumber: 1, par: 4, strokesTaken: 4, pickedUp: false }, { holeNumber: 2, par: 3, strokesTaken: 4, pickedUp: false }],
    ...overrides,
  }
}

describe('buildSeasonYearReviews', () => {
  it('offers every recorded year and filters a selected season within the year', () => {
    const result = buildSeasonYearReviews([
      round('previous', '2025-04-10'),
      round('spring', '2026-04-10'),
      round('summer', '2026-07-10'),
    ], 2026, 'SPRING')
    expect(result.options.years).toEqual([2026, 2025])
    expect(result.review).toMatchObject({ year: 2026, season: 'SPRING', roundsPlayed: 1, holesPlayed: 2, totalShots: 8, yardsCovered: 560 })
    expect(result.previous.roundsPlayed).toBe(1)
  })

  it('summarizes scoring achievements, courses, and notable rounds', () => {
    const result = buildSeasonYearReviews([
      round('one', '2026-01-10', { scoringFormat: 'STABLEFORD', stablefordPoints: 38, grossScore: 7, holeScores: [{ holeNumber: 1, par: 4, strokesTaken: 3, pickedUp: false }, { holeNumber: 2, par: 3, strokesTaken: 4, pickedUp: false }] }),
      round('two', '2026-12-10', { scoreDifferential: 8 }),
    ], 2026, 'WINTER')
    expect(result.review).toMatchObject({ roundsPlayed: 2, holesPlayed: 4, totalShots: 15, birdies: 1, pars: 1, bogeys: 2 })
    expect(result.review.mostPlayedCourse).toMatchObject({ courseId: 'course', rounds: 2 })
    expect(result.review.notableRounds.highestStableford).toMatchObject({ roundId: 'one', value: 38 })
    expect(result.review.notableRounds.bestDifferential).toMatchObject({ roundId: 'two', value: 8 })
  })

  it('excludes team and unverified rounds', () => {
    const result = buildSeasonYearReviews([
      round('team', '2026-06-01', { participation: 'TEAM', scorecardStatus: 'NOT_REQUIRED' }),
      round('pending', '2026-06-02', { scorecardStatus: 'PENDING_REVIEW' }),
    ], 2026)
    expect(result.options.years).toEqual([])
    expect(result.review.roundsPlayed).toBe(0)
  })
})
