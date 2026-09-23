import { describe, expect, it } from 'vitest'
import {
  buildPlayingPartnersHistory,
  type FriendPartnerRecord,
  type GuestPartnerRecord,
} from '../src/playingPartnersHistory.js'

const currentUser = { id: 'player', name: 'Jack', homeClub: null }
const friend = { id: 'friend', name: 'Tiger', homeClub: { id: 'club-home', name: 'Home Club' } }
function round(id: string, owner = currentUser, date = '2026-09-10'): FriendPartnerRecord['round'] {
  return {
    id,
    userId: owner.id,
    datePlayed: new Date(`${date}T00:00:00.000Z`),
    createdAt: new Date(`${date}T12:00:00.000Z`),
    category: 'SOCIAL_GAME',
    participation: 'INDIVIDUAL',
    scoringFormat: 'STROKE_PLAY',
    holeCount: 18,
    nineHoleSegment: null,
    competitionName: null,
    competitionFormat: null,
    gameFormat: 'Wolf',
    tee: { teeName: 'White', course: { id: 'course', name: 'Main', club: { id: 'club', name: 'Example Club' } } },
    user: owner,
  }
}

describe('buildPlayingPartnersHistory', () => {
  it('combines owned and tagged friend rounds from the player perspective', () => {
    const records: FriendPartnerRecord[] = [
      { userId: friend.id, user: friend, result: 'WON', tagRemovedAt: null, round: round('owned', currentUser, '2026-09-10') },
      { userId: currentUser.id, user: currentUser, result: 'WON', tagRemovedAt: null, round: round('tagged', friend, '2026-09-12') },
    ]
    const result = buildPlayingPartnersHistory(currentUser.id, records, [])
    expect(result.summary).toEqual({ partners: 1, friends: 1, guests: 0, partnerAppearances: 2 })
    expect(result.partners[0]).toMatchObject({
      key: 'friend:friend', name: 'Tiger', roundsPlayed: 2, wins: 1, losses: 1,
      ties: 0, roundsWithoutResult: 0, firstPlayed: '2026-09-10', lastPlayed: '2026-09-12',
    })
    expect(result.partners[0]?.rounds).toEqual([
      expect.objectContaining({ roundId: 'tagged', ownedByPlayer: false, result: 'LOST' }),
      expect.objectContaining({ roundId: 'owned', ownedByPlayer: true, result: 'WON' }),
    ])
  })

  it('groups guests case-insensitively and includes rounds without results', () => {
    const guests: GuestPartnerRecord[] = [
      { name: 'Guest Player', normalizedName: 'guest player', result: null, round: round('one', currentUser, '2026-09-01') },
      { name: 'guest player', normalizedName: 'guest player', result: 'TIED', round: round('two', currentUser, '2026-09-08') },
    ]
    const partner = buildPlayingPartnersHistory(currentUser.id, [], guests).partners[0]!
    expect(partner).toMatchObject({ name: 'Guest Player', roundsPlayed: 2, ties: 1, roundsWithoutResult: 1 })
    expect(partner.courses).toEqual([{ courseId: 'course', clubName: 'Example Club', courseName: 'Main', rounds: 2, lastPlayed: '2026-09-08' }])
    expect(partner.formats).toEqual([{ name: 'Wolf', rounds: 2 }])
  })

  it('hides an incoming tag that the player removed but retains owned history', () => {
    const hidden: FriendPartnerRecord = { userId: currentUser.id, user: currentUser, result: 'LOST', tagRemovedAt: new Date(), round: round('hidden', friend) }
    const owned: FriendPartnerRecord = { userId: friend.id, user: friend, result: null, tagRemovedAt: new Date(), round: round('owned') }
    const result = buildPlayingPartnersHistory(currentUser.id, [hidden, owned], [])
    expect(result.partners).toHaveLength(1)
    expect(result.partners[0]?.rounds.map(({ roundId }) => roundId)).toEqual(['owned'])
  })
})
