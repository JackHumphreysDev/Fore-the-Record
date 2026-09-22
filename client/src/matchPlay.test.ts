import { describe, expect, it } from 'vitest'
import { buildMatchPlayPreview } from './matchPlay.ts'

const holes = Array.from({ length: 18 }, (_, index) => index + 1)
const scores = new Map(holes.map((hole) => [hole, 4]))

describe('buildMatchPlayPreview', () => {
  it('calculates score-based hole and final results', () => {
    const draft = Object.fromEntries(holes.map((hole, index) => [hole, { opponentStrokes: index < 3 ? '5' : '4', result: '' as const }]))
    expect(buildMatchPlayPreview(holes, scores, draft)).toMatchObject({ result: 'WON', finalScore: '3 & 2' })
  })

  it('supports a manually recorded concession', () => {
    const draft = Object.fromEntries(holes.map((hole, index) => [hole, { opponentStrokes: '', result: index < 3 ? 'LOST' as const : 'HALVED' as const }]))
    expect(buildMatchPlayPreview(holes, scores, draft)).toMatchObject({ result: 'LOST', finalScore: '3 & 2' })
  })
})
