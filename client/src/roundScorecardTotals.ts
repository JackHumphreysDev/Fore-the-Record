type HoleScoreValue = {
  holeNumber: number
  strokesTaken: number | string
}

export type RoundScoreTotals = {
  frontNine: number | null
  backNine: number | null
  total: number | null
}

function totalForHoles(
  holes: readonly HoleScoreValue[],
  from: number,
  to: number,
): number | null {
  const scores = holes
    .filter((hole) => hole.holeNumber >= from && hole.holeNumber <= to)
    .map((hole) => Number(hole.strokesTaken))
    .filter((score) => Number.isInteger(score) && score > 0)

  return scores.length === 0
    ? null
    : scores.reduce((total, score) => total + score, 0)
}

export function calculateRoundScoreTotals(
  holes: readonly HoleScoreValue[],
): RoundScoreTotals {
  const frontNine = totalForHoles(holes, 1, 9)
  const backNine = totalForHoles(holes, 10, 18)

  return {
    frontNine,
    backNine,
    total:
      frontNine === null && backNine === null
        ? null
        : (frontNine ?? 0) + (backNine ?? 0),
  }
}
