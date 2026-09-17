import { describe, expect, it } from 'vitest'
import { isChallengesResponse } from './challengesApi.ts'

describe('challenge API contracts', () => {
  const player = { id: 'player', name: 'Player', homeClub: null }
  const challenge = { id: 'challenge', metric: 'ROUND_COUNT', status: 'ACTIVE', creatorId: 'player', opponentId: 'friend', startsOn: '2026-09-18', endsOn: '2026-10-18', createdAt: '2026-09-18T00:00:00.000Z', creator: player, opponent: { ...player, id: 'friend' }, standings: [{ player, score: 2 }] }
  it('accepts a complete leaderboard', () => expect(isChallengesResponse({ challenges: [challenge] })).toBe(true))
  it('rejects unsupported metrics', () => expect(isChallengesResponse({ challenges: [{ ...challenge, metric: 'MONEY' }] })).toBe(false))
})
