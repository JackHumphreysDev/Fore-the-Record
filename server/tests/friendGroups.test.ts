import { describe, expect, it } from 'vitest'
import {
  buildFriendGroupStandings,
  friendGroupPeriodStart,
  parseFriendGroupMemberIds,
  parseFriendGroupName,
  parseFriendGroupPeriod,
  parseFriendGroupMessage,
} from '../src/friendGroups.js'

const players = [
  { id: 'one', name: 'One', homeClub: null },
  { id: 'two', name: 'Two', homeClub: { id: 'club', name: 'Club' } },
]

describe('friend groups', () => {
  it('normalizes names and unique members', () => {
    expect(parseFriendGroupName('  Sunday   golfers ')).toBe('Sunday golfers')
    expect(parseFriendGroupMemberIds(['one', 'one', 'two'])).toEqual(['one', 'two'])
    expect(() => parseFriendGroupName('x')).toThrow('between 2 and 80')
    expect(parseFriendGroupMessage('  Great round! ')).toBe('Great round!')
    expect(() => parseFriendGroupMessage('')).toThrow('between 1 and 500')
  })

  it('parses supported periods and calculates inclusive period starts', () => {
    expect(parseFriendGroupPeriod('90_DAYS')).toBe('90_DAYS')
    expect(parseFriendGroupPeriod('WEEK')).toBeNull()
    expect(friendGroupPeriodStart('30_DAYS', new Date('2026-09-22T18:00:00Z'))?.toISOString()).toBe('2026-08-24T00:00:00.000Z')
  })

  it('builds all leaderboard measures from period rounds', () => {
    const standings = buildFriendGroupStandings(players, [
      { id: 'a', userId: 'one', datePlayed: new Date('2026-09-01'), createdAt: new Date('2026-09-01'), grossScore: 90, stablefordPoints: 30, holeCount: 18, scoreDifferential: 18, isAcceptable: true },
      { id: 'b', userId: 'one', datePlayed: new Date('2026-09-10'), createdAt: new Date('2026-09-10'), grossScore: 80, stablefordPoints: 36, holeCount: 18, scoreDifferential: 12, isAcceptable: true },
      { id: 'nine', userId: 'one', datePlayed: new Date('2026-09-12'), createdAt: new Date('2026-09-12'), grossScore: 40, stablefordPoints: 18, holeCount: 9, scoreDifferential: null, isAcceptable: false },
      { id: 'c', userId: 'two', datePlayed: new Date('2026-09-10'), createdAt: new Date('2026-09-10'), grossScore: null, stablefordPoints: null, holeCount: 9, scoreDifferential: null, isAcceptable: false },
    ], new Date('2026-08-01'))

    expect(standings[0]).toMatchObject({ roundsPlayed: 3, stablefordPoints: 84, averageGross: 85, grossRounds: 2, bestGross: 80 })
    expect(standings[1]).toMatchObject({ roundsPlayed: 1, stablefordPoints: 0, averageGross: null, bestGross: null, handicapImprovement: null })
  })
})
