import { describe, expect, it } from 'vitest'
import { isFriendProfileRoundsResponse, isRoundSharesResponse } from './sharedRoundsApi.ts'

describe('shared round API contracts', () => {
  it('accepts an empty sharing response', () => expect(isRoundSharesResponse({ availableRounds: [], shares: [] })).toBe(true))
  it('rejects unsupported directions', () => expect(isRoundSharesResponse({ availableRounds: [], shares: [{ id: 'x', direction: 'PUBLIC', round: { id: 'r', holeScores: [] }, recipient: { name: 'Player' } }] })).toBe(false))
  it('accepts an empty visible friend profile', () => expect(isFriendProfileRoundsResponse({ player: { id: 'friend', name: 'Friend', homeClub: null, handicapIndex: 12.3, handicapVisible: true }, rounds: [] })).toBe(true))
})
