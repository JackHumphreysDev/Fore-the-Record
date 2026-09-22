import { describe, expect, it } from 'vitest'
import { buildFriendGroupLeaderboardPath, isFriendGroupLeaderboardResponse, isFriendGroupMessagesResponse, isFriendGroupsResponse, sortFriendGroupStandings } from './friendGroupsApi.ts'

const group = { id: 'group', name: 'Sunday golfers', ownerId: 'one', isOwner: true, createdAt: 'date', updatedAt: 'date', players: [{ id: 'one', name: 'One', homeClub: null, joinedAt: 'date', isOwner: true }] }

describe('friend group API contracts', () => {
  it('accepts complete group and leaderboard responses', () => {
    expect(isFriendGroupsResponse({ groups: [group] })).toBe(true)
    expect(isFriendGroupLeaderboardResponse({ group, period: '90_DAYS', startsOn: '2026-06-25', recentRounds: [], standings: [{ player: { id: 'one', name: 'One', homeClub: null }, roundsPlayed: 2, stablefordPoints: 70, averageGross: 82.5, grossRounds: 2, bestGross: 80, handicapImprovement: 1.2 }] })).toBe(true)
    expect(isFriendGroupMessagesResponse({ messages: [{ id: 'message', groupId: 'group', authorId: 'one', body: 'Great round', createdAt: 'date', canDelete: true, author: { id: 'one', name: 'One', homeClub: null }, round: null }] })).toBe(true)
  })

  it('rejects partial standings and encodes paths', () => {
    expect(isFriendGroupLeaderboardResponse({ group, period: '90_DAYS', startsOn: null, recentRounds: [], standings: [{ player: {} }] })).toBe(false)
    expect(buildFriendGroupLeaderboardPath('a/b', '30_DAYS')).toBe('/api/users/me/friend-groups/a%2Fb/leaderboard?period=30_DAYS')
  })

  it('ranks higher totals first and lower gross scores first', () => {
    const base = { stablefordPoints: 0, averageGross: 90, grossRounds: 1, bestGross: 90, handicapImprovement: 0 }
    const standings = [
      { ...base, player: { id: 'a', name: 'A', homeClub: null }, roundsPlayed: 1 },
      { ...base, player: { id: 'b', name: 'B', homeClub: null }, roundsPlayed: 3, bestGross: 80 },
    ]
    expect(sortFriendGroupStandings(standings, 'ROUNDS_PLAYED')[0].player.id).toBe('b')
    expect(sortFriendGroupStandings(standings, 'BEST_GROSS')[0].player.id).toBe('b')
  })
})
