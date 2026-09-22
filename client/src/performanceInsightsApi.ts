export type InsightDirection =
  | 'IMPROVING'
  | 'DECLINING'
  | 'STEADY'
  | 'INSUFFICIENT_DATA'

export type InsightTrend = {
  direction: InsightDirection
  recentAverage: number | null
  previousAverage: number | null
  change: number | null
  recentSample: number
  previousSample: number
}

export type PerformanceInsightsData = {
  qualifyingRounds: number
  strokePlayTrend: InsightTrend
  stablefordTrend: InsightTrend
  consistency: {
    rounds: number
    averageGross: number | null
    standardDeviation: number | null
    range: { lowest: number; highest: number } | null
    level: 'CONSISTENT' | 'MIXED' | 'VARIABLE' | 'INSUFFICIENT_DATA'
  }
  parPerformance: Array<{ par: 3 | 4 | 5; holes: number; averageToPar: number | null }>
  ninePerformance: Array<{ segment: 'FRONT_NINE' | 'BACK_NINE'; nines: number; averageToPar: number | null }>
  bestVenues: {
    strokePlay: InsightVenue | null
    stableford: InsightVenue | null
  }
  holeExplorer: {
    tees: InsightTee[]
    selectedTeeId: string | null
    selectedHole: number | null
    definition: InsightHoleDefinition | null
    averageStrokes: number | null
    direction: InsightDirection
    points: InsightHolePoint[]
  }
}

export type InsightVenue = {
  teeId: string
  teeName: string
  courseName: string
  clubName: string
  rounds: number
  average: number
}

export type InsightHoleDefinition = {
  holeNumber: number
  par: number
  strokeIndex: number
  yardage: number | null
}

export type InsightTee = {
  id: string
  name: string
  courseId: string
  courseName: string
  clubName: string
  holes: InsightHoleDefinition[]
}

export type InsightHolePoint = {
  roundId: string
  datePlayed: string
  strokes: number | null
  pickedUp: boolean
  toPar: number | null
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

function isDirection(value: unknown): value is InsightDirection {
  return value === 'IMPROVING' || value === 'DECLINING' || value === 'STEADY' || value === 'INSUFFICIENT_DATA'
}

function isTrend(value: unknown): value is InsightTrend {
  return isRecord(value) && isDirection(value.direction) &&
    isNullableNumber(value.recentAverage) && isNullableNumber(value.previousAverage) &&
    isNullableNumber(value.change) && isCount(value.recentSample) && isCount(value.previousSample)
}

function isHoleDefinition(value: unknown): value is InsightHoleDefinition {
  return isRecord(value) && isCount(value.holeNumber) && isCount(value.par) &&
    isCount(value.strokeIndex) && isNullableNumber(value.yardage)
}

function isTee(value: unknown): value is InsightTee {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' &&
    typeof value.courseId === 'string' && typeof value.courseName === 'string' &&
    typeof value.clubName === 'string' && Array.isArray(value.holes) && value.holes.every(isHoleDefinition)
}

function isVenue(value: unknown): value is InsightVenue | null {
  return value === null || isRecord(value) && typeof value.teeId === 'string' &&
    typeof value.teeName === 'string' && typeof value.courseName === 'string' &&
    typeof value.clubName === 'string' && isCount(value.rounds) && typeof value.average === 'number'
}

export function isPerformanceInsightsData(value: unknown): value is PerformanceInsightsData {
  if (!isRecord(value) || !isCount(value.qualifyingRounds) || !isTrend(value.strokePlayTrend) ||
    !isTrend(value.stablefordTrend) || !isRecord(value.consistency) ||
    !isRecord(value.bestVenues) || !isRecord(value.holeExplorer)) return false

  const consistency = value.consistency
  const rangeValid = consistency.range === null || isRecord(consistency.range) &&
    isCount(consistency.range.lowest) && isCount(consistency.range.highest)
  if (!isCount(consistency.rounds) || !isNullableNumber(consistency.averageGross) ||
    !isNullableNumber(consistency.standardDeviation) || !rangeValid ||
    !['CONSISTENT', 'MIXED', 'VARIABLE', 'INSUFFICIENT_DATA'].includes(String(consistency.level))) return false

  const explorer = value.holeExplorer
  return Array.isArray(value.parPerformance) && value.parPerformance.every((item) =>
    isRecord(item) && (item.par === 3 || item.par === 4 || item.par === 5) &&
      isCount(item.holes) && isNullableNumber(item.averageToPar)) &&
    Array.isArray(value.ninePerformance) && value.ninePerformance.every((item) =>
      isRecord(item) && (item.segment === 'FRONT_NINE' || item.segment === 'BACK_NINE') &&
        isCount(item.nines) && isNullableNumber(item.averageToPar)) &&
    isVenue(value.bestVenues.strokePlay) && isVenue(value.bestVenues.stableford) &&
    Array.isArray(explorer.tees) && explorer.tees.every(isTee) &&
    (explorer.selectedTeeId === null || typeof explorer.selectedTeeId === 'string') &&
    (explorer.selectedHole === null || isCount(explorer.selectedHole)) &&
    (explorer.definition === null || isHoleDefinition(explorer.definition)) &&
    isNullableNumber(explorer.averageStrokes) && isDirection(explorer.direction) &&
    Array.isArray(explorer.points) && explorer.points.every((point) =>
      isRecord(point) && typeof point.roundId === 'string' && typeof point.datePlayed === 'string' &&
        isNullableNumber(point.strokes) && typeof point.pickedUp === 'boolean' && isNullableNumber(point.toPar))
}

export function buildPerformanceInsightsPath(teeId?: string, hole?: number): string {
  if (!teeId || hole === undefined) return '/api/users/me/performance-insights'
  const parameters = new URLSearchParams({ teeId, hole: String(hole) })
  return `/api/users/me/performance-insights?${parameters.toString()}`
}
