import { describe, expect, it } from 'vitest'
import { parseLogRoundInput } from '../src/rounds.js'

const base = {
  userId: '11111111-1111-4111-8111-111111111111',
  teeId: '22222222-2222-4222-8222-222222222222',
  datePlayed: '2026-09-17',
  category: 'SOCIAL_GAME',
  participation: 'INDIVIDUAL',
  scoringFormat: 'STROKE_PLAY',
  holeCount: 18,
  gameFormat: 'Wolf',
  gameResult: 'WON',
  numberOfPlayers: 4,
  playingPartnerIds: ['33333333-3333-4333-8333-333333333333'],
  guestPlayerNames: ['Guest Player'],
  grossScore: 90,
  weatherCondition: 'DRY',
  holeScores: Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokeIndex: index + 1,
    strokesTaken: 5,
  })),
}

describe('social game round validation', () => {
  it('accepts a scored game with linked friends and guests', () => {
    expect(parseLogRoundInput(base)).toMatchObject({
      category: 'SOCIAL_GAME', gameFormat: 'Wolf', gameResult: 'WON',
      playingPartnerIds: base.playingPartnerIds, guestPlayerNames: base.guestPlayerNames,
    })
  })

  it('accepts a described Other game and an unrecorded result', () => {
    expect(parseLogRoundInput({ ...base, gameFormat: 'Other — Roll-up', gameResult: undefined })).toMatchObject({
      gameFormat: 'Other — Roll-up', gameResult: null,
    })
  })

  it('rejects a social game submitted as a team handicap round', () => {
    expect(parseLogRoundInput({ ...base, participation: 'TEAM' })).toBeNull()
  })

  it('rejects more named partners than the recorded group size', () => {
    expect(parseLogRoundInput({ ...base, numberOfPlayers: 2 })).toBeNull()
  })
})
