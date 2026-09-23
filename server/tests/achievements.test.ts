import { describe, expect, it } from 'vitest'
import { buildAchievements, type AchievementRound } from '../src/achievements.js'

function round(id: string, date: string, overrides: Partial<AchievementRound> = {}): AchievementRound {
  const holes = Array.from({ length: 18 }, (_, index) => ({ par: 4, strokesTaken: index === 0 ? 3 : 4, pickedUp: false }))
  return {
    id, datePlayed: new Date(`${date}T00:00:00.000Z`), createdAt: new Date(`${date}T12:00:00.000Z`),
    category: 'CASUAL', participation: 'INDIVIDUAL', scoringFormat: 'STROKE_PLAY', holeCount: 18,
    grossScore: 71, stablefordPoints: null, scoreDifferential: 10, isAcceptable: true,
    scorecardStatus: 'VERIFIED', tee: { course: { id: `course-${id}` } }, holeScores: holes,
    ...overrides,
  }
}

describe('buildAchievements', () => {
  it('returns a locked catalogue for a new player', () => {
    const result = buildAchievements([])
    expect(result.summary.total).toBeGreaterThan(30)
    expect(result.summary).toMatchObject({ earned: 0, inProgress: 0 })
    expect(result.achievements.every(({ achievedAt }) => achievedAt === null)).toBe(true)
  })

  it('earns scoring, exploration, competition, and streak badges from qualifying rounds', () => {
    const rounds = [
      round('one', '2026-01-10', { category: 'COMPETITION', scoringFormat: 'STABLEFORD', stablefordPoints: 38 }),
      round('two', '2026-02-10', { category: 'SOCIAL_GAME' }),
      round('three', '2026-03-10'),
    ]
    const result = buildAchievements(rounds)
    expect(result.achievements.find(({ id }) => id === 'first-competition')).toMatchObject({ qualifyingRoundId: 'one' })
    expect(result.achievements.find(({ id }) => id === 'stableford-36')).toMatchObject({ qualifyingRoundId: 'one' })
    expect(result.achievements.find(({ id }) => id === 'courses-3')).toMatchObject({ qualifyingRoundId: 'three' })
    expect(result.achievements.find(({ id }) => id === 'monthly-streak-3')).toMatchObject({ qualifyingRoundId: 'three' })
    expect(result.achievements.find(({ id }) => id === 'birdies-1')).toMatchObject({ current: 3, qualifyingRoundId: 'one' })
  })

  it('excludes team and unverified cards from every badge', () => {
    const result = buildAchievements([
      round('team', '2026-01-01', { participation: 'TEAM', scorecardStatus: 'NOT_REQUIRED' }),
      round('pending', '2026-02-01', { scorecardStatus: 'PENDING_REVIEW' }),
    ])
    expect(result.summary.earned).toBe(0)
  })
})
