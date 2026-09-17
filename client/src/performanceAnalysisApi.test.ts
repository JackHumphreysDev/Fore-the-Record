import { describe, expect, it } from 'vitest'
import {
  buildPerformanceAnalysisPath,
  isPerformanceAnalysisData,
} from './performanceAnalysisApi.ts'

const average = {
  rounds: 2,
  scoredRounds: 2,
  averageGrossScore: 81,
  relativeToParRounds: 2,
  averageToPar: 9,
}

const response = {
  appliedFilters: { from: null, to: null, courseId: null, teeId: null, category: null },
  options: {
    courses: [{ id: 'course-1', name: 'Old Course', clubName: 'Example Club' }],
    tees: [{ id: 'tee-1', name: 'White', courseId: 'course-1', courseName: 'Old Course', clubName: 'Example Club' }],
  },
  overall: average,
  byCourse: [{ courseId: 'course-1', courseName: 'Old Course', clubName: 'Example Club', ...average }],
  byTee: [{ teeId: 'tee-1', teeName: 'White', courseName: 'Old Course', clubName: 'Example Club', ...average }],
  byParType: [{ par: 3, holes: 8, averageStrokes: 3.5, averageToPar: 0.5 }],
  byNine: [{ segment: 'FRONT_NINE', nines: 2, averageGrossScore: 40.5, averageToPar: 4.5 }],
  byCategory: [{ category: 'CASUAL', ...average }],
}

describe('performance analysis API helpers', () => {
  it('accepts a complete response and rejects malformed averages', () => {
    expect(isPerformanceAnalysisData(response)).toBe(true)
    expect(isPerformanceAnalysisData({ ...response, overall: { ...average, rounds: -1 } })).toBe(false)
    expect(isPerformanceAnalysisData({ ...response, byParType: [{ par: 6, holes: 1, averageStrokes: 4, averageToPar: -2 }] })).toBe(false)
  })

  it('builds an encoded filtered path', () => {
    expect(buildPerformanceAnalysisPath({
      from: '2026-01-01',
      to: '2026-09-17',
      courseId: 'course id',
      teeId: 'tee/id',
      category: 'COMPETITION',
    })).toBe('/api/users/me/performance-analysis?from=2026-01-01&to=2026-09-17&courseId=course+id&teeId=tee%2Fid&category=COMPETITION')
  })
})
