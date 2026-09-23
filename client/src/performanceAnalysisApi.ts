export type AnalysisAverage = {
  rounds: number
  scoredRounds: number
  averageGrossScore: number | null
  relativeToParRounds: number
  averageToPar: number | null
}

export type AdvancedStatisticMetric =
  | 'PUTTS_PER_HOLE'
  | 'PUTTS_PER_ROUND'
  | 'THREE_PUTT_PERCENTAGE'
  | 'FAIRWAYS_HIT_PERCENTAGE'
  | 'MISSED_LEFT_PERCENTAGE'
  | 'MISSED_RIGHT_PERCENTAGE'
  | 'GIR_PERCENTAGE'
  | 'SCRAMBLING_PERCENTAGE'
  | 'PENALTIES_PER_ROUND'
  | 'BUNKERS_PER_ROUND'

export type AdvancedStatisticTrend = {
  metric: AdvancedStatisticMetric
  label: string
  unit: 'NUMBER' | 'PERCENTAGE'
  lowerIsBetter: boolean
  direction: 'IMPROVING' | 'DECLINING' | 'STEADY' | 'INSUFFICIENT_DATA'
  recentAverage: number | null
  previousAverage: number | null
  change: number | null
  recentRounds: number
  previousRounds: number
  recentObservations: number
  previousObservations: number
}

export type AdvancedStatisticVenue = {
  metric: AdvancedStatisticMetric
  label: string
  unit: 'NUMBER' | 'PERCENTAGE'
  lowerIsBetter: boolean
  results: Array<{
    teeId: string
    teeName: string
    courseName: string
    clubName: string
    value: number
    rounds: number
    observations: number
  }>
}

export type PerformanceAnalysisData = {
  appliedFilters: {
    from: string | null
    to: string | null
    courseId: string | null
    teeId: string | null
    category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME' | null
    holeCount: 9 | 18 | null
  }
  options: {
    courses: Array<{ id: string; name: string; clubName: string }>
    tees: Array<{
      id: string
      name: string
      courseId: string
      courseName: string
      clubName: string
    }>
  }
  overall: AnalysisAverage
  byCourse: Array<AnalysisAverage & {
    courseId: string
    courseName: string
    clubName: string
  }>
  byTee: Array<AnalysisAverage & {
    teeId: string
    teeName: string
    courseName: string
    clubName: string
  }>
  byParType: Array<{
    par: 3 | 4 | 5
    holes: number
    averageStrokes: number | null
    averageToPar: number | null
  }>
  byNine: Array<{
    segment: 'FRONT_NINE' | 'BACK_NINE'
    nines: number
    averageGrossScore: number | null
    averageToPar: number | null
  }>
  byCategory: Array<AnalysisAverage & {
    category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  }>
  detailedStatistics: {
    putts: { holes: number; completeRounds: number; total: number; averagePerHole: number | null; averagePerRound: number | null; threePutts: number; threePuttPercentage: number | null }
    fairways: { holes: number; hits: number; missedLeft: number; missedRight: number; hitPercentage: number | null; missedLeftPercentage: number | null; missedRightPercentage: number | null }
    greens: { holes: number; hits: number; percentage: number | null }
    scrambling: { attempts: number; successful: number; percentage: number | null }
    penalties: { completeRounds: number; total: number; averagePerRound: number | null }
    bunkers: { completeRounds: number; total: number; averagePerRound: number | null }
  }
  advancedInsights: {
    trends: AdvancedStatisticTrend[]
    biggestGain: AdvancedStatisticMetric | null
    focusArea: AdvancedStatisticMetric | null
    greensByPar: Array<{ par: 3 | 4 | 5; holes: number; hits: number; percentage: number | null }>
    venues: AdvancedStatisticVenue[]
  }
}

export type PerformanceAnalysisFilters = {
  from?: string
  to?: string
  courseId?: string
  teeId?: string
  category?: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  holeCount?: 9 | 18
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value)
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isAverage(value: unknown): value is AnalysisAverage {
  return isRecord(value) &&
    isCount(value.rounds) &&
    isCount(value.scoredRounds) &&
    isNullableNumber(value.averageGrossScore) &&
    isCount(value.relativeToParRounds) &&
    isNullableNumber(value.averageToPar)
}

function isCourseOption(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' &&
    typeof value.name === 'string' && typeof value.clubName === 'string'
}

