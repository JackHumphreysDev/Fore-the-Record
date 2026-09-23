import { buildAdvancedStatistics } from './advancedStatistics.js'

export type PerformanceAnalysisCategory = 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
export type PerformanceAnalysisSegment = 'FRONT_NINE' | 'BACK_NINE'

export type PerformanceAnalysisRound = {
  id: string
  datePlayed: Date
  category: PerformanceAnalysisCategory
  participation: 'INDIVIDUAL' | 'TEAM'
  grossScore: number | null
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  holeCount: number
  nineHoleSegment: PerformanceAnalysisSegment | null
  tee: {
    id: string
    teeName: string
    par: number | null
    course: {
      id: string
      name: string
      club: { name: string }
    }
  }
  holeScores: Array<{
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
  }>
}

export type PerformanceAnalysisFilters = {
  from?: string
  to?: string
  courseId?: string
  teeId?: string
  category?: PerformanceAnalysisCategory
  holeCount?: 9 | 18
}

type RoundAverage = {
  rounds: number
  scoredRounds: number
  averageGrossScore: number | null
  relativeToParRounds: number
  averageToPar: number | null
}

type ScoredRound = {
  round: PerformanceAnalysisRound
  grossScore: number | null
  scoreToPar: number | null
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return roundOne(values.reduce((total, value) => total + value, 0) / values.length)
}

function getRoundPar(round: PerformanceAnalysisRound): number | null {
  if (round.holeScores.length === round.holeCount) {
    return round.holeScores.reduce((total, hole) => total + hole.par, 0)
  }

  return round.holeCount === 18 ? round.tee.par : null
}

function toScoredRound(round: PerformanceAnalysisRound): ScoredRound {
  const hasPickup = round.holeScores.some((hole) => hole.pickedUp)
  const grossScore = hasPickup ? null : round.grossScore
  const par = grossScore === null ? null : getRoundPar(round)

  return {
    round,
    grossScore,
    scoreToPar: grossScore === null || par === null ? null : grossScore - par,
  }
}

