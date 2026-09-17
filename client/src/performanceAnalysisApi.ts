export type AnalysisAverage = {
  rounds: number
  scoredRounds: number
  averageGrossScore: number | null
  relativeToParRounds: number
  averageToPar: number | null
}

export type PerformanceAnalysisData = {
  appliedFilters: {
    from: string | null
    to: string | null
    courseId: string | null
    teeId: string | null
    category: 'CASUAL' | 'COMPETITION' | null
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
    category: 'CASUAL' | 'COMPETITION'
  }>
}

export type PerformanceAnalysisFilters = {
  from?: string
  to?: string
  courseId?: string
  teeId?: string
  category?: 'CASUAL' | 'COMPETITION'
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

export function isPerformanceAnalysisData(
  value: unknown,
): value is PerformanceAnalysisData {
  if (!isRecord(value) || !isRecord(value.appliedFilters) ||
    !isRecord(value.options) || !isAverage(value.overall)) return false

  const filters = value.appliedFilters
  const nullableString = (item: unknown) => item === null || typeof item === 'string'
  if (!nullableString(filters.from) || !nullableString(filters.to) ||
    !nullableString(filters.courseId) || !nullableString(filters.teeId) ||
    !(filters.category === null || filters.category === 'CASUAL' || filters.category === 'COMPETITION')) {
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
          (item as Record<string, unknown>).category === 'COMPETITION'))
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
  const query = parameters.toString()
  return `/api/users/me/performance-analysis${query ? `?${query}` : ''}`
}
