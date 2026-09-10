import type { HistoryRound } from './roundRecordValidation.ts'

export type RoundTypeFilter =
  | 'ALL'
  | 'CASUAL'
  | 'INDIVIDUAL_COMPETITION'
  | 'TEAM_COMPETITION'

export type HandicapStatusFilter = 'ALL' | 'COUNTING' | 'NOT_COUNTING'

export type ScorecardStatusFilter =
  | 'ALL'
  | 'VERIFIED'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'NOT_REQUIRED'

export type RoundHistoryFilters = {
  search: string
  roundType: RoundTypeFilter
  handicapStatus: HandicapStatusFilter
  scorecardStatus: ScorecardStatusFilter
  dateFrom: string
  dateTo: string
}

export const EMPTY_ROUND_HISTORY_FILTERS: RoundHistoryFilters = {
  search: '',
  roundType: 'ALL',
  handicapStatus: 'ALL',
  scorecardStatus: 'ALL',
  dateFrom: '',
  dateTo: '',
}

function normalizedSearch(value: string): string {
  return value.trim().toLocaleLowerCase('en-GB').replace(/\s+/g, ' ')
}

function matchesRoundType(
  round: HistoryRound,
  filter: RoundTypeFilter,
): boolean {
  if (filter === 'ALL') return true
  if (filter === 'CASUAL') return round.category === 'CASUAL'
  if (filter === 'TEAM_COMPETITION') return round.participation === 'TEAM'
  return round.category === 'COMPETITION' && round.participation === 'INDIVIDUAL'
}

export function hasRoundHistoryFilters(filters: RoundHistoryFilters): boolean {
  return Object.entries(filters).some(([key, value]) =>
    key === 'search' ? normalizedSearch(value) !== '' : value !== 'ALL' && value !== '',
  )
}

export function filterRoundHistory(
  rounds: readonly HistoryRound[],
  filters: RoundHistoryFilters,
): HistoryRound[] {
  const search = normalizedSearch(filters.search)

  return rounds.filter((round) => {
    const date = round.datePlayed.slice(0, 10)
    const searchableText = normalizedSearch(
      [
        round.tee.course.club.name,
        round.tee.course.name,
        round.tee.teeName,
        round.competitionName ?? '',
        round.competitionFormat ?? '',
      ].join(' '),
    )

    return (
      (search === '' || searchableText.includes(search)) &&
      matchesRoundType(round, filters.roundType) &&
      (filters.handicapStatus === 'ALL' ||
        (filters.handicapStatus === 'COUNTING'
          ? round.usedInHandicapCalc
          : !round.usedInHandicapCalc)) &&
      (filters.scorecardStatus === 'ALL' ||
        round.scorecardStatus === filters.scorecardStatus) &&
      (filters.dateFrom === '' || date >= filters.dateFrom) &&
      (filters.dateTo === '' || date <= filters.dateTo)
    )
  })
}
