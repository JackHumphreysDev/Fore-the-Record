export type RoundComparisonOption = {
  id: string
  datePlayed: string
  courseId: string
  clubName: string
  courseName: string
  teeName: string
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: 9 | 18
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null
}

export type RoundComparisonSummary = RoundComparisonOption & {
  category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  grossScore: number | null
  par: number | null
  scoreToPar: number | null
  stablefordPoints: number | null
  scoreDifferential: number | null
  handicapIndexAfter: number | null
  countedAtTheTime: boolean | null
  frontNine: number | null
  backNine: number | null
}

export type RoundComparisonData = {
  options: RoundComparisonOption[]
  selected: { baselineRoundId: string | null; comparedRoundId: string | null }
  comparison: null | {
    baseline: RoundComparisonSummary
    compared: RoundComparisonSummary
    grossChange: number | null
    stablefordChange: number | null
    gainedHoles: number
    lostHoles: number
    matchedHoles: number
    netStrokeChange: number | null
    holes: Array<{
      holeNumber: number
      baselinePar: number
      comparedPar: number
      baselineStrokes: number | null
      comparedStrokes: number | null
      baselinePickedUp: boolean
      comparedPickedUp: boolean
      change: number | null
      result: 'GAINED' | 'LOST' | 'SAME' | 'UNAVAILABLE'
    }>
    statistics: Array<{
      metric: string
      label: string
      unit: 'NUMBER' | 'PERCENTAGE'
      lowerIsBetter: boolean
      baselineValue: number | null
      comparedValue: number | null
      baselineObservations: number
      comparedObservations: number
      change: number | null
    }>
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value)
}

function count(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function option(value: unknown): value is RoundComparisonOption {
  return record(value) && typeof value.id === 'string' && typeof value.datePlayed === 'string' &&
    typeof value.courseId === 'string' && typeof value.clubName === 'string' &&
    typeof value.courseName === 'string' && typeof value.teeName === 'string' &&
    (value.scoringFormat === 'STROKE_PLAY' || value.scoringFormat === 'STABLEFORD') &&
    (value.holeCount === 9 || value.holeCount === 18) &&
    (value.nineHoleSegment === null || value.nineHoleSegment === 'FRONT_NINE' || value.nineHoleSegment === 'BACK_NINE')
}

function summary(value: unknown): value is RoundComparisonSummary {
  if (!option(value) || !record(value)) return false
  const details = value as Record<string, unknown>
  return (details.category === 'CASUAL' || details.category === 'COMPETITION' || details.category === 'SOCIAL_GAME') &&
    nullableNumber(details.grossScore) && nullableNumber(details.par) && nullableNumber(details.scoreToPar) &&
    nullableNumber(details.stablefordPoints) && nullableNumber(details.scoreDifferential) &&
    nullableNumber(details.handicapIndexAfter) &&
    (details.countedAtTheTime === null || typeof details.countedAtTheTime === 'boolean') &&
    nullableNumber(details.frontNine) && nullableNumber(details.backNine)
}

function hole(value: unknown): boolean {
  return record(value) && count(value.holeNumber) && value.holeNumber >= 1 && value.holeNumber <= 18 &&
    count(value.baselinePar) && count(value.comparedPar) && nullableNumber(value.baselineStrokes) &&
    nullableNumber(value.comparedStrokes) && typeof value.baselinePickedUp === 'boolean' &&
    typeof value.comparedPickedUp === 'boolean' && nullableNumber(value.change) &&
    (value.result === 'GAINED' || value.result === 'LOST' || value.result === 'SAME' || value.result === 'UNAVAILABLE')
}

function statistic(value: unknown): boolean {
  return record(value) && typeof value.metric === 'string' && typeof value.label === 'string' &&
    (value.unit === 'NUMBER' || value.unit === 'PERCENTAGE') && typeof value.lowerIsBetter === 'boolean' &&
    nullableNumber(value.baselineValue) && nullableNumber(value.comparedValue) &&
    count(value.baselineObservations) && count(value.comparedObservations) && nullableNumber(value.change)
}

export function isRoundComparisonData(value: unknown): value is RoundComparisonData {
  if (!record(value) || !Array.isArray(value.options) || !value.options.every(option) ||
    !record(value.selected) ||
    !(value.selected.baselineRoundId === null || typeof value.selected.baselineRoundId === 'string') ||
    !(value.selected.comparedRoundId === null || typeof value.selected.comparedRoundId === 'string')) return false
  if (value.comparison === null) {
    return value.selected.baselineRoundId === null && value.selected.comparedRoundId === null
  }
  if (!record(value.comparison) || !summary(value.comparison.baseline) ||
    !summary(value.comparison.compared) || !nullableNumber(value.comparison.grossChange) ||
    !nullableNumber(value.comparison.stablefordChange) || !count(value.comparison.gainedHoles) ||
    !count(value.comparison.lostHoles) || !count(value.comparison.matchedHoles) ||
    !nullableNumber(value.comparison.netStrokeChange) || !Array.isArray(value.comparison.holes) ||
    !value.comparison.holes.every(hole) || !Array.isArray(value.comparison.statistics) ||
    !value.comparison.statistics.every(statistic)) return false
  return value.selected.baselineRoundId === value.comparison.baseline.id &&
    value.selected.comparedRoundId === value.comparison.compared.id
}

export function buildRoundComparisonPath(baselineRoundId?: string, comparedRoundId?: string): string {
  const query = new URLSearchParams()
  if (baselineRoundId && comparedRoundId) {
    query.set('baselineRoundId', baselineRoundId)
    query.set('comparedRoundId', comparedRoundId)
  }
  const parameters = query.toString()
  return `/api/users/me/round-comparison${parameters ? `?${parameters}` : ''}`
}
