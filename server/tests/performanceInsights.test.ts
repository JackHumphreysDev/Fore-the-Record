import { describe, expect, it } from 'vitest'
import { buildPerformanceInsights, type PerformanceInsightRound } from '../src/performanceInsights.js'

function makeRound(index: number, overrides: Partial<PerformanceInsightRound> = {}): PerformanceInsightRound {
  return {
    id: `round-${index}`, datePlayed: new Date(`2026-09-${String(index).padStart(2, '0')}T00:00:00Z`), createdAt: new Date(`2026-09-${String(index).padStart(2, '0')}T10:00:00Z`), participation: 'INDIVIDUAL', scorecardStatus: 'VERIFIED', scoringFormat: 'STROKE_PLAY', holeCount: 18, grossScore: 101 - index, stablefordPoints: null,
    tee: { id: 'tee', teeName: 'White', course: { id: 'course', name: 'Course', club: { name: 'Club' } }, holes: Array.from({ length: 18 }, (_, hole) => ({ holeNumber: hole + 1, par: 4, strokeIndex: hole + 1, yardage: 400 })) },
    holeScores: Array.from({ length: 18 }, (_, hole) => ({ holeNumber: hole + 1, par: 4, strokesTaken: hole === 0 ? 6 - Math.floor(index / 4) : 5, pickedUp: false })), ...overrides,
  }
}

describe('buildPerformanceInsights', () => {
  it('compares the latest five with the previous five and builds hole history', () => {
    const result = buildPerformanceInsights(Array.from({ length: 10 }, (_, index) => makeRound(index + 1)), 'tee', 1)
    expect(result.strokePlayTrend).toMatchObject({ direction: 'IMPROVING', recentAverage: 93, previousAverage: 98 })
    expect(result.holeExplorer.points).toHaveLength(10)
    expect(result.holeExplorer.direction).toBe('IMPROVING')
    expect(result.bestVenues.strokePlay).toMatchObject({ rounds: 10, teeId: 'tee' })
  })

  it('excludes teams, unverified rounds and picked-up holes from invented scoring', () => {
    const pickup = makeRound(3); pickup.holeScores[0] = { ...pickup.holeScores[0], pickedUp: true }
    const result = buildPerformanceInsights([makeRound(1, { participation: 'TEAM' }), makeRound(2, { scorecardStatus: 'PENDING_REVIEW' }), pickup], 'tee', 1)
    expect(result.qualifyingRounds).toBe(1)
    expect(result.holeExplorer.points[0]).toMatchObject({ strokes: null, pickedUp: true })
    expect(result.holeExplorer.averageStrokes).toBeNull()
  })
})
