import { calculateHandicap } from './handicap.js'

export type MilestoneRound = {
  id: string
  datePlayed: Date
  createdAt: Date
  category: 'CASUAL' | 'COMPETITION'
  participation: 'INDIVIDUAL' | 'TEAM'
  grossScore: number | null
  scoreDifferential: number | null
  isAcceptable: boolean
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  holeScores: Array<{
    holeNumber: number
    par: number
    strokesTaken: number
  }>
  teeHoles: Array<{
    holeNumber: number
    yardage: number | null
  }>
}

export type ProgressMilestone = {
  id: string
  title: string
  description: string
  achievedAt: string | null
  current: number
  target: number
}

export type PersonalMilestones = {
  totals: {
    holesPlayed: number
    totalShots: number
    yardsCovered: number
    eagles: number
    birdies: number
    pars: number
    bogeys: number
  }
  personalBests: {
    lowestGrossScore: { value: number; achievedAt: string } | null
    lowestDifferential: { value: number; achievedAt: string } | null
    lowestHandicapIndex: { value: number; achievedAt: string } | null
  }
  achievements: ProgressMilestone[]
}

function chronologicalRounds(rounds: readonly MilestoneRound[]) {
  return [...rounds].sort(
    (left, right) =>
      left.datePlayed.getTime() - right.datePlayed.getTime() ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  )
}

function achievedDate(round: MilestoneRound | undefined): string | null {
  return round?.datePlayed.toISOString() ?? null
}

function progressMilestone(
  id: string,
  title: string,
  description: string,
  current: number,
  target: number,
  round: MilestoneRound | undefined,
): ProgressMilestone {
  return {
    id,
    title,
    description,
    achievedAt: achievedDate(round),
    current: Math.max(current, 0),
    target,
  }
}

function findLowest(
  rounds: readonly MilestoneRound[],
  getValue: (round: MilestoneRound) => number | null,
) {
  let result: { value: number; achievedAt: string } | null = null

  for (const round of rounds) {
    const value = getValue(round)
    if (value !== null && (result === null || value < result.value)) {
      result = { value, achievedAt: round.datePlayed.toISOString() }
    }
  }

  return result
}

export function buildPersonalMilestones(
  rounds: readonly MilestoneRound[],
): PersonalMilestones {
  const chronological = chronologicalRounds(rounds)
  const verifiedIndividual = chronological.filter(
    (round) =>
      round.participation === 'INDIVIDUAL' &&
      round.scorecardStatus === 'VERIFIED',
  )
  const handicapRounds = verifiedIndividual.filter(
    (round) => round.isAcceptable && round.scoreDifferential !== null,
  )
  const teeYardages = new Map<string, number>()
  let holesPlayed = 0
  let totalShots = 0
  let yardsCovered = 0
  let eagles = 0
  let birdies = 0
  let pars = 0
  let bogeys = 0

  for (const round of verifiedIndividual) {
    teeYardages.clear()
    for (const hole of round.teeHoles) {
      if (hole.yardage !== null) {
        teeYardages.set(String(hole.holeNumber), hole.yardage)
      }
    }

    for (const hole of round.holeScores) {
      holesPlayed += 1
      totalShots += hole.strokesTaken
      yardsCovered += teeYardages.get(String(hole.holeNumber)) ?? 0

      const scoreToPar = hole.strokesTaken - hole.par
      if (scoreToPar === -2) eagles += 1
      if (scoreToPar === -1) birdies += 1
      if (scoreToPar === 0) pars += 1
      if (scoreToPar === 1) bogeys += 1
    }
  }

  let lowestHandicapIndex: { value: number; achievedAt: string } | null = null
  const accumulatedHandicapRounds: Array<{
    id: string
    datePlayed: Date
    scoreDifferential: number
    isAcceptable: true
  }> = []

  for (const round of handicapRounds) {
    accumulatedHandicapRounds.push({
      id: round.id,
      datePlayed: round.datePlayed,
      scoreDifferential: round.scoreDifferential as number,
      isAcceptable: true,
    })
    const handicapIndex = calculateHandicap(
      accumulatedHandicapRounds,
    ).handicapIndex

    if (
      handicapIndex !== null &&
      (lowestHandicapIndex === null || handicapIndex < lowestHandicapIndex.value)
    ) {
      lowestHandicapIndex = {
        value: handicapIndex,
        achievedAt: round.datePlayed.toISOString(),
      }
    }
  }

  const roundTargets = [1, 5, 10, 20, 50, 100]
  const grossTargets = [100, 90, 80, 70]
  const achievements: ProgressMilestone[] = [
    ...roundTargets.map((target) =>
      progressMilestone(
        `rounds-${target}`,
        target === 1 ? 'First round recorded' : `${target} rounds recorded`,
        target === 1
          ? 'Your playing record has begun.'
          : `Record ${target} rounds in Fore the Record.`,
        chronological.length,
        target,
        chronological[target - 1],
      ),
    ),
    progressMilestone(
      'first-counting-round',
      'First counting round',
      'Record a verified individual round eligible for your Handicap Index.',
      handicapRounds.length > 0 ? 1 : 0,
      1,
      handicapRounds[0],
    ),
    progressMilestone(
      'first-individual-competition',
      'First individual competition',
      'Record a verified individual competition round.',
      verifiedIndividual.some((round) => round.category === 'COMPETITION')
        ? 1
        : 0,
      1,
      verifiedIndividual.find((round) => round.category === 'COMPETITION'),
    ),
    ...grossTargets.map((target) => {
      const qualifyingRound = verifiedIndividual.find(
        (round) =>
          round.holeScores.length === 18 &&
          round.grossScore !== null &&
          round.grossScore < target,
      )
      const lowestGrossScore = findLowest(verifiedIndividual, (round) =>
        round.holeScores.length === 18 ? round.grossScore : null,
      )

      return progressMilestone(
        `gross-below-${target}`,
        `First score below ${target}`,
        `Record a verified 18-hole gross score below ${target}.`,
        lowestGrossScore?.value ?? 0,
        target,
        qualifyingRound,
      )
    }),
  ]

  return {
    totals: {
      holesPlayed,
      totalShots,
      yardsCovered,
      eagles,
      birdies,
      pars,
      bogeys,
    },
    personalBests: {
      lowestGrossScore: findLowest(verifiedIndividual, (round) =>
        round.holeScores.length === 18 ? round.grossScore : null,
      ),
      lowestDifferential: findLowest(handicapRounds, (round) =>
        round.scoreDifferential === null ? null : round.scoreDifferential,
      ),
      lowestHandicapIndex,
    },
    achievements,
  }
}