function summarizeRounds(rounds: readonly ScoredRound[]): RoundAverage {
  const grossScores = rounds.flatMap(({ grossScore }) =>
    grossScore === null ? [] : [grossScore],
  )
  const scoresToPar = rounds.flatMap(({ scoreToPar }) =>
    scoreToPar === null ? [] : [scoreToPar],
  )

  return {
    rounds: rounds.length,
    scoredRounds: grossScores.length,
    averageGrossScore: average(grossScores),
    relativeToParRounds: scoresToPar.length,
    averageToPar: average(scoresToPar),
  }
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function matchesFilters(
  round: PerformanceAnalysisRound,
  filters: PerformanceAnalysisFilters,
): boolean {
  const played = dateKey(round.datePlayed)
  return (
    (!filters.from || played >= filters.from) &&
    (!filters.to || played <= filters.to) &&
    (!filters.courseId || round.tee.course.id === filters.courseId) &&
    (!filters.teeId || round.tee.id === filters.teeId) &&
    (!filters.category || round.category === filters.category) &&
    (!filters.holeCount || round.holeCount === filters.holeCount)
  )
}

function groupBy<Key extends string>(
  rounds: readonly ScoredRound[],
  getKey: (round: ScoredRound) => Key,
): Map<Key, ScoredRound[]> {
  const groups = new Map<Key, ScoredRound[]>()
  for (const round of rounds) {
    const key = getKey(round)
    const group = groups.get(key)
    if (group) group.push(round)
    else groups.set(key, [round])
  }
  return groups
}

export function buildPerformanceAnalysis(
  allRounds: readonly PerformanceAnalysisRound[],
  filters: PerformanceAnalysisFilters = {},
) {
  const eligibleRounds = allRounds.filter(
    (round) =>
      round.participation === 'INDIVIDUAL' &&
      round.scorecardStatus === 'VERIFIED',
  )
  const courses = [...new Map(
    eligibleRounds.map((round) => [
      round.tee.course.id,
      {
        id: round.tee.course.id,
        name: round.tee.course.name,
        clubName: round.tee.course.club.name,
      },
    ]),
  ).values()].sort((left, right) =>
    `${left.clubName} ${left.name}`.localeCompare(`${right.clubName} ${right.name}`),
  )
  const tees = [...new Map(
    eligibleRounds.map((round) => [
      round.tee.id,
      {
        id: round.tee.id,
        name: round.tee.teeName,
        courseId: round.tee.course.id,
        courseName: round.tee.course.name,
        clubName: round.tee.course.club.name,
      },
    ]),
  ).values()].sort((left, right) =>
    `${left.clubName} ${left.courseName} ${left.name}`.localeCompare(
      `${right.clubName} ${right.courseName} ${right.name}`,
    ),
  )
  const rounds = eligibleRounds.filter((round) => matchesFilters(round, filters))
    .map(toScoredRound)
  const byCourse = [...groupBy(rounds, ({ round }) => round.tee.course.id)]
    .map(([, groupedRounds]) => {
      const first = groupedRounds[0]!.round
      return {
        courseId: first.tee.course.id,
        courseName: first.tee.course.name,
        clubName: first.tee.course.club.name,
        ...summarizeRounds(groupedRounds),
      }
    })
    .sort((left, right) => right.rounds - left.rounds || left.clubName.localeCompare(right.clubName))
  const byTee = [...groupBy(rounds, ({ round }) => round.tee.id)]
    .map(([, groupedRounds]) => {
      const first = groupedRounds[0]!.round
      return {
        teeId: first.tee.id,
        teeName: first.tee.teeName,
        courseName: first.tee.course.name,
        clubName: first.tee.course.club.name,
        ...summarizeRounds(groupedRounds),
      }
    })
    .sort((left, right) => right.rounds - left.rounds || left.teeName.localeCompare(right.teeName))

  const holes = rounds.flatMap(({ round }) =>
    round.holeScores.filter((hole) => !hole.pickedUp),
  )
  const byParType = ([3, 4, 5] as const).map((par) => {
    const matchingHoles = holes.filter((hole) => hole.par === par)
    return {
      par,
      holes: matchingHoles.length,
      averageStrokes: average(matchingHoles.map((hole) => hole.strokesTaken)),
      averageToPar: average(
        matchingHoles.map((hole) => hole.strokesTaken - hole.par),
      ),
    }
  })

  const nineScores: Record<PerformanceAnalysisSegment, Array<{ gross: number; toPar: number }>> = {
    FRONT_NINE: [],
    BACK_NINE: [],
  }
  for (const { round } of rounds) {
    for (const segment of ['FRONT_NINE', 'BACK_NINE'] as const) {
      if (round.holeCount === 9 && round.nineHoleSegment !== segment) continue
      const segmentHoles = round.holeScores.filter((hole) =>
        segment === 'FRONT_NINE' ? hole.holeNumber <= 9 : hole.holeNumber >= 10,
      )
      if (segmentHoles.length !== 9 || segmentHoles.some((hole) => hole.pickedUp)) continue
      const gross = segmentHoles.reduce((total, hole) => total + hole.strokesTaken, 0)
      const par = segmentHoles.reduce((total, hole) => total + hole.par, 0)
      nineScores[segment].push({ gross, toPar: gross - par })
    }
  }
  const byNine = (['FRONT_NINE', 'BACK_NINE'] as const).map((segment) => ({
    segment,
    nines: nineScores[segment].length,
    averageGrossScore: average(nineScores[segment].map(({ gross }) => gross)),
    averageToPar: average(nineScores[segment].map(({ toPar }) => toPar)),
  }))
  const byCategory = (['CASUAL', 'COMPETITION', 'SOCIAL_GAME'] as const).map((category) => ({
    category,
    ...summarizeRounds(rounds.filter(({ round }) => round.category === category)),
  }))
  const eligible = rounds.map(({ round }) => round)
  const allHoles = eligible.flatMap((round) => round.holeScores)
  const puttHoles = allHoles.filter((hole) => hole.putts !== null)
  const completePuttRounds = eligible.filter((round) =>
    round.holeScores.length === round.holeCount && round.holeScores.every((hole) => hole.putts !== null),
  )
  const puttTotal = puttHoles.reduce((total, hole) => total + (hole.putts ?? 0), 0)
  const completePuttTotal = completePuttRounds.reduce((total, round) =>
    total + round.holeScores.reduce((roundTotal, hole) => roundTotal + (hole.putts ?? 0), 0), 0)
  const fairways = allHoles.filter((hole) => hole.fairwayResult !== null && hole.fairwayResult !== 'NOT_APPLICABLE')
  const fairwayHits = fairways.filter((hole) => hole.fairwayResult === 'HIT').length
  const fairwayLeft = fairways.filter((hole) => hole.fairwayResult === 'MISSED_LEFT').length
  const fairwayRight = fairways.filter((hole) => hole.fairwayResult === 'MISSED_RIGHT').length
  const greens = allHoles.filter((hole) => hole.greenInRegulation !== null)
  const greensHit = greens.filter((hole) => hole.greenInRegulation).length
  const scrambling = allHoles.filter((hole) => hole.upAndDownResult === 'SUCCESSFUL' || hole.upAndDownResult === 'UNSUCCESSFUL')
  const scramblingSuccesses = scrambling.filter((hole) => hole.upAndDownResult === 'SUCCESSFUL').length
  const completePenaltyRounds = eligible.filter((round) =>
    round.holeScores.length === round.holeCount && round.holeScores.every((hole) => hole.penaltyStrokes !== null),
  )
  const completeBunkerRounds = eligible.filter((round) =>
    round.holeScores.length === round.holeCount && round.holeScores.every((hole) => hole.bunkerVisits !== null),
  )
  const percentage = (part: number, total: number) => total === 0 ? null : roundOne(part / total * 100)

  return {
    appliedFilters: {
      from: filters.from ?? null,
      to: filters.to ?? null,
      courseId: filters.courseId ?? null,
      teeId: filters.teeId ?? null,
      category: filters.category ?? null,
      holeCount: filters.holeCount ?? null,
    },
    options: { courses, tees },
    overall: summarizeRounds(rounds),
    byCourse,
    byTee,
    byParType,
    byNine,
    byCategory,
    detailedStatistics: {
      putts: {
        holes: puttHoles.length,
        completeRounds: completePuttRounds.length,
        total: puttTotal,
        averagePerHole: average(puttHoles.map((hole) => hole.putts ?? 0)),
        averagePerRound: completePuttRounds.length === 0 ? null : roundOne(completePuttTotal / completePuttRounds.length),
        threePutts: puttHoles.filter((hole) => (hole.putts ?? 0) >= 3).length,
        threePuttPercentage: percentage(puttHoles.filter((hole) => (hole.putts ?? 0) >= 3).length, puttHoles.length),
      },
      fairways: { holes: fairways.length, hits: fairwayHits, missedLeft: fairwayLeft, missedRight: fairwayRight, hitPercentage: percentage(fairwayHits, fairways.length), missedLeftPercentage: percentage(fairwayLeft, fairways.length), missedRightPercentage: percentage(fairwayRight, fairways.length) },
      greens: { holes: greens.length, hits: greensHit, percentage: percentage(greensHit, greens.length) },
      scrambling: { attempts: scrambling.length, successful: scramblingSuccesses, percentage: percentage(scramblingSuccesses, scrambling.length) },
      penalties: { completeRounds: completePenaltyRounds.length, total: completePenaltyRounds.reduce((total, round) => total + round.holeScores.reduce((sum, hole) => sum + (hole.penaltyStrokes ?? 0), 0), 0), averagePerRound: completePenaltyRounds.length === 0 ? null : roundOne(completePenaltyRounds.reduce((total, round) => total + round.holeScores.reduce((sum, hole) => sum + (hole.penaltyStrokes ?? 0), 0), 0) / completePenaltyRounds.length) },
      bunkers: { completeRounds: completeBunkerRounds.length, total: completeBunkerRounds.reduce((total, round) => total + round.holeScores.reduce((sum, hole) => sum + (hole.bunkerVisits ?? 0), 0), 0), averagePerRound: completeBunkerRounds.length === 0 ? null : roundOne(completeBunkerRounds.reduce((total, round) => total + round.holeScores.reduce((sum, hole) => sum + (hole.bunkerVisits ?? 0), 0), 0) / completeBunkerRounds.length) },
    },
    advancedInsights: buildAdvancedStatistics(eligible),
  }
}
