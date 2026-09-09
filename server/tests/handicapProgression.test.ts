import { describe, expect, it } from 'vitest'
import {
  buildHandicapProgression,
  type HandicapProgressionRound,
} from '../src/handicapProgression.js'

function makeRound(index: number): HandicapProgressionRound {
  return {
    id: String(index),
    datePlayed: new Date(`2026-08-${String(index).padStart(2, '0')}T00:00:00.000Z`),
    createdAt: new Date(`2026-08-${String(index).padStart(2, '0')}T10:00:00.000Z`),
    scoreDifferential: index,
    isAcceptable: true,
    clubName: `Club ${index}`,
    courseName: `Course ${index}`,
    teeName: 'White',
  }
}

describe('buildHandicapProgression', () => {
  it('calculates the Handicap Index after each round chronologically', () => {
    const points = buildHandicapProgression([
      makeRound(3),
      makeRound(1),
      makeRound(2),
    ])

    expect(points.map((point) => point.roundId)).toEqual(['1', '2', '3'])
    expect(points.map((point) => point.handicapIndex)).toEqual([1, 1.5, 2])
    expect(points.every((point) => point.countedAtTheTime)).toBe(true)
  })

  it('excludes unacceptable rounds and keeps only the latest 20 chart points', () => {
    const rounds = Array.from({ length: 25 }, (_, index) => makeRound(index + 1))
    rounds[23] = { ...rounds[23], isAcceptable: false }

    const points = buildHandicapProgression(rounds)

    expect(points).toHaveLength(20)
    expect(points[0].roundId).toBe('5')
    expect(points.some((point) => point.roundId === '24')).toBe(false)
    expect(points.at(-1)?.roundId).toBe('25')
  })

  it('marks a high differential as non-counting at that point', () => {
    const points = buildHandicapProgression(
      Array.from({ length: 9 }, (_, index) => makeRound(index + 1)),
    )

    expect(points.at(-1)).toMatchObject({
      roundId: '9',
      countedAtTheTime: false,
      handicapIndex: 4.5,
    })
  })
})
