import { describe, expect, it } from 'vitest'
import {
  buildPerformanceAnalysis,
  type PerformanceAnalysisRound,
} from '../src/performanceAnalysis.js'

function holes(strokes = 5) {
  return Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: index % 3 === 0 ? 3 : index % 3 === 1 ? 4 : 5,
    strokesTaken: strokes,
    pickedUp: false,
  }))
}

function round(overrides: Partial<PerformanceAnalysisRound> = {}): PerformanceAnalysisRound {
  return {
    id: 'round-1',
    datePlayed: new Date('2026-09-10T00:00:00.000Z'),
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    grossScore: 90,
    scorecardStatus: 'VERIFIED',
    holeCount: 18,
    nineHoleSegment: null,
    tee: {
      id: 'tee-1',
      teeName: 'White',
      par: 72,
      course: {
        id: 'course-1',
        name: 'Old Course',
        club: { name: 'Example Golf Club' },
      },
    },
    holeScores: holes(),
    ...overrides,
  }
}

describe('buildPerformanceAnalysis', () => {
  it('builds course, tee, par, nine and category averages', () => {
    const result = buildPerformanceAnalysis([
      round(),
      round({
        id: 'round-2',
        datePlayed: new Date('2026-09-12T00:00:00.000Z'),
        category: 'COMPETITION',
        grossScore: 72,
        holeScores: holes(4),
      }),
    ])

    expect(result.overall).toEqual({
      rounds: 2,
      scoredRounds: 2,
      averageGrossScore: 81,
      relativeToParRounds: 2,
      averageToPar: 9,
    })
    expect(result.byCourse[0]).toMatchObject({ rounds: 2, averageGrossScore: 81 })
    expect(result.byTee[0]).toMatchObject({ rounds: 2, teeName: 'White' })
    expect(result.byParType).toEqual([
      { par: 3, holes: 12, averageStrokes: 4.5, averageToPar: 1.5 },
      { par: 4, holes: 12, averageStrokes: 4.5, averageToPar: 0.5 },
      { par: 5, holes: 12, averageStrokes: 4.5, averageToPar: -0.5 },
    ])
    expect(result.byNine).toEqual([
      { segment: 'FRONT_NINE', nines: 2, averageGrossScore: 40.5, averageToPar: 4.5 },
      { segment: 'BACK_NINE', nines: 2, averageGrossScore: 40.5, averageToPar: 4.5 },
    ])
    expect(result.byCategory.map(({ category, rounds }) => ({ category, rounds }))).toEqual([
      { category: 'CASUAL', rounds: 1 },
      { category: 'COMPETITION', rounds: 1 },
      { category: 'SOCIAL_GAME', rounds: 0 },
    ])
  })

  it('filters by date, course, tee and category while retaining filter options', () => {
    const second = round({
      id: 'round-2',
      datePlayed: new Date('2026-08-01T00:00:00.000Z'),
      category: 'COMPETITION',
      tee: {
        id: 'tee-2',
        teeName: 'Yellow',
        par: 70,
        course: {
          id: 'course-2',
          name: 'New Course',
          club: { name: 'Other Golf Club' },
        },
      },
    })
    const result = buildPerformanceAnalysis([round(), second], {
      from: '2026-09-01',
      to: '2026-09-30',
      courseId: 'course-1',
      teeId: 'tee-1',
      category: 'CASUAL',
    })

    expect(result.overall.rounds).toBe(1)
    expect(result.options.courses).toHaveLength(2)
    expect(result.options.tees).toHaveLength(2)
  })

  it('excludes team and unverified rounds and avoids pickup-distorted averages', () => {
    const pickedUpHoles = holes()
    pickedUpHoles[0] = { ...pickedUpHoles[0], pickedUp: true }
    const result = buildPerformanceAnalysis([
      round({ id: 'team', participation: 'TEAM' }),
      round({ id: 'pending', scorecardStatus: 'PENDING_REVIEW' }),
      round({ id: 'pickup', holeScores: pickedUpHoles }),
    ])

    expect(result.overall).toEqual({
      rounds: 1,
      scoredRounds: 0,
      averageGrossScore: null,
      relativeToParRounds: 0,
      averageToPar: null,
    })
    expect(result.byParType.reduce((total, item) => total + item.holes, 0)).toBe(17)
    expect(result.byNine.find(({ segment }) => segment === 'FRONT_NINE')?.nines).toBe(0)
    expect(result.byNine.find(({ segment }) => segment === 'BACK_NINE')?.nines).toBe(1)
  })
})
