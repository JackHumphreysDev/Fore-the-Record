import { describe, expect, it } from 'vitest'
import {
  buildAdminRoundPath,
  buildAdminRoundsPath,
  isAdminRoundsResponse,
} from './adminRoundApi.ts'

describe('administrator round API', () => {
  it('builds encoded player and round paths', () => {
    expect(buildAdminRoundsPath('player/id', 2)).toBe(
      '/api/admin/users/player%2Fid/rounds?page=2&pageSize=10',
    )
    expect(buildAdminRoundPath('round/id')).toBe('/api/admin/rounds/round%2Fid')
  })

  it('validates a paginated round response with all 18 scores', () => {
    const round = {
      id: 'round', userId: 'user', datePlayed: '2026-09-01T00:00:00.000Z',
      timePlayed: null, category: 'CASUAL', participation: 'INDIVIDUAL',
      competitionName: null, competitionFormat: null, numberOfPlayers: null,
      grossScore: 90, adjustedGrossScore: 90, isCapped: false,
      weatherCondition: 'DRY', pccAdjustment: 0, scoreDifferential: 18,
      isAcceptable: true, usedInHandicapCalc: true, scorecardStatus: 'VERIFIED',
      holeScores: Array.from({ length: 18 }, (_, index) => ({
        holeNumber: index + 1, par: 4, strokeIndex: index + 1, strokesTaken: 5,
      })),
      tee: {
        id: 'tee', teeName: 'White', courseRating: 72, slopeRating: 113, par: 72,
        course: { id: 'course', name: 'Course', club: { id: 'club', name: 'Club' } },
      },
    }
    expect(isAdminRoundsResponse({
      player: { id: 'user', name: 'Player', handicapIndex: 18 },
      rounds: [round],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    })).toBe(true)
    expect(isAdminRoundsResponse({
      player: { id: 'user', name: 'Player', handicapIndex: 18 },
      rounds: [{ ...round, tee: null }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    })).toBe(false)
  })
})
