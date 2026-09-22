export type InsightScoringFormat = 'STROKE_PLAY' | 'STABLEFORD'

export type PerformanceInsightRound = {
  id: string
  datePlayed: Date
  createdAt: Date
  participation: 'INDIVIDUAL' | 'TEAM'
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  scoringFormat: InsightScoringFormat
  holeCount: number
  grossScore: number | null
  stablefordPoints: number | null
  tee: {
    id: string
    teeName: string
    course: { id: string; name: string; club: { name: string } }
    holes: Array<{ holeNumber: number; par: number; strokeIndex: number; yardage: number | null }>
  }
  holeScores: Array<{ holeNumber: number; par: number; strokesTaken: number; pickedUp: boolean }>
}

type Direction = 'IMPROVING' | 'DECLINING' | 'STEADY' | 'INSUFFICIENT_DATA'

function roundOne(value: number): number { return Math.round(value * 10) / 10 }
function average(values: readonly number[]): number | null { return values.length ? roundOne(values.reduce((sum, value) => sum + value, 0) / values.length) : null }

function trend(values: readonly number[], lowerIsBetter: boolean) {
  const recent = values.slice(-5)
  const previous = values.slice(-10, -5)
  if (recent.length < 5 || previous.length < 5) return { direction: 'INSUFFICIENT_DATA' as Direction, recentAverage: average(recent), previousAverage: average(previous), change: null, recentSample: recent.length, previousSample: previous.length }
  const recentAverage = average(recent)!
  const previousAverage = average(previous)!
  const change = roundOne(recentAverage - previousAverage)
  const adjusted = lowerIsBetter ? change : -change
  const direction: Direction = Math.abs(change) < 0.5 ? 'STEADY' : adjusted < 0 ? 'IMPROVING' : 'DECLINING'
  return { direction, recentAverage, previousAverage, change, recentSample: 5, previousSample: 5 }
}

function linearDirection(values: readonly number[]): Direction {
  if (values.length < 3) return 'INSUFFICIENT_DATA'
  const xAverage = (values.length - 1) / 2
  const yAverage = values.reduce((sum, value) => sum + value, 0) / values.length
  let numerator = 0
  let denominator = 0
  values.forEach((value, index) => { numerator += (index - xAverage) * (value - yAverage); denominator += (index - xAverage) ** 2 })
  const slope = denominator ? numerator / denominator : 0
  return Math.abs(slope) < 0.1 ? 'STEADY' : slope < 0 ? 'IMPROVING' : 'DECLINING'
}

