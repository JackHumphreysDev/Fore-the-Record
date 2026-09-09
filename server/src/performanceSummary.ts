export type PerformanceRound = {
  id: string
  datePlayed: Date
  category: 'CASUAL' | 'COMPETITION'
  participation: 'INDIVIDUAL' | 'TEAM'
  scoreDifferential: number | null
  isAcceptable: boolean
  usedInHandicapCalc: boolean
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
}

export type PerformanceSummary = {
  roundsLogged: number
  scoredRounds: number
  casualRounds: number
  individualCompetitionRounds: number
  teamCompetitionRounds: number
  countingRounds: number
  bestDifferential: number | null
  averageDifferential: number | null
  recentDifferentials: Array<{
    roundId: string
    datePlayed: string
    scoreDifferential: number
    usedInHandicapCalc: boolean
  }>
}

function calculateAverageDifferential(values: readonly number[]): number {
  const totalTenths = values.reduce(
    (total, value) => total + Math.round(value * 10),
    0,
  )

  return Math.round(totalTenths / values.length) / 10
}

export function buildPerformanceSummary(
  rounds: readonly PerformanceRound[],
): PerformanceSummary {
  const officialScoredRounds = rounds.filter(
    (round) =>
      round.participation === 'INDIVIDUAL' &&
      round.isAcceptable &&
      round.scorecardStatus === 'VERIFIED' &&
      round.scoreDifferential !== null,
  )
  const differentials = officialScoredRounds.map(
    (round) => round.scoreDifferential as number,
  )

  return {
    roundsLogged: rounds.length,
    scoredRounds: officialScoredRounds.length,
    casualRounds: rounds.filter((round) => round.category === 'CASUAL')
      .length,
    individualCompetitionRounds: rounds.filter(
      (round) =>
        round.category === 'COMPETITION' &&
        round.participation === 'INDIVIDUAL',
    ).length,
    teamCompetitionRounds: rounds.filter(
      (round) => round.participation === 'TEAM',
    ).length,
    countingRounds: rounds.filter((round) => round.usedInHandicapCalc)
      .length,
    bestDifferential:
      differentials.length === 0 ? null : Math.min(...differentials),
    averageDifferential:
      differentials.length === 0
        ? null
        : calculateAverageDifferential(differentials),
    recentDifferentials: officialScoredRounds.slice(0, 5).map((round) => ({
      roundId: round.id,
      datePlayed: round.datePlayed.toISOString(),
      scoreDifferential: round.scoreDifferential as number,
      usedInHandicapCalc: round.usedInHandicapCalc,
    })),
  }
}
