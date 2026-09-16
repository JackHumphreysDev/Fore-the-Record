import { describe, expect, it } from 'vitest'
import {
  allocatePlayingHandicapStrokes,
  calculateStablefordHole,
  calculateStablefordRound,
} from '../src/stableford.js'

describe('Stableford scoring', () => {
  it('allocates one stroke to every hole for an 18 playing handicap', () => {
    expect(allocatePlayingHandicapStrokes(18, 1)).toBe(1)
    expect(allocatePlayingHandicapStrokes(18, 18)).toBe(1)
  })

  it('allocates extra strokes in stroke-index order', () => {
    expect(allocatePlayingHandicapStrokes(20, 1)).toBe(2)
    expect(allocatePlayingHandicapStrokes(20, 2)).toBe(2)
    expect(allocatePlayingHandicapStrokes(20, 3)).toBe(1)
  })

  it('supports plus handicaps by giving strokes back from stroke index 18', () => {
    expect(allocatePlayingHandicapStrokes(-2, 16)).toBe(0)
    expect(allocatePlayingHandicapStrokes(-2, 17)).toBe(-1)
    expect(allocatePlayingHandicapStrokes(-2, 18)).toBe(-1)
  })

  it('awards points from the net score', () => {
    expect(calculateStablefordHole({ par: 4, strokeIndex: 1, strokesTaken: 5, pickedUp: false }, 18)).toMatchObject({
      handicapStrokesReceived: 1,
      netScore: 4,
      points: 2,
    })
  })

  it('awards zero points for a picked-up hole', () => {
    expect(calculateStablefordHole({ par: 4, strokeIndex: 1, strokesTaken: null, pickedUp: true }, 18)).toMatchObject({
      netScore: null,
      points: 0,
    })
  })

  it('totals each nine and the full round', () => {
    const result = calculateStablefordRound(
      Array.from({ length: 18 }, (_, index) => ({
        holeNumber: index + 1,
        par: 4,
        strokeIndex: index + 1,
        strokesTaken: index === 0 ? null : 5,
        pickedUp: index === 0,
      })),
      18,
    )

    expect(result.frontNinePoints).toBe(16)
    expect(result.backNinePoints).toBe(18)
    expect(result.totalPoints).toBe(34)
  })

  it('allocates a Playing Handicap across a selected back nine', () => {
    const result = calculateStablefordRound(
      Array.from({ length: 9 }, (_, index) => ({
        holeNumber: index + 10,
        par: 4,
        strokeIndex: (index + 1) * 2,
        strokesTaken: 5,
        pickedUp: false,
      })),
      9,
    )

    expect(result.frontNinePoints).toBeNull()
    expect(result.backNinePoints).toBe(18)
    expect(result.totalPoints).toBe(18)
  })
})
