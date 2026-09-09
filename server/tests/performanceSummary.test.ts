import { describe, expect, it } from 'vitest'
import {
  buildPerformanceSummary,
  type PerformanceRound,
} from '../src/performanceSummary.js'

function makeRound(
  overrides: Partial<PerformanceRound> = {},
): PerformanceRound {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    datePlayed: new Date('2026-09-09T00:00:00.000Z'),
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    scoreDifferential: 12.4,
    isAcceptable: true,
    usedInHandicapCalc: false,
    scorecardStatus: 'VERIFIED',
    ...overrides,
  }
}

describe('buildPerformanceSummary', () => {
  it('should return an empty summary when no rounds exist', () => {
    expect(buildPerformanceSummary([])).toEqual({
      roundsLogged: 0,
      scoredRounds: 0,
      casualRounds: 0,
      individualCompetitionRounds: 0,
      teamCompetitionRounds: 0,
      countingRounds: 0,
      bestDifferential: null,
      averageDifferential: null,
      recentDifferentials: [],
    })
  })

  it('should summarize classifications and official differentials', () => {
    const rounds = [
      makeRound({
        id: '11111111-1111-4111-8111-111111111111',
        scoreDifferential: 10.2,
        usedInHandicapCalc: true,
      }),
      makeRound({
        id: '22222222-2222-4222-8222-222222222222',
        datePlayed: new Date('2026-09-08T00:00:00.000Z'),
        category: 'COMPETITION',
        scoreDifferential: 8.1,
        usedInHandicapCalc: true,
      }),
      makeRound({
        id: '33333333-3333-4333-8333-333333333333',
        datePlayed: new Date('2026-09-07T00:00:00.000Z'),
        category: 'COMPETITION',
        participation: 'TEAM',
        scoreDifferential: null,
        isAcceptable: false,
        scorecardStatus: 'NOT_REQUIRED',
      }),
      makeRound({
        id: '44444444-4444-4444-8444-444444444444',
        datePlayed: new Date('2026-09-06T00:00:00.000Z'),
        scoreDifferential: 4.5,
        isAcceptable: false,
        scorecardStatus: 'PENDING_REVIEW',
      }),
    ]

    expect(buildPerformanceSummary(rounds)).toEqual({
      roundsLogged: 4,
      scoredRounds: 2,
      casualRounds: 2,
      individualCompetitionRounds: 1,
      teamCompetitionRounds: 1,
      countingRounds: 2,
      bestDifferential: 8.1,
      averageDifferential: 9.2,
      recentDifferentials: [
        {
          roundId: '11111111-1111-4111-8111-111111111111',
          datePlayed: '2026-09-09T00:00:00.000Z',
          scoreDifferential: 10.2,
          usedInHandicapCalc: true,
        },
        {
          roundId: '22222222-2222-4222-8222-222222222222',
          datePlayed: '2026-09-08T00:00:00.000Z',
          scoreDifferential: 8.1,
          usedInHandicapCalc: true,
        },
      ],
    })
  })

  it('should keep only the five most recent official differentials', () => {
    const rounds = Array.from({ length: 7 }, (_, index) =>
      makeRound({
        id: `${index + 1}`,
        datePlayed: new Date(`2026-09-${String(9 - index).padStart(2, '0')}T00:00:00.000Z`),
        scoreDifferential: index + 1,
      }),
    )

    expect(buildPerformanceSummary(rounds).recentDifferentials).toHaveLength(5)
    expect(
      buildPerformanceSummary(rounds).recentDifferentials.map(
        (round) => round.scoreDifferential,
      ),
    ).toEqual([1, 2, 3, 4, 5])
  })
})
