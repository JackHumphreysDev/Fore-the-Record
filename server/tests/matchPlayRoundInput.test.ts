import { describe, expect, it } from 'vitest'
import { parseLogRoundInput } from '../src/rounds.js'

const holes = Array.from({ length: 18 }, (_, index) => ({
  holeNumber: index + 1,
  par: 4,
  strokeIndex: index + 1,
  strokesTaken: 4,
  pickedUp: false,
}))

const matchHoles = Array.from({ length: 16 }, (_, index) => ({
  holeNumber: index + 1,
  opponentStrokes: null,
  result: index < 3 ? 'WON' : 'HALVED',
}))

describe('match-play round input', () => {
  it('derives a competition match result and final score from the hole card', () => {
    const parsed = parseLogRoundInput({
      userId: '11111111-1111-4111-8111-111111111111',
      teeId: '22222222-2222-4222-8222-222222222222',
      datePlayed: '2026-09-22',
      timePlayed: '10:00',
      category: 'COMPETITION',
      participation: 'INDIVIDUAL',
      scoringFormat: 'STROKE_PLAY',
      competitionName: 'Club Knockout',
      competitionFormat: 'Match Play',
      numberOfPlayers: 32,
      playingPartnerIds: [],
      guestPlayerNames: ['Alex Player'],
      playingPartnerResults: {},
      guestPlayerResults: { 'Alex Player': null },
      grossScore: 72,
      weatherCondition: 'DRY',
      holeScores: holes,
      matchPlayOpponentName: 'Alex Player',
      matchPlayHoles: matchHoles,
    })

    expect(parsed).toMatchObject({
      gameResult: 'WON',
      matchPlay: {
        opponentName: 'Alex Player',
        result: 'WON',
        finalScore: '3 & 2',
      },
    })
  })

  it('rejects match play without a finished match card', () => {
    const parsed = parseLogRoundInput({
      userId: '11111111-1111-4111-8111-111111111111',
      teeId: '22222222-2222-4222-8222-222222222222',
      datePlayed: '2026-09-22',
      category: 'SOCIAL_GAME',
      participation: 'INDIVIDUAL',
      scoringFormat: 'STROKE_PLAY',
      gameFormat: 'Match Play',
      numberOfPlayers: 2,
      playingPartnerIds: [],
      guestPlayerNames: ['Alex Player'],
      playingPartnerResults: {},
      guestPlayerResults: { 'Alex Player': null },
      grossScore: 72,
      weatherCondition: 'DRY',
      holeScores: holes,
      matchPlayOpponentName: 'Alex Player',
      matchPlayHoles: matchHoles.slice(0, 10),
    })

    expect(parsed).toBeNull()
  })
})
