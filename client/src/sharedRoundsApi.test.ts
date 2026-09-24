import { describe, expect, it } from 'vitest'
import { isFriendProfileRoundsResponse, isRoundSharesResponse } from './sharedRoundsApi.ts'

describe('shared round API contracts', () => {
  const player = { id: 'friend', name: 'Friend', homeClub: null, handicapIndex: 12.3, handicapVisible: true, bio: null, location: null, profileDetailsVisible: true, hasProfileImage: false }
  it('accepts an empty sharing response', () => expect(isRoundSharesResponse({ availableRounds: [], shares: [] })).toBe(true))
  it('rejects unsupported directions', () => expect(isRoundSharesResponse({ availableRounds: [], shares: [{ id: 'x', direction: 'PUBLIC', round: { id: 'r', holeScores: [] }, recipient: { name: 'Player' } }] })).toBe(false))
  it('accepts an empty visible friend profile', () => expect(isFriendProfileRoundsResponse({ player, rounds: [] })).toBe(true))
  it('accepts a friend team competition leaderboard', () => expect(isFriendProfileRoundsResponse({ player, rounds: [{ id: 'round', datePlayed: '2026-09-22', hasScorecardPhoto: false, holeScores: [], teamCompetition: { scoring: 'GROSS_STROKES', teams: [{ name: 'Home', members: ['Friend'], isPlayerTeam: true, holeScores: Array(18).fill(4), frontNine: 36, backNine: 36, total: 72, position: 1 }, { name: 'Away', members: ['Guest'], isPlayerTeam: false, holeScores: Array(18).fill(5), frontNine: 45, backNine: 45, total: 90, position: 2 }] } }] })).toBe(true))
})
