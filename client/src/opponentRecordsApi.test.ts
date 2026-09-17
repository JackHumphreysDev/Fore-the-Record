import { describe, expect, it } from 'vitest'
import { isOpponentRecordsResponse } from './opponentRecordsApi.ts'

describe('opponent record API contracts', () => {
  const response = {
    friends: [{
      id: 'friend-id',
      name: 'Tiger Woods',
      homeClub: { id: 'club-id', name: 'Example Golf Club' },
      wins: 2,
      losses: 1,
      ties: 1,
      played: 4,
    }],
    guests: [{ name: 'Guest Player', wins: 1, losses: 0, ties: 0, played: 1 }],
  }

  it('accepts consistent friend and guest totals', () => {
    expect(isOpponentRecordsResponse(response)).toBe(true)
  })

  it('rejects totals that do not add up to games played', () => {
    expect(isOpponentRecordsResponse({
      ...response,
      guests: [{ ...response.guests[0], played: 2 }],
    })).toBe(false)
  })
})