export function buildPerformanceInsights(allRounds: readonly PerformanceInsightRound[], selectedTeeId?: string, selectedHole?: number) {
  const rounds = allRounds.filter((round) => round.participation === 'INDIVIDUAL' && round.scorecardStatus === 'VERIFIED')
    .sort((left, right) => left.datePlayed.getTime() - right.datePlayed.getTime() || left.createdAt.getTime() - right.createdAt.getTime())
  const complete18 = rounds.filter((round) => round.holeCount === 18 && !round.holeScores.some((hole) => hole.pickedUp))
  const strokeScores = complete18.filter((round) => round.scoringFormat === 'STROKE_PLAY' && round.grossScore !== null).map((round) => round.grossScore!)
  const stablefordScores = complete18.filter((round) => round.scoringFormat === 'STABLEFORD' && round.stablefordPoints !== null).map((round) => round.stablefordPoints!)
  const mean = average(strokeScores)
  const deviation = mean === null ? null : roundOne(Math.sqrt(strokeScores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / strokeScores.length))
  const range = strokeScores.length ? { lowest: Math.min(...strokeScores), highest: Math.max(...strokeScores) } : null

  const scoredHoles = rounds.flatMap((round) => round.holeScores.filter((hole) => !hole.pickedUp))
  const parPerformance = ([3, 4, 5] as const).map((par) => {
    const scores = scoredHoles.filter((hole) => hole.par === par).map((hole) => hole.strokesTaken - par)
    return { par, holes: scores.length, averageToPar: average(scores) }
  })
  const ninePerformance = (['FRONT_NINE', 'BACK_NINE'] as const).map((segment) => {
    const values = rounds.flatMap((round) => {
      const holes = round.holeScores.filter((hole) => segment === 'FRONT_NINE' ? hole.holeNumber <= 9 : hole.holeNumber >= 10)
      return holes.length === 9 && holes.every((hole) => !hole.pickedUp) ? [holes.reduce((sum, hole) => sum + hole.strokesTaken - hole.par, 0)] : []
    })
    return { segment, nines: values.length, averageToPar: average(values) }
  })

  type Venue = { teeId: string; teeName: string; courseName: string; clubName: string; rounds: number; average: number }
  const venues = (format: InsightScoringFormat, lowerIsBetter: boolean): Venue | null => {
    const grouped = new Map<string, { round: PerformanceInsightRound; values: number[] }>()
    for (const round of complete18.filter((item) => item.scoringFormat === format)) {
      const value = format === 'STROKE_PLAY' ? round.grossScore : round.stablefordPoints
      if (value === null) continue
      const group = grouped.get(round.tee.id) ?? { round, values: [] }
      group.values.push(value); grouped.set(round.tee.id, group)
    }
    return [...grouped.values()].filter((group) => group.values.length >= 2).map((group) => ({ teeId: group.round.tee.id, teeName: group.round.tee.teeName, courseName: group.round.tee.course.name, clubName: group.round.tee.course.club.name, rounds: group.values.length, average: average(group.values)! }))
      .sort((left, right) => lowerIsBetter ? left.average - right.average : right.average - left.average)[0] ?? null
  }

  const teeOptions = [...new Map(rounds.map((round) => [round.tee.id, { id: round.tee.id, name: round.tee.teeName, courseId: round.tee.course.id, courseName: round.tee.course.name, clubName: round.tee.course.club.name, holes: round.tee.holes }])).values()]
    .sort((left, right) => `${left.clubName} ${left.courseName} ${left.name}`.localeCompare(`${right.clubName} ${right.courseName} ${right.name}`))
  const selectedTee = selectedTeeId ? teeOptions.find((tee) => tee.id === selectedTeeId) : undefined
  const selectedDefinition = selectedTee?.holes.find((hole) => hole.holeNumber === selectedHole)
  const holePoints = !selectedTee || !selectedDefinition ? [] : rounds.filter((round) => round.tee.id === selectedTee.id).flatMap((round) => {
    const hole = round.holeScores.find((score) => score.holeNumber === selectedHole)
    if (!hole) return []
    return [{ roundId: round.id, datePlayed: round.datePlayed.toISOString(), strokes: hole.pickedUp ? null : hole.strokesTaken, pickedUp: hole.pickedUp, toPar: hole.pickedUp ? null : hole.strokesTaken - hole.par }]
  })
  const recordedHoleScores = holePoints.flatMap((point) => point.strokes === null ? [] : [point.strokes])

  return {
    qualifyingRounds: rounds.length,
    strokePlayTrend: trend(strokeScores, true),
    stablefordTrend: trend(stablefordScores, false),
    consistency: { rounds: strokeScores.length, averageGross: mean, standardDeviation: deviation, range, level: deviation === null ? 'INSUFFICIENT_DATA' : deviation <= 3 ? 'CONSISTENT' : deviation <= 6 ? 'MIXED' : 'VARIABLE' },
    parPerformance,
    ninePerformance,
    bestVenues: { strokePlay: venues('STROKE_PLAY', true), stableford: venues('STABLEFORD', false) },
    holeExplorer: { tees: teeOptions, selectedTeeId: selectedTee?.id ?? null, selectedHole: selectedDefinition?.holeNumber ?? null, definition: selectedDefinition ?? null, averageStrokes: average(recordedHoleScores), direction: linearDirection(recordedHoleScores), points: holePoints },
  }
}
