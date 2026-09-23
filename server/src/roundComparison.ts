import { calculateHandicap } from './handicap.js'

export type ComparisonHole = {
  holeNumber: number
  par: number
  strokesTaken: number
  pickedUp: boolean
  putts: number | null
  fairwayResult: 'HIT' | 'MISSED_LEFT' | 'MISSED_RIGHT' | 'NOT_APPLICABLE' | null
  greenInRegulation: boolean | null
  penaltyStrokes: number | null
  bunkerVisits: number | null
  upAndDownResult: 'NOT_ATTEMPTED' | 'SUCCESSFUL' | 'UNSUCCESSFUL' | null
}

export type RoundComparisonRound = {
  id: string
  datePlayed: Date
  createdAt: Date
  category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  participation: 'INDIVIDUAL' | 'TEAM'
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: number
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null
  grossScore: number | null
  stablefordPoints: number | null
  scoreDifferential: number | null
  isAcceptable: boolean
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  tee: {
    id: string
    teeName: string
    course: { id: string; name: string; club: { name: string } }
  }
  holeScores: ComparisonHole[]
}

type Statistic = {
  metric: string
  label: string
  unit: 'NUMBER' | 'PERCENTAGE'
  lowerIsBetter: boolean
  baselineValue: number | null
  comparedValue: number | null
  baselineObservations: number
  comparedObservations: number
  change: number | null
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function percentage(part: number, total: number): number | null {
  return total === 0 ? null : roundOne(part / total * 100)
}

function option(round: RoundComparisonRound) {
  return {
    id: round.id,
    datePlayed: round.datePlayed.toISOString().slice(0, 10),
    courseId: round.tee.course.id,
    clubName: round.tee.course.club.name,
    courseName: round.tee.course.name,
    teeName: round.tee.teeName,
    scoringFormat: round.scoringFormat,
    holeCount: round.holeCount as 9 | 18,
    nineHoleSegment: round.nineHoleSegment,
  }
}

function compatible(left: RoundComparisonRound, right: RoundComparisonRound): boolean {
  const leftHoles = left.holeScores.map((hole) => hole.holeNumber).sort((a, b) => a - b)
  const rightHoles = right.holeScores.map((hole) => hole.holeNumber).sort((a, b) => a - b)
  return left.id !== right.id &&
    left.tee.course.id === right.tee.course.id &&
    left.holeCount === right.holeCount &&
    left.nineHoleSegment === right.nineHoleSegment &&
    leftHoles.length === rightHoles.length &&
    leftHoles.every((holeNumber, index) => holeNumber === rightHoles[index])
}

function completeTotal(holes: readonly ComparisonHole[]): number | null {
  return holes.length > 0 && holes.every((hole) => !hole.pickedUp)
    ? holes.reduce((sum, hole) => sum + hole.strokesTaken, 0)
    : null
}

function roundSummary(
  round: RoundComparisonRound,
  handicap: { handicapIndex: number | null; counted: boolean | null },
) {
  const front = round.holeScores.filter((hole) => hole.holeNumber <= 9)
  const back = round.holeScores.filter((hole) => hole.holeNumber >= 10)
  const gross = round.holeScores.some((hole) => hole.pickedUp) ? null : round.grossScore
  const par = round.holeScores.length === round.holeCount
    ? round.holeScores.reduce((sum, hole) => sum + hole.par, 0)
    : null
  return {
    ...option(round),
    category: round.category,
    grossScore: gross,
    par,
    scoreToPar: gross === null || par === null ? null : gross - par,
    stablefordPoints: round.stablefordPoints,
    scoreDifferential: round.scoreDifferential,
    handicapIndexAfter: handicap.handicapIndex,
    countedAtTheTime: handicap.counted,
    frontNine: front.length === 9 ? completeTotal(front) : null,
    backNine: back.length === 9 ? completeTotal(back) : null,
  }
}

function buildStatistics(
  baseline: RoundComparisonRound,
  compared: RoundComparisonRound,
): Statistic[] {
  type Result = { value: number | null; observations: number }
  const statistic = (
    round: RoundComparisonRound,
    metric: string,
  ): Result => {
    const holes = round.holeScores
    if (metric === 'PUTTS') {
      if (holes.length !== round.holeCount || holes.some((hole) => hole.putts === null)) return { value: null, observations: holes.filter((hole) => hole.putts !== null).length }
      return { value: holes.reduce((sum, hole) => sum + (hole.putts ?? 0), 0), observations: holes.length }
    }
    if (metric === 'FAIRWAYS') {
      const recorded = holes.filter((hole) => hole.fairwayResult !== null && hole.fairwayResult !== 'NOT_APPLICABLE')
      return { value: percentage(recorded.filter((hole) => hole.fairwayResult === 'HIT').length, recorded.length), observations: recorded.length }
    }
    if (metric === 'GIR') {
      const recorded = holes.filter((hole) => hole.greenInRegulation !== null)
      return { value: percentage(recorded.filter((hole) => hole.greenInRegulation).length, recorded.length), observations: recorded.length }
    }
    if (metric === 'SCRAMBLING') {
      const recorded = holes.filter((hole) => hole.upAndDownResult === 'SUCCESSFUL' || hole.upAndDownResult === 'UNSUCCESSFUL')
      return { value: percentage(recorded.filter((hole) => hole.upAndDownResult === 'SUCCESSFUL').length, recorded.length), observations: recorded.length }
    }
    const field = metric === 'PENALTIES' ? 'penaltyStrokes' : 'bunkerVisits'
    const recorded = holes.filter((hole) => hole[field] !== null)
    return {
      value: holes.length === round.holeCount && recorded.length === round.holeCount
        ? holes.reduce((sum, hole) => sum + (hole[field] ?? 0), 0)
        : null,
      observations: recorded.length,
    }
  }
  const definitions = [
    { metric: 'PUTTS', label: 'Total putts', unit: 'NUMBER' as const, lowerIsBetter: true },
    { metric: 'FAIRWAYS', label: 'Fairways hit', unit: 'PERCENTAGE' as const, lowerIsBetter: false },
    { metric: 'GIR', label: 'Greens in regulation', unit: 'PERCENTAGE' as const, lowerIsBetter: false },
    { metric: 'SCRAMBLING', label: 'Scrambling', unit: 'PERCENTAGE' as const, lowerIsBetter: false },
    { metric: 'PENALTIES', label: 'Penalty strokes', unit: 'NUMBER' as const, lowerIsBetter: true },
    { metric: 'BUNKERS', label: 'Bunker visits', unit: 'NUMBER' as const, lowerIsBetter: true },
  ]
  return definitions.map((definition) => {
    const left = statistic(baseline, definition.metric)
    const right = statistic(compared, definition.metric)
    return {
      ...definition,
      baselineValue: left.value,
      comparedValue: right.value,
      baselineObservations: left.observations,
      comparedObservations: right.observations,
      change: left.value === null || right.value === null ? null : roundOne(right.value - left.value),
    }
  })
}

function handicapOutcomes(rounds: readonly RoundComparisonRound[]) {
  const eligible = rounds.filter((round) => round.participation === 'INDIVIDUAL' &&
    round.scorecardStatus === 'VERIFIED' && round.isAcceptable && round.scoreDifferential !== null)
    .sort((left, right) => left.datePlayed.getTime() - right.datePlayed.getTime() || left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
  const outcomes = new Map<string, { handicapIndex: number | null; counted: boolean | null }>()
  eligible.forEach((round, index) => {
    const window = eligible.slice(Math.max(0, index - 19), index + 1).map((item) => ({
      id: item.id,
      datePlayed: item.datePlayed,
      scoreDifferential: item.scoreDifferential!,
      isAcceptable: true,
    }))
    const result = calculateHandicap(window)
    outcomes.set(round.id, {
      handicapIndex: result.handicapIndex,
      counted: result.handicapIndex === null ? null : result.usedRoundIds.includes(round.id),
    })
  })
  return outcomes
}

export class RoundComparisonError extends Error {}

export function buildRoundComparison(
  allRounds: readonly RoundComparisonRound[],
  baselineRoundId?: string,
  comparedRoundId?: string,
) {
  const rounds = allRounds.filter((round) => round.participation === 'INDIVIDUAL' &&
    round.scorecardStatus === 'VERIFIED' && (round.holeCount === 9 || round.holeCount === 18) &&
    round.holeScores.length === round.holeCount &&
    new Set(round.holeScores.map((hole) => hole.holeNumber)).size === round.holeCount)
    .sort((left, right) => right.datePlayed.getTime() - left.datePlayed.getTime() || right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id))
  const options = rounds.map(option)
  let baseline = baselineRoundId ? rounds.find((round) => round.id === baselineRoundId) : undefined
  let compared = comparedRoundId ? rounds.find((round) => round.id === comparedRoundId) : undefined

  if ((baselineRoundId && !baseline) || (comparedRoundId && !compared)) {
    throw new RoundComparisonError('Choose rounds from your verified individual record')
  }
  if ((baseline && !compared) || (!baseline && compared)) {
    throw new RoundComparisonError('Choose two rounds to compare')
  }
  if (!baseline && !compared) {
    for (let newerIndex = 0; newerIndex < rounds.length && !baseline; newerIndex += 1) {
      const newer = rounds[newerIndex]!
      const older = rounds.slice(newerIndex + 1).find((candidate) => compatible(candidate, newer))
      if (older) { baseline = older; compared = newer }
    }
  }
  if (!baseline || !compared) {
    return { options, selected: { baselineRoundId: null, comparedRoundId: null }, comparison: null }
  }
  if (!compatible(baseline, compared)) {
    throw new RoundComparisonError('Choose two different rounds from the same course and hole layout')
  }

  const outcomes = handicapOutcomes(allRounds)
  const noOutcome = { handicapIndex: null, counted: null }
  const baselineByHole = new Map(baseline.holeScores.map((hole) => [hole.holeNumber, hole]))
  const holes = compared.holeScores.map((right) => {
    const left = baselineByHole.get(right.holeNumber)!
    const baselineStrokes = left.pickedUp ? null : left.strokesTaken
    const comparedStrokes = right.pickedUp ? null : right.strokesTaken
    const change = baselineStrokes === null || comparedStrokes === null ? null : comparedStrokes - baselineStrokes
    return {
      holeNumber: right.holeNumber,
      baselinePar: left.par,
      comparedPar: right.par,
      baselineStrokes,
      comparedStrokes,
      baselinePickedUp: left.pickedUp,
      comparedPickedUp: right.pickedUp,
      change,
      result: change === null ? 'UNAVAILABLE' as const : change < 0 ? 'GAINED' as const : change > 0 ? 'LOST' as const : 'SAME' as const,
    }
  })
  const scoredChanges = holes.flatMap((hole) => hole.change === null ? [] : [hole.change])
  return {
    options,
    selected: { baselineRoundId: baseline.id, comparedRoundId: compared.id },
    comparison: {
      baseline: roundSummary(baseline, outcomes.get(baseline.id) ?? noOutcome),
      compared: roundSummary(compared, outcomes.get(compared.id) ?? noOutcome),
      grossChange: baseline.grossScore === null || compared.grossScore === null || baseline.holeScores.some((hole) => hole.pickedUp) || compared.holeScores.some((hole) => hole.pickedUp) ? null : compared.grossScore - baseline.grossScore,
      stablefordChange: baseline.scoringFormat === 'STABLEFORD' && compared.scoringFormat === 'STABLEFORD' && baseline.stablefordPoints !== null && compared.stablefordPoints !== null ? compared.stablefordPoints - baseline.stablefordPoints : null,
      gainedHoles: holes.filter((hole) => hole.result === 'GAINED').length,
      lostHoles: holes.filter((hole) => hole.result === 'LOST').length,
      matchedHoles: scoredChanges.length,
      netStrokeChange: scoredChanges.length === holes.length ? scoredChanges.reduce((sum, value) => sum + value, 0) : null,
      holes,
      statistics: buildStatistics(baseline, compared),
    },
  }
}
