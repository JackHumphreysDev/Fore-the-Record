import { describe, expect, it } from 'vitest'
import {
  buildCoursePersonalBests,
  type CoursePersonalBestRound,
} from '../src/coursePersonalBests.js'

function holes(strokes: number, pickedUpHole?: number) {
  return Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokesTaken: strokes,
    pickedUp: pickedUpHole === index + 1,
  }))
}

function round(overrides: Partial<CoursePersonalBestRound> = {}): CoursePersonalBestRound {
  return {
    id: 'round-1',
    datePlayed: new Date('2026-09-10T00:00:00Z'),
    participation: 'INDIVIDUAL',
    scoringFormat: 'STROKE_PLAY',
    scorecardStatus: 'VERIFIED',
    holeCount: 18,
    nineHoleSegment: null,
    grossScore: 90,
    stablefordPoints: null,
    tee: { id: 'tee-1', teeName: 'White', course: { id: 'course-1', name: 'Main Course', club: { name: 'Example Club' } } },
    holeScores: holes(5),
    ...overrides,
  }
}

describe('buildCoursePersonalBests', () => {
  it('keeps gross, Stableford, nine-hole, and hole records by tee', () => {
    const result = buildCoursePersonalBests([
      round(),
      round({ id: 'round-2', datePlayed: new Date('2026-09-12T00:00:00Z'), grossScore: 72, stablefordPoints: 40, scoringFormat: 'STABLEFORD', holeScores: holes(4) }),
    ])

    expect(result.courses[0]).toMatchObject({
      rounds: 2,
      lowestGross: { score: 72, toPar: 0, datePlayed: '2026-09-12' },
      highestStableford: { score: 40, datePlayed: '2026-09-12' },
      frontNine: { score: 36, toPar: 0 },
      backNine: { score: 36, toPar: 0 },
    })
    expect(result.courses[0]?.holes[0]).toMatchObject({ holeNumber: 1, score: 4, par: 4, toPar: 0 })
  })

  it('uses matching nine-hole cards and keeps the earliest date when a record is tied', () => {
    const front = holes(4).slice(0, 9)
    const result = buildCoursePersonalBests([
      round({ id: 'later', datePlayed: new Date('2026-09-20T00:00:00Z'), holeCount: 9, nineHoleSegment: 'FRONT_NINE', grossScore: 36, holeScores: front }),
      round({ id: 'earlier', datePlayed: new Date('2026-09-01T00:00:00Z'), holeCount: 9, nineHoleSegment: 'FRONT_NINE', grossScore: 36, holeScores: front }),
    ])

    expect(result.courses[0]?.frontNine).toMatchObject({ score: 36, datePlayed: '2026-09-01', roundId: 'earlier' })
    expect(result.courses[0]?.lowestGross).toBeNull()
  })

  it('excludes team and unverified rounds and never uses pickups for stroke records', () => {
    const result = buildCoursePersonalBests([
      round({ id: 'team', participation: 'TEAM' }),
      round({ id: 'pending', scorecardStatus: 'PENDING_REVIEW' }),
      round({ id: 'pickup', scoringFormat: 'STABLEFORD', stablefordPoints: 32, holeScores: holes(5, 1) }),
    ])

    expect(result.courses).toHaveLength(1)
    expect(result.courses[0]).toMatchObject({ lowestGross: null, frontNine: null, highestStableford: { score: 32 } })
    expect(result.courses[0]?.holes.find((hole) => hole.holeNumber === 1)).toBeUndefined()
    expect(result.courses[0]?.backNine).toMatchObject({ score: 45 })
  })
})
