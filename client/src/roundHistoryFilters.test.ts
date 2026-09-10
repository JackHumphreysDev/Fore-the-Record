import { describe, expect, it } from 'vitest'
import type { HistoryRound } from './roundRecordValidation.ts'
import {
  EMPTY_ROUND_HISTORY_FILTERS,
  filterRoundHistory,
  hasRoundHistoryFilters,
} from './roundHistoryFilters.ts'

function round(
  id: string,
  overrides: Partial<HistoryRound> = {},
): HistoryRound {
  return {
    id,
    datePlayed: '2026-09-01T00:00:00.000Z',
    timePlayed: null,
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    competitionName: null,
    competitionFormat: null,
    numberOfPlayers: null,
    grossScore: 90,
    adjustedGrossScore: 90,
    isCapped: false,
    scoreDifferential: 18,
    scorecardStatus: 'VERIFIED',
    weatherCondition: 'DRY',
    pccAdjustment: 0,
    isAcceptable: true,
    usedInHandicapCalc: false,
    holeScores: [],
    tee: {
      id: 'tee-' + id,
      teeName: 'White',
      courseRating: 70,
      slopeRating: 125,
      par: 70,
      course: {
        id: 'course-' + id,
        name: 'Old Course',
        club: { id: 'club-' + id, name: 'Example Golf Club' },
      },
    },
    ...overrides,
  }
}

const casual = round('casual')
const competition = round('competition', {
  datePlayed: '2026-09-05T00:00:00.000Z',
  category: 'COMPETITION',
  competitionName: 'Monthly Medal',
  competitionFormat: 'Stroke play',
  numberOfPlayers: 40,
  usedInHandicapCalc: true,
  tee: {
    ...casual.tee,
    id: 'tee-competition',
    course: {
      ...casual.tee.course,
      id: 'course-competition',
      name: 'New Course',
      club: { id: 'club-competition', name: 'Hallamshire Golf Club' },
    },
  },
})
const pending = round('pending', {
  datePlayed: '2026-09-09T00:00:00.000Z',
  scorecardStatus: 'PENDING_REVIEW',
})

describe('round history filters', () => {
  it('returns every round when no filters are active', () => {
    expect(
      filterRoundHistory([casual, competition, pending], EMPTY_ROUND_HISTORY_FILTERS),
    ).toHaveLength(3)
    expect(hasRoundHistoryFilters(EMPTY_ROUND_HISTORY_FILTERS)).toBe(false)
  })

  it('searches club, course, tee, and competition text', () => {
    expect(
      filterRoundHistory([casual, competition], {
        ...EMPTY_ROUND_HISTORY_FILTERS,
        search: 'hallamshire',
      }).map(({ id }) => id),
    ).toEqual(['competition'])
    expect(
      filterRoundHistory([casual, competition], {
        ...EMPTY_ROUND_HISTORY_FILTERS,
        search: 'monthly medal',
      }).map(({ id }) => id),
    ).toEqual(['competition'])
  })

  it('combines round type, counting, status, and date filters', () => {
    const result = filterRoundHistory([casual, competition, pending], {
      ...EMPTY_ROUND_HISTORY_FILTERS,
      roundType: 'INDIVIDUAL_COMPETITION',
      handicapStatus: 'COUNTING',
      scorecardStatus: 'VERIFIED',
      dateFrom: '2026-09-03',
      dateTo: '2026-09-08',
    })

    expect(result.map(({ id }) => id)).toEqual(['competition'])
  })

  it('identifies a changed filter and supports non-counting rounds', () => {
    const filters = {
      ...EMPTY_ROUND_HISTORY_FILTERS,
      handicapStatus: 'NOT_COUNTING' as const,
    }
    expect(hasRoundHistoryFilters(filters)).toBe(true)
    expect(filterRoundHistory([casual, competition], filters)).toEqual([casual])
  })
})
