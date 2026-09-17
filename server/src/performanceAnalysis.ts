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
  }>
}

export type PerformanceAnalysisFilters = {
  from?: string
  to?: string
  courseId?: string
  teeId?: string
  category?: PerformanceAnalysisCategory
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
    (!filters.category || round.category === filters.category)
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

  return {
    appliedFilters: {
      from: filters.from ?? null,
      to: filters.to ?? null,
      courseId: filters.courseId ?? null,
      teeId: filters.teeId ?? null,
      category: filters.category ?? null,
    },
    options: { courses, tees },
    overall: summarizeRounds(rounds),
    byCourse,
    byTee,
    byParType,
    byNine,
    byCategory,
  }
}