function isTeeOption(value: unknown): boolean {
  return isCourseOption(value) && isRecord(value) &&
    typeof value.courseId === 'string' && typeof value.courseName === 'string'
}

const advancedMetrics: readonly AdvancedStatisticMetric[] = [
  'PUTTS_PER_HOLE',
  'PUTTS_PER_ROUND',
  'THREE_PUTT_PERCENTAGE',
  'FAIRWAYS_HIT_PERCENTAGE',
  'MISSED_LEFT_PERCENTAGE',
  'MISSED_RIGHT_PERCENTAGE',
  'GIR_PERCENTAGE',
  'SCRAMBLING_PERCENTAGE',
  'PENALTIES_PER_ROUND',
  'BUNKERS_PER_ROUND',
]

function isAdvancedMetric(value: unknown): value is AdvancedStatisticMetric {
  return typeof value === 'string' && advancedMetrics.includes(value as AdvancedStatisticMetric)
}

function hasMetricDefinition(value: Record<string, unknown>): boolean {
  return isAdvancedMetric(value.metric) && typeof value.label === 'string' &&
    (value.unit === 'NUMBER' || value.unit === 'PERCENTAGE') &&
    typeof value.lowerIsBetter === 'boolean'
}

function isAdvancedTrend(value: unknown): boolean {
  return isRecord(value) && hasMetricDefinition(value) &&
    (value.direction === 'IMPROVING' || value.direction === 'DECLINING' ||
      value.direction === 'STEADY' || value.direction === 'INSUFFICIENT_DATA') &&
    isNullableNumber(value.recentAverage) && isNullableNumber(value.previousAverage) &&
    isNullableNumber(value.change) && isCount(value.recentRounds) &&
    isCount(value.previousRounds) && isCount(value.recentObservations) &&
    isCount(value.previousObservations)
}

function isAdvancedVenue(value: unknown): boolean {
  return isRecord(value) && hasMetricDefinition(value) && Array.isArray(value.results) &&
    value.results.every((result) => isRecord(result) &&
      typeof result.teeId === 'string' && typeof result.teeName === 'string' &&
      typeof result.courseName === 'string' && typeof result.clubName === 'string' &&
      typeof result.value === 'number' && Number.isFinite(result.value) &&
      isCount(result.rounds) && isCount(result.observations))
}

function isAdvancedInsights(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.trends) ||
    !value.trends.every(isAdvancedTrend) ||
    !(value.biggestGain === null || isAdvancedMetric(value.biggestGain)) ||
    !(value.focusArea === null || isAdvancedMetric(value.focusArea)) ||
    !Array.isArray(value.greensByPar) || !value.greensByPar.every((item) =>
      isRecord(item) && (item.par === 3 || item.par === 4 || item.par === 5) &&
      isCount(item.holes) && isCount(item.hits) && isNullableNumber(item.percentage)) ||
    !Array.isArray(value.venues) || !value.venues.every(isAdvancedVenue)) return false

  const trends = value.trends as Array<Record<string, unknown>>
  const venues = value.venues as Array<Record<string, unknown>>
  return trends.length === advancedMetrics.length &&
    venues.length === advancedMetrics.length &&
    advancedMetrics.every((metric) => trends.some((trend) => trend.metric === metric) &&
      venues.some((venue) => venue.metric === metric))
}

