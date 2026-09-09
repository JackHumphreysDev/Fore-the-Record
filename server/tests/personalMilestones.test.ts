import { describe, expect, it } from 'vitest'
import {
  buildPersonalMilestones,
  type MilestoneRound,
} from '../src/personalMilestones.js'

function makeRound(
  overrides: Partial<MilestoneRound> = {},
): MilestoneRound {
  const holeScores = Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokesTaken: [2, 3, 4, 5][index % 4],
  }))

  return {
    id: '11111111-1111-4111-8111-111111111111',
    datePlayed: new Date('2026-09-01T00:00:00.000Z'),
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    grossScore: holeScores.reduce(
      (total, hole) => total + hole.strokesTaken,
      0,
    ),
    scoreDifferential: 12.4,
    isAcceptable: true,
    scorecardStatus: 'VERIFIED',
    holeScores,
    teeHoles: holeScores.map((hole) => ({
      holeNumber: hole.holeNumber,
      yardage: hole.holeNumber === 18 ? null : 400,
    })),
    ...overrides,
  }
}

describe('buildPersonalMilestones', () => {
  it('returns locked progress and zero lifetime totals for a new player', () => {
    const result = buildPersonalMilestones([])

    expect(result.totals).toEqual({
      holesPlayed: 0,
      totalShots: 0,
      yardsCovered: 0,
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
    })
    expect(result.personalBests).toEqual({
      lowestGrossScore: null,
      lowestDifferential: null,
      lowestHandicapIndex: null,
    })
    expect(result.achievements).toHaveLength(12)
    expect(result.achievements.every(({ achievedAt }) => achievedAt === null)).toBe(true)
  })

  it('calculates lifetime scoring, yardage, achievements, and personal bests', () => {
    const firstRound = makeRound()
    const secondRound = makeRound({
      id: '22222222-2222-4222-8222-222222222222',
      datePlayed: new Date('2026-09-02T00:00:00.000Z'),
      createdAt: new Date('2026-09-02T12:00:00.000Z'),
      category: 'COMPETITION',
      grossScore: 68,
      scoreDifferential: 8.2,
    })

    const result = buildPersonalMilestones([secondRound, firstRound])

    expect(result.totals).toEqual({
      holesPlayed: 36,
      totalShots: 122,
      yardsCovered: 13_600,
      eagles: 10,
      birdies: 10,
      pars: 8,
      bogeys: 8,
    })
    expect(result.personalBests).toEqual({
      lowestGrossScore: {
        value: 61,
        achievedAt: '2026-09-01T00:00:00.000Z',
      },
      lowestDifferential: {
        value: 8.2,
        achievedAt: '2026-09-02T00:00:00.000Z',
      },
      lowestHandicapIndex: {
        value: 10.3,
        achievedAt: '2026-09-02T00:00:00.000Z',
      },
    })
    expect(
      result.achievements.find(({ id }) => id === 'first-individual-competition')
        ?.achievedAt,
    ).toBe('2026-09-02T00:00:00.000Z')
    expect(
      result.achievements.find(({ id }) => id === 'gross-below-70')
        ?.achievedAt,
    ).toBe('2026-09-01T00:00:00.000Z')
  })

  it('excludes team and unverified cards from scoring totals', () => {
    const result = buildPersonalMilestones([
      makeRound({ participation: 'TEAM' }),
      makeRound({
        id: '22222222-2222-4222-8222-222222222222',
        scorecardStatus: 'PENDING_REVIEW',
      }),
    ])

    expect(result.totals.holesPlayed).toBe(0)
    expect(result.personalBests.lowestGrossScore).toBeNull()
    expect(result.personalBests.lowestHandicapIndex).toBeNull()
  })
})
