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

export type AdvancedStatisticDirection =
  | 'IMPROVING'
  | 'DECLINING'
  | 'STEADY'
  | 'INSUFFICIENT_DATA'

type StatisticHole = {
  par: number
  putts: number | null
  fairwayResult: 'HIT' | 'MISSED_LEFT' | 'MISSED_RIGHT' | 'NOT_APPLICABLE' | null
  greenInRegulation: boolean | null
  penaltyStrokes: number | null
  bunkerVisits: number | null
  upAndDownResult: 'NOT_ATTEMPTED' | 'SUCCESSFUL' | 'UNSUCCESSFUL' | null
}

export type AdvancedStatisticRound = {
  id: string
  datePlayed: Date
  holeCount: number
  tee: {
    id: string
    teeName: string
    course: { name: string; club: { name: string } }
  }
  holeScores: StatisticHole[]
}

type MetricDefinition = {
  metric: AdvancedStatisticMetric
  label: string
  unit: 'NUMBER' | 'PERCENTAGE'
  lowerIsBetter: boolean
  steadyThreshold: number
}

const METRICS: readonly MetricDefinition[] = [
  { metric: 'PUTTS_PER_HOLE', label: 'Putts per hole', unit: 'NUMBER', lowerIsBetter: true, steadyThreshold: 0.1 },
  { metric: 'PUTTS_PER_ROUND', label: 'Putts per round', unit: 'NUMBER', lowerIsBetter: true, steadyThreshold: 1 },
  { metric: 'THREE_PUTT_PERCENTAGE', label: 'Three-putt frequency', unit: 'PERCENTAGE', lowerIsBetter: true, steadyThreshold: 3 },
  { metric: 'FAIRWAYS_HIT_PERCENTAGE', label: 'Fairways hit', unit: 'PERCENTAGE', lowerIsBetter: false, steadyThreshold: 3 },
  { metric: 'MISSED_LEFT_PERCENTAGE', label: 'Tee shots missed left', unit: 'PERCENTAGE', lowerIsBetter: true, steadyThreshold: 3 },
  { metric: 'MISSED_RIGHT_PERCENTAGE', label: 'Tee shots missed right', unit: 'PERCENTAGE', lowerIsBetter: true, steadyThreshold: 3 },
  { metric: 'GIR_PERCENTAGE', label: 'Greens in regulation', unit: 'PERCENTAGE', lowerIsBetter: false, steadyThreshold: 3 },
  { metric: 'SCRAMBLING_PERCENTAGE', label: 'Scrambling', unit: 'PERCENTAGE', lowerIsBetter: false, steadyThreshold: 3 },
  { metric: 'PENALTIES_PER_ROUND', label: 'Penalties per round', unit: 'NUMBER', lowerIsBetter: true, steadyThreshold: 0.2 },
  { metric: 'BUNKERS_PER_ROUND', label: 'Bunker visits per round', unit: 'NUMBER', lowerIsBetter: true, steadyThreshold: 0.2 },
]

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function percentage(part: number, total: number): number {
  return roundOne(part / total * 100)
}

function average(values: readonly number[]): number {
  return roundOne(values.reduce((sum, value) => sum + value, 0) / values.length)
}

type RoundMetric = { value: number; observations: number }

function roundMetric(
  round: AdvancedStatisticRound,
  metric: AdvancedStatisticMetric,
): RoundMetric | null {
  const holes = round.holeScores
  if (metric === 'PUTTS_PER_ROUND') {
    if (holes.length !== round.holeCount || holes.some((hole) => hole.putts === null)) return null
    return {
      value: holes.reduce((sum, hole) => sum + (hole.putts ?? 0), 0),
      observations: holes.length,
    }
  }
  if (metric === 'PUTTS_PER_HOLE' || metric === 'THREE_PUTT_PERCENTAGE') {
    const recorded = holes.filter((hole) => hole.putts !== null)
    if (recorded.length === 0) return null
    const threePutts = recorded.filter((hole) => (hole.putts ?? 0) >= 3).length
    return {
      value: metric === 'PUTTS_PER_HOLE'
        ? average(recorded.map((hole) => hole.putts ?? 0))
        : percentage(threePutts, recorded.length),
      observations: recorded.length,
    }
  }
  if (metric === 'FAIRWAYS_HIT_PERCENTAGE' || metric === 'MISSED_LEFT_PERCENTAGE' || metric === 'MISSED_RIGHT_PERCENTAGE') {
    const recorded = holes.filter((hole) =>
      hole.fairwayResult !== null && hole.fairwayResult !== 'NOT_APPLICABLE',
    )
    if (recorded.length === 0) return null
    return {
      value: percentage(recorded.filter((hole) => hole.fairwayResult === (
        metric === 'FAIRWAYS_HIT_PERCENTAGE' ? 'HIT' :
          metric === 'MISSED_LEFT_PERCENTAGE' ? 'MISSED_LEFT' : 'MISSED_RIGHT'
      )).length, recorded.length),
      observations: recorded.length,
    }
  }
  if (metric === 'GIR_PERCENTAGE') {
    const recorded = holes.filter((hole) => hole.greenInRegulation !== null)
    if (recorded.length === 0) return null
    return {
      value: percentage(recorded.filter((hole) => hole.greenInRegulation).length, recorded.length),
      observations: recorded.length,
    }
  }
  if (metric === 'SCRAMBLING_PERCENTAGE') {
    const attempts = holes.filter((hole) =>
      hole.upAndDownResult === 'SUCCESSFUL' || hole.upAndDownResult === 'UNSUCCESSFUL',
    )
    if (attempts.length === 0) return null
    return {
      value: percentage(attempts.filter((hole) => hole.upAndDownResult === 'SUCCESSFUL').length, attempts.length),
      observations: attempts.length,
    }
  }
  const field = metric === 'PENALTIES_PER_ROUND' ? 'penaltyStrokes' : 'bunkerVisits'
  if (holes.length !== round.holeCount || holes.some((hole) => hole[field] === null)) return null
  return {
    value: holes.reduce((sum, hole) => sum + (hole[field] ?? 0), 0),
    observations: holes.length,
  }
}