export function isPerformanceAnalysisData(
  value: unknown,
): value is PerformanceAnalysisData {
  if (!isRecord(value) || !isRecord(value.appliedFilters) ||
    !isRecord(value.options) || !isAverage(value.overall)) return false

  const filters = value.appliedFilters
  const nullableString = (item: unknown) => item === null || typeof item === 'string'
  if (!nullableString(filters.from) || !nullableString(filters.to) ||
    !nullableString(filters.courseId) || !nullableString(filters.teeId) ||
    !(filters.category === null || filters.category === 'CASUAL' || filters.category === 'COMPETITION' || filters.category === 'SOCIAL_GAME') ||
    !(filters.holeCount === null || filters.holeCount === 9 || filters.holeCount === 18)) {
    return false
  }

  if (!Array.isArray(value.options.courses) ||
    !value.options.courses.every(isCourseOption) ||
    !Array.isArray(value.options.tees) || !value.options.tees.every(isTeeOption)) {
    return false
  }

  return Array.isArray(value.byCourse) && value.byCourse.every((item) =>
    isRecord(item) && isAverage(item) &&
      typeof (item as Record<string, unknown>).courseId === 'string' &&
      typeof (item as Record<string, unknown>).courseName === 'string' &&
      typeof (item as Record<string, unknown>).clubName === 'string') &&
    Array.isArray(value.byTee) && value.byTee.every((item) =>
      isRecord(item) && isAverage(item) &&
        typeof (item as Record<string, unknown>).teeId === 'string' &&
        typeof (item as Record<string, unknown>).teeName === 'string' &&
        typeof (item as Record<string, unknown>).courseName === 'string' &&
        typeof (item as Record<string, unknown>).clubName === 'string') &&
    Array.isArray(value.byParType) && value.byParType.every((item) =>
      isRecord(item) && (item.par === 3 || item.par === 4 || item.par === 5) &&
        isCount(item.holes) && isNullableNumber(item.averageStrokes) &&
        isNullableNumber(item.averageToPar)) &&
    Array.isArray(value.byNine) && value.byNine.every((item) =>
      isRecord(item) && (item.segment === 'FRONT_NINE' || item.segment === 'BACK_NINE') &&
        isCount(item.nines) && isNullableNumber(item.averageGrossScore) &&
        isNullableNumber(item.averageToPar)) &&
    Array.isArray(value.byCategory) && value.byCategory.every((item) =>
      isRecord(item) && isAverage(item) &&
        ((item as Record<string, unknown>).category === 'CASUAL' ||
          (item as Record<string, unknown>).category === 'COMPETITION' ||
          (item as Record<string, unknown>).category === 'SOCIAL_GAME')) &&
    isRecord(value.detailedStatistics) &&
    isRecord(value.detailedStatistics.putts) && isCount(value.detailedStatistics.putts.holes) && isCount(value.detailedStatistics.putts.completeRounds) && isCount(value.detailedStatistics.putts.total) && isNullableNumber(value.detailedStatistics.putts.averagePerHole) && isNullableNumber(value.detailedStatistics.putts.averagePerRound) && isCount(value.detailedStatistics.putts.threePutts) && isNullableNumber(value.detailedStatistics.putts.threePuttPercentage) &&
    isRecord(value.detailedStatistics.fairways) && isCount(value.detailedStatistics.fairways.holes) && isCount(value.detailedStatistics.fairways.hits) && isCount(value.detailedStatistics.fairways.missedLeft) && isCount(value.detailedStatistics.fairways.missedRight) && isNullableNumber(value.detailedStatistics.fairways.hitPercentage) && isNullableNumber(value.detailedStatistics.fairways.missedLeftPercentage) && isNullableNumber(value.detailedStatistics.fairways.missedRightPercentage) &&
    isRecord(value.detailedStatistics.greens) && isCount(value.detailedStatistics.greens.holes) && isCount(value.detailedStatistics.greens.hits) && isNullableNumber(value.detailedStatistics.greens.percentage) &&
    isRecord(value.detailedStatistics.scrambling) && isCount(value.detailedStatistics.scrambling.attempts) && isCount(value.detailedStatistics.scrambling.successful) && isNullableNumber(value.detailedStatistics.scrambling.percentage) &&
    isRecord(value.detailedStatistics.penalties) && isCount(value.detailedStatistics.penalties.completeRounds) && isCount(value.detailedStatistics.penalties.total) && isNullableNumber(value.detailedStatistics.penalties.averagePerRound) &&
    isRecord(value.detailedStatistics.bunkers) && isCount(value.detailedStatistics.bunkers.completeRounds) && isCount(value.detailedStatistics.bunkers.total) && isNullableNumber(value.detailedStatistics.bunkers.averagePerRound) &&
    isAdvancedInsights(value.advancedInsights)
}

export function buildPerformanceAnalysisPath(
  filters: PerformanceAnalysisFilters,
): string {
  const parameters = new URLSearchParams()
  if (filters.from) parameters.set('from', filters.from)
  if (filters.to) parameters.set('to', filters.to)
  if (filters.courseId) parameters.set('courseId', filters.courseId)
  if (filters.teeId) parameters.set('teeId', filters.teeId)
  if (filters.category) parameters.set('category', filters.category)
  if (filters.holeCount) parameters.set('holeCount', String(filters.holeCount))
  const query = parameters.toString()
  return `/api/users/me/performance-analysis${query ? `?${query}` : ''}`
}
