import { calculateHandicap } from './handicap.js'

export type ReviewSeason = 'ALL' | 'WINTER' | 'SPRING' | 'SUMMER' | 'AUTUMN'

export type SeasonReviewRound = {
  id: string
  datePlayed: Date
  createdAt: Date
  participation: 'INDIVIDUAL' | 'TEAM'
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: number
  grossScore: number | null
  stablefordPoints: number | null
  scoreDifferential: number | null
  isAcceptable: boolean
  tee: {
    id: string
    teeName: string
    course: { id: string; name: string; club: { name: string } }
    holes: Array<{ holeNumber: number; yardage: number | null }>
  }
  holeScores: Array<{
    holeNumber: number
    par: number
    strokesTaken: number
    pickedUp: boolean
  }>
}

const MONTHS: Record<Exclude<ReviewSeason, 'ALL'>, readonly number[]> = {
  WINTER: [1, 2, 12],
  SPRING: [3, 4, 5],
  SUMMER: [6, 7, 8],
  AUTUMN: [9, 10, 11],
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function inPeriod(round: SeasonReviewRound, year: number, season: ReviewSeason): boolean {
  return round.datePlayed.getUTCFullYear() === year &&
    (season === 'ALL' || MONTHS[season].includes(round.datePlayed.getUTCMonth() + 1))
}

function handicapOutcomes(rounds: readonly SeasonReviewRound[]) {
  const eligible = rounds.filter((round) => round.isAcceptable && round.scoreDifferential !== null)
    .sort((left, right) => left.datePlayed.getTime() - right.datePlayed.getTime() ||
      left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
  const outcomes: Array<{ date: Date; index: number }> = []
  eligible.forEach((round, index) => {
    const window = eligible.slice(Math.max(0, index - 19), index + 1).map((item) => ({
      id: item.id,
      datePlayed: item.datePlayed,
      scoreDifferential: item.scoreDifferential!,
      isAcceptable: true,
    }))
    const handicapIndex = calculateHandicap(window).handicapIndex
    if (handicapIndex !== null) outcomes.push({ date: round.datePlayed, index: handicapIndex })
  })
  return outcomes
}

function bestRound(
  rounds: readonly SeasonReviewRound[],
  getValue: (round: SeasonReviewRound) => number | null,
  higherIsBetter = false,
) {
  let best: SeasonReviewRound | null = null
  let bestValue: number | null = null
  for (const round of rounds) {
    const value = getValue(round)
    if (value === null) continue
    if (bestValue === null || (higherIsBetter ? value > bestValue : value < bestValue)) {
      best = round
      bestValue = value
    }
  }
  return best && bestValue !== null ? {
    roundId: best.id,
    value: bestValue,
    datePlayed: dateKey(best.datePlayed),
    clubName: best.tee.course.club.name,
    courseName: best.tee.course.name,
    teeName: best.tee.teeName,
  } : null
}

function summarize(
  allRounds: readonly SeasonReviewRound[],
  year: number,
  season: ReviewSeason,
) {
  const rounds = allRounds.filter((round) => inPeriod(round, year, season))
  let holesPlayed = 0
  let totalShots = 0
  let yardsCovered = 0
  let eagles = 0
  let birdies = 0
  let pars = 0
  let bogeys = 0
  const courseCounts = new Map<string, { courseId: string; clubName: string; courseName: string; rounds: number }>()

  for (const round of rounds) {
    const yardage = new Map(round.tee.holes.map((hole) => [hole.holeNumber, hole.yardage]))
    const course = courseCounts.get(round.tee.course.id) ?? {
      courseId: round.tee.course.id,
      clubName: round.tee.course.club.name,
      courseName: round.tee.course.name,
      rounds: 0,
    }
    course.rounds += 1
    courseCounts.set(round.tee.course.id, course)
    for (const hole of round.holeScores) {
      holesPlayed += 1
      yardsCovered += yardage.get(hole.holeNumber) ?? 0
      if (hole.pickedUp) continue
      totalShots += hole.strokesTaken
      const relative = hole.strokesTaken - hole.par
      if (relative <= -2) eagles += 1
      else if (relative === -1) birdies += 1
      else if (relative === 0) pars += 1
      else if (relative === 1) bogeys += 1
    }
  }

  const outcomes = handicapOutcomes(allRounds)
  const periodOutcomes = outcomes.filter(({ date }) => date.getUTCFullYear() === year &&
    (season === 'ALL' || MONTHS[season].includes(date.getUTCMonth() + 1)))
  const periodStart = rounds.length === 0 ? null : [...rounds].sort((a, b) => a.datePlayed.getTime() - b.datePlayed.getTime())[0]!.datePlayed
  const before = periodStart === null ? undefined : outcomes.filter(({ date }) => date < periodStart).at(-1)
  const startingIndex = before?.index ?? periodOutcomes[0]?.index ?? null
  const endingIndex = periodOutcomes.at(-1)?.index ?? startingIndex
  const mostPlayedCourse = [...courseCounts.values()].sort((left, right) =>
    right.rounds - left.rounds || `${left.clubName} ${left.courseName}`.localeCompare(`${right.clubName} ${right.courseName}`),
  )[0] ?? null
  const completeStrokeRounds = rounds.filter((round) => round.holeScores.length === round.holeCount && !round.holeScores.some((hole) => hole.pickedUp))

  return {
    year,
    season,
    roundsPlayed: rounds.length,
    holesPlayed,
    totalShots,
    yardsCovered,
    eagles,
    birdies,
    pars,
    bogeys,
    handicap: {
      startingIndex,
      endingIndex,
      change: startingIndex === null || endingIndex === null ? null : roundOne(endingIndex - startingIndex),
    },
    mostPlayedCourse,
    notableRounds: {
      lowestGross: bestRound(completeStrokeRounds, (round) => round.grossScore),
      highestStableford: bestRound(rounds.filter((round) => round.scoringFormat === 'STABLEFORD'), (round) => round.stablefordPoints, true),
      bestDifferential: bestRound(rounds, (round) => round.scoreDifferential),
    },
  }
}

export function buildSeasonYearReviews(
  inputRounds: readonly SeasonReviewRound[],
  requestedYear?: number,
  season: ReviewSeason = 'ALL',
) {
  const rounds = inputRounds.filter((round) => round.participation === 'INDIVIDUAL' && round.scorecardStatus === 'VERIFIED')
  const years = [...new Set(rounds.map((round) => round.datePlayed.getUTCFullYear()))].sort((a, b) => b - a)
  const selectedYear = requestedYear ?? years[0] ?? new Date().getUTCFullYear()
  return {
    options: {
      years,
      seasons: [
        { id: 'ALL' as const, name: 'Full year', months: 'January to December' },
        { id: 'WINTER' as const, name: 'Winter', months: 'January, February and December' },
        { id: 'SPRING' as const, name: 'Spring', months: 'March to May' },
        { id: 'SUMMER' as const, name: 'Summer', months: 'June to August' },
        { id: 'AUTUMN' as const, name: 'Autumn', months: 'September to November' },
      ],
    },
    selected: { year: selectedYear, season },
    review: summarize(rounds, selectedYear, season),
    previous: summarize(rounds, selectedYear - 1, season),
  }
}