function buildTrend(rounds: readonly AdvancedStatisticRound[], definition: MetricDefinition) {
  const values = rounds.flatMap((round) => {
    const result = roundMetric(round, definition.metric)
    return result ? [{ ...result, roundId: round.id }] : []
  })
  const recent = values.slice(0, 5)
  const previous = values.slice(5, 10)
  const recentAverage = recent.length === 0 ? null : average(recent.map(({ value }) => value))
  const previousAverage = previous.length === 0 ? null : average(previous.map(({ value }) => value))
  const change = recentAverage === null || previousAverage === null
    ? null
    : roundOne(recentAverage - previousAverage)
  let direction: AdvancedStatisticDirection = 'INSUFFICIENT_DATA'
  if (recent.length === 5 && previous.length === 5 && change !== null) {
    if (Math.abs(change) < definition.steadyThreshold) direction = 'STEADY'
    else {
      const improvement = definition.lowerIsBetter ? -change : change
      direction = improvement > 0 ? 'IMPROVING' : 'DECLINING'
    }
  }
  return {
    metric: definition.metric,
    label: definition.label,
    unit: definition.unit,
    lowerIsBetter: definition.lowerIsBetter,
    direction,
    recentAverage,
    previousAverage,
    change,
    recentRounds: recent.length,
    previousRounds: previous.length,
    recentObservations: recent.reduce((sum, item) => sum + item.observations, 0),
    previousObservations: previous.reduce((sum, item) => sum + item.observations, 0),
  }
}

function buildVenueBreakdown(
  rounds: readonly AdvancedStatisticRound[],
  definition: MetricDefinition,
) {
  const grouped = new Map<string, AdvancedStatisticRound[]>()
  for (const round of rounds) {
    const group = grouped.get(round.tee.id)
    if (group) group.push(round)
    else grouped.set(round.tee.id, [round])
  }
  const results = [...grouped.values()].flatMap((group) => {
    const recorded = group.flatMap((round) => {
      const value = roundMetric(round, definition.metric)
      return value ? [value] : []
    })
    if (recorded.length < 2) return []
    const first = group[0]!
    return [{
      teeId: first.tee.id,
      teeName: first.tee.teeName,
      courseName: first.tee.course.name,
      clubName: first.tee.course.club.name,
      value: average(recorded.map((item) => item.value)),
      rounds: recorded.length,
      observations: recorded.reduce((sum, item) => sum + item.observations, 0),
    }]
  }).sort((left, right) =>
    definition.lowerIsBetter ? left.value - right.value : right.value - left.value,
  )
  return {
    metric: definition.metric,
    label: definition.label,
    unit: definition.unit,
    lowerIsBetter: definition.lowerIsBetter,
    results,
  }
}

export function buildAdvancedStatistics(
  sourceRounds: readonly AdvancedStatisticRound[],
) {
  const rounds = [...sourceRounds].sort((left, right) =>
    right.datePlayed.getTime() - left.datePlayed.getTime() || right.id.localeCompare(left.id),
  )
  const trends = METRICS.map((definition) => buildTrend(rounds, definition))
  const rankedTrends = trends.filter((trend) =>
    trend.direction === 'IMPROVING' || trend.direction === 'DECLINING',
  ).map((trend) => {
    const definition = METRICS.find(({ metric }) => metric === trend.metric)!
    const improvement = definition.lowerIsBetter ? -(trend.change ?? 0) : (trend.change ?? 0)
    return { metric: trend.metric, score: improvement / definition.steadyThreshold }
  })
  const biggestGain = [...rankedTrends].sort((left, right) => right.score - left.score)
    .find(({ score }) => score > 0)?.metric ?? null
  const focusArea = [...rankedTrends].sort((left, right) => left.score - right.score)
    .find(({ score }) => score < 0)?.metric ?? null
  const greensByPar = ([3, 4, 5] as const).map((par) => {
    const holes = rounds.flatMap((round) => round.holeScores)
      .filter((hole) => hole.par === par && hole.greenInRegulation !== null)
    const hits = holes.filter((hole) => hole.greenInRegulation).length
    return { par, holes: holes.length, hits, percentage: holes.length === 0 ? null : percentage(hits, holes.length) }
  })

  return {
    trends,
    biggestGain,
    focusArea,
    greensByPar,
    venues: METRICS.map((definition) => buildVenueBreakdown(rounds, definition)),
  }
}
