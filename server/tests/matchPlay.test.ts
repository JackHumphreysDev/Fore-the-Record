import { describe, expect, it } from 'vitest'
import { parseMatchPlay } from '../src/matchPlay.js'

const expected = Array.from({ length: 18 }, (_, index) => index + 1)
const player = expected.map((holeNumber) => ({ holeNumber, strokesTaken: 4, pickedUp: false }))

describe('parseMatchPlay', () => {
  it('calculates an early match from opponent strokes', () => {
    const match = parseMatchPlay(expected.slice(0, 10).map((holeNumber) => ({
      holeNumber,
      opponentStrokes: 5,
      result: 'WON',
    })), expected, player)

    expect(match).toMatchObject({ result: 'WON', finalScore: '10 & 8' })
  })

  it('accepts an early 3 and 2 finish', () => {
    const match = parseMatchPlay(expected.slice(0, 16).map((holeNumber, index) => ({
      holeNumber,
      opponentStrokes: null,
      result: index < 3 ? 'WON' : 'HALVED',
    })), expected, player)

    expect(match).toMatchObject({ result: 'WON', finalScore: '3 & 2' })
  })

  it('accepts a conceded hole but rejects an unfinished match', () => {
    const conceded = expected.slice(0, 16).map((holeNumber, index) => ({
      holeNumber,
      opponentStrokes: null,
      result: index < 3 ? 'LOST' : 'HALVED',
    }))
    expect(parseMatchPlay(conceded, expected, player)).toMatchObject({ result: 'LOST', finalScore: '3 & 2' })
    expect(parseMatchPlay(conceded.slice(0, 10), expected, player)).toBeNull()
  })

  it('rejects a claimed result that conflicts with entered scores', () => {
    const input = expected.map((holeNumber) => ({ holeNumber, opponentStrokes: 5, result: 'LOST' }))
    expect(parseMatchPlay(input, expected, player)).toBeNull()
  })
})
