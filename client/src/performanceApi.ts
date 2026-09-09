export type RecentDifferential = {
  roundId: string
  datePlayed: string
  scoreDifferential: number
  usedInHandicapCalc: boolean
}

export type PerformanceSummaryData = {
  roundsLogged: number
  scoredRounds: number
  casualRounds: number
  individualCompetitionRounds: number
  teamCompetitionRounds: number
  countingRounds: number
  bestDifferential: number | null
  averageDifferential: number | null
  recentDifferentials: RecentDifferential[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isRecentDifferential(value: unknown): value is RecentDifferential {
  return (
    isRecord(value) &&
    typeof value.roundId === 'string' &&
    typeof value.datePlayed === 'string' &&
    !Number.isNaN(Date.parse(value.datePlayed)) &&
    typeof value.scoreDifferential === 'number' &&
    Number.isFinite(value.scoreDifferential) &&
    typeof value.usedInHandicapCalc === 'boolean'
  )
}

export function isPerformanceSummaryData(
  value: unknown,
): value is PerformanceSummaryData {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.roundsLogged) &&
    isNonNegativeInteger(value.scoredRounds) &&
    isNonNegativeInteger(value.casualRounds) &&
    isNonNegativeInteger(value.individualCompetitionRounds) &&
    isNonNegativeInteger(value.teamCompetitionRounds) &&
    isNonNegativeInteger(value.countingRounds) &&
    isNullableFiniteNumber(value.bestDifferential) &&
    isNullableFiniteNumber(value.averageDifferential) &&
    Array.isArray(value.recentDifferentials) &&
    value.recentDifferentials.length <= 5 &&
    value.recentDifferentials.every(isRecentDifferential)
  )
}
