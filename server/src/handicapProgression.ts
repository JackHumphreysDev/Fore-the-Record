import { calculateHandicap } from './handicap.js'

export type HandicapProgressionRound = {
  id: string
  datePlayed: Date
  createdAt: Date
  scoreDifferential: number
  isAcceptable: boolean
  clubName: string
  courseName: string
  teeName: string
}

export type HandicapProgressionPoint = {
  roundId: string
  datePlayed: string
  clubName: string
  courseName: string
  teeName: string
  scoreDifferential: number
  handicapIndex: number
  countedAtTheTime: boolean
}

const MAX_VISIBLE_POINTS = 20
const CALCULATION_WINDOW = 20

export function buildHandicapProgression(
  rounds: readonly HandicapProgressionRound[],
): HandicapProgressionPoint[] {
  const chronologicalRounds = [...rounds]
    .filter((round) => round.isAcceptable)
    .sort(
      (left, right) =>
        left.datePlayed.getTime() - right.datePlayed.getTime() ||
        left.createdAt.getTime() - right.createdAt.getTime() ||
        left.id.localeCompare(right.id),
    )

  const firstVisibleIndex = Math.max(
    chronologicalRounds.length - MAX_VISIBLE_POINTS,
    0,
  )

  return chronologicalRounds.flatMap((round, index) => {
    if (index < firstVisibleIndex) return []

    const window = chronologicalRounds.slice(
      Math.max(0, index - (CALCULATION_WINDOW - 1)),
      index + 1,
    )
    const calculation = calculateHandicap(window)

    if (calculation.handicapIndex === null) return []

    return [
      {
        roundId: round.id,
        datePlayed: round.datePlayed.toISOString(),
        clubName: round.clubName,
        courseName: round.courseName,
        teeName: round.teeName,
        scoreDifferential: round.scoreDifferential,
        handicapIndex: calculation.handicapIndex,
        countedAtTheTime: calculation.usedRoundIds.includes(round.id),
      },
    ]
  })
}
