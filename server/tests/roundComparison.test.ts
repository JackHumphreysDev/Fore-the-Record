import { describe, expect, it } from 'vitest'
import {
  buildRoundComparison,
  RoundComparisonError,
  type RoundComparisonRound,
} from '../src/roundComparison.js'

function holes(strokes: number, overrides: Partial<RoundComparisonRound['holeScores'][number]> = {}) {
  return Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: 4,
    strokesTaken: strokes,
    pickedUp: false,
    putts: 2,
    fairwayResult: 'HIT' as const,
    greenInRegulation: true,
    penaltyStrokes: 0,
    bunkerVisits: 0,
    upAndDownResult: 'NOT_ATTEMPTED' as const,
    ...overrides,
  }))
}

function round(id: string, date: string, strokes: number, overrides: Partial<RoundComparisonRound> = {}): RoundComparisonRound {
  return {
    id,
    datePlayed: new Date(`${date}T00:00:00.000Z`),
    createdAt: new Date(`${date}T12:00:00.000Z`),
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    scoringFormat: 'STROKE_PLAY',
    holeCount: 18,
    nineHoleSegment: null,
    grossScore: strokes * 18,
    stablefordPoints: null,
    scoreDifferential: strokes * 18 - 72,
    isAcceptable: true,
    scorecardStatus: 'VERIFIED',
    tee: {
      id: 'tee-1',
      teeName: 'White',
      course: { id: 'course-1', name: 'Main Course', club: { name: 'Example Golf Club' } },
    },
    holeScores: holes(strokes),
    ...overrides,
  }
}

describe('buildRoundComparison', () => {
  it('automatically compares the latest compatible pair and derives factual changes', () => {
    const baseline = round('baseline', '2026-09-01', 5)
    const compared = round('compared', '2026-09-08', 4, {
      tee: { ...baseline.tee, id: 'tee-2', teeName: 'Yellow' },
      stablefordPoints: 40,
    })
    const result = buildRoundComparison([baseline, compared])

    expect(result.selected).toEqual({ baselineRoundId: 'baseline', comparedRoundId: 'compared' })
    expect(result.comparison).toMatchObject({
      grossChange: -18,
      gainedHoles: 18,
      lostHoles: 0,
      matchedHoles: 18,
      netStrokeChange: -18,
    })
    expect(result.comparison?.baseline).toMatchObject({ grossScore: 90, scoreToPar: 18, frontNine: 45, backNine: 45, handicapIndexAfter: 18 })
    expect(result.comparison?.compared).toMatchObject({ grossScore: 72, scoreToPar: 0, frontNine: 36, backNine: 36, handicapIndexAfter: 9 })
    expect(result.comparison?.holes.every((hole) => hole.result === 'GAINED')).toBe(true)
    expect(result.comparison?.statistics.find(({ metric }) => metric === 'PUTTS')).toMatchObject({ baselineValue: 36, comparedValue: 36, change: 0 })
  })

  it('requires two different verified individual rounds from the same course and layout', () => {
    const baseline = round('baseline', '2026-09-01', 5)
    const otherCourse = round('other', '2026-09-08', 4, {
      tee: { ...baseline.tee, course: { ...baseline.tee.course, id: 'course-2' } },
    })
    expect(() => buildRoundComparison([baseline, otherCourse], baseline.id, otherCourse.id))
      .toThrowError(RoundComparisonError)
    expect(() => buildRoundComparison([baseline], baseline.id, baseline.id))
      .toThrowError('Choose two different rounds')
    const otherNine = round('other-nine', '2026-09-09', 4, {
      holeCount: 9,
      nineHoleSegment: 'BACK_NINE',
      holeScores: holes(4).slice(0, 9).map((hole, index) => ({ ...hole, holeNumber: index + 10 })),
    })
    expect(() => buildRoundComparison([baseline, otherNine], baseline.id, otherNine.id))
      .toThrowError('Choose two different rounds from the same course and hole layout')
    const frontNine = round('front-nine', '2026-09-10', 5, {
      holeCount: 9,
      nineHoleSegment: 'FRONT_NINE',
      holeScores: holes(5).slice(0, 9),
    })
    const misalignedFrontNine = round('misaligned-nine', '2026-09-11', 4, {
      holeCount: 9,
      nineHoleSegment: 'FRONT_NINE',
      holeScores: holes(4).slice(0, 9).map((hole) => ({ ...hole, holeNumber: hole.holeNumber + 1 })),
    })
    expect(() => buildRoundComparison([frontNine, misalignedFrontNine], frontNine.id, misalignedFrontNine.id))
      .toThrowError('Choose two different rounds from the same course and hole layout')
  })

  it('excludes team and unverified rounds from options', () => {
    const result = buildRoundComparison([
      round('verified', '2026-09-01', 5),
      round('team', '2026-09-02', 5, { participation: 'TEAM' }),
      round('pending', '2026-09-03', 5, { scorecardStatus: 'PENDING_REVIEW' }),
    ])
    expect(result.options.map(({ id }) => id)).toEqual(['verified'])
    expect(result.comparison).toBeNull()
  })

  it('keeps pickups and missing optional statistics unavailable instead of inventing values', () => {
    const baseline = round('baseline', '2026-09-01', 5)
    const missingHoles = holes(4, {
      putts: null,
      fairwayResult: null,
      greenInRegulation: null,
      penaltyStrokes: null,
      bunkerVisits: null,
      upAndDownResult: null,
    })
    missingHoles[0] = { ...missingHoles[0]!, pickedUp: true }
    const compared = round('compared', '2026-09-08', 4, { grossScore: null, holeScores: missingHoles })
    const comparison = buildRoundComparison([baseline, compared]).comparison!

    expect(comparison.grossChange).toBeNull()
    expect(comparison.netStrokeChange).toBeNull()
    expect(comparison.holes[0]).toMatchObject({ comparedStrokes: null, change: null, result: 'UNAVAILABLE' })
    expect(comparison.statistics.every(({ comparedValue }) => comparedValue === null)).toBe(true)
  })

  it('compares Stableford only when both rounds use Stableford', () => {
    const baseline = round('baseline', '2026-09-01', 5, { scoringFormat: 'STABLEFORD', stablefordPoints: 30 })
    const compared = round('compared', '2026-09-08', 4, { scoringFormat: 'STABLEFORD', stablefordPoints: 38 })
    expect(buildRoundComparison([baseline, compared]).comparison?.stablefordChange).toBe(8)
    expect(buildRoundComparison([baseline, { ...compared, scoringFormat: 'STROKE_PLAY' }]).comparison?.stablefordChange).toBeNull()
  })
})
