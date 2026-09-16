import { describe, expect, it } from 'vitest'
import { parseLogRoundInput } from '../src/rounds.js'

const userId = '11111111-1111-4111-8111-111111111111'
const teeId = '22222222-2222-4222-8222-222222222222'

function frontNine() {
  return Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokeIndex: index + 1,
    strokesTaken: 5,
  }))
}

describe('nine-hole round validation', () => {
  it('accepts a complete front-nine individual round', () => {
    const parsed = parseLogRoundInput({
      userId,
      teeId,
      datePlayed: '2026-09-16',
      category: 'CASUAL',
      participation: 'INDIVIDUAL',
      scoringFormat: 'STROKE_PLAY',
      holeCount: 9,
      nineHoleSegment: 'FRONT_NINE',
      grossScore: 45,
      weatherCondition: 'DRY',
      holeScores: frontNine(),
    })

    expect(parsed).toMatchObject({
      holeCount: 9,
      nineHoleSegment: 'FRONT_NINE',
      grossScore: 45,
    })
  })

  it('rejects a nine-hole card containing a hole from the other segment', () => {
    const mixedHoles = frontNine()
    mixedHoles[8] = { ...mixedHoles[8], holeNumber: 10 }

    expect(parseLogRoundInput({
      userId,
      teeId,
      datePlayed: '2026-09-16',
      category: 'CASUAL',
      participation: 'INDIVIDUAL',
      scoringFormat: 'STROKE_PLAY',
      holeCount: 9,
      nineHoleSegment: 'FRONT_NINE',
      grossScore: 45,
      weatherCondition: 'DRY',
      holeScores: mixedHoles,
    })).toBeNull()
  })
})
