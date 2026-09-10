import { describe, expect, it } from 'vitest'
import {
  buildFriendSearchPath,
  isFriendsResponse,
  isFriendSearchResponse,
} from './friendsApi.ts'

const player = {
  id: 'player-id',
  name: 'Tiger Woods',
  acceptsFriendRequests: true,
  handicapVisible: true,
  handicapIndex: 1.2,
  homeClub: { id: 'club-id', name: 'Example Golf Club' },
}

describe('friends API contracts', () => {
  it('accepts private friendship and search response shapes', () => {
    const item = {
      id: 'friendship-id',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
      player,
    }
    expect(
      isFriendsResponse({ friends: [item], incoming: [], outgoing: [] }),
    ).toBe(true)
    expect(
      isFriendSearchResponse({
        players: [
          {
            ...player,
            relationship: {
              id: 'friendship-id',
              status: 'PENDING',
              direction: 'OUTGOING',
            },
          },
        ],
      }),
    ).toBe(true)
  })

  it('rejects responses that expose a different shape', () => {
    expect(isFriendsResponse({ friends: [player] })).toBe(false)
    expect(
      isFriendSearchResponse({ players: [{ ...player, relationship: false }] }),
    ).toBe(false)
    expect(
      isFriendSearchResponse({
        players: [
          {
            ...player,
            acceptsFriendRequests: undefined,
            handicapVisible: undefined,
            relationship: null,
          },
        ],
      }),
    ).toBe(false)
  })

  it('encodes name searches safely', () => {
    expect(buildFriendSearchPath(' Jack Humphreys ')).toBe(
      '/api/users/me/friends/search?q=Jack%20Humphreys',
    )
  })
})
