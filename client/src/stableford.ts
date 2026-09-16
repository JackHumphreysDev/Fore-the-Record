export type StablefordScoringHole = {
  par: number | string
  strokeIndex: number | string
  strokesTaken: number | string
  pickedUp?: boolean
}

export function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number,
): number {
  return Math.round(handicapIndex * (slopeRating / 113) + courseRating - par)
}

export function allocatePlayingHandicapStrokes(
  playingHandicap: number,
  strokeIndex: number,
): number {
  return Math.floor((playingHandicap + 18 - strokeIndex) / 18)
}

export function calculateStablefordPoints(
  hole: StablefordScoringHole,
  playingHandicap: number,
): number | null {
  if (
    !Number.isInteger(playingHandicap) ||
    playingHandicap < -20 ||
    playingHandicap > 54
  ) {
    return null
  }

  if (hole.pickedUp) return 0

  const par = Number(hole.par)
  const strokeIndex = Number(hole.strokeIndex)
  const strokesTaken = Number(hole.strokesTaken)

  if (
    !Number.isInteger(par) ||
    !Number.isInteger(strokeIndex) ||
    hole.strokesTaken === '' ||
    !Number.isInteger(strokesTaken) ||
    strokesTaken <= 0
  ) {
    return null
  }

  const received = allocatePlayingHandicapStrokes(playingHandicap, strokeIndex)
  return Math.max(0, 2 + par - (strokesTaken - received))
}

export function calculateStablefordTotals(
  holes: readonly StablefordScoringHole[],
  playingHandicap: number,
) {
  const rankedHoles = [...holes]
    .filter((hole) => Number.isInteger(Number(hole.strokeIndex)))
    .sort((left, right) => Number(left.strokeIndex) - Number(right.strokeIndex))
  const rankByHole = new Map(
    rankedHoles.map((hole, index) => [hole, index + 1]),
  )
  const holeCount = holes.length === 9 ? 9 : 18
  const points = holes.map((hole) => {
    const rank = rankByHole.get(hole)
    if (rank === undefined) return null
    const effectiveHandicap = Math.floor(
      (playingHandicap + holeCount - rank) / holeCount,
    )
    if (hole.pickedUp) return 0
    const par = Number(hole.par)
    const strokesTaken = Number(hole.strokesTaken)
    if (
      !Number.isInteger(playingHandicap) || playingHandicap < -20 || playingHandicap > 54 ||
      !Number.isInteger(par) || hole.strokesTaken === '' ||
      !Number.isInteger(strokesTaken) || strokesTaken <= 0
    ) return null
    return Math.max(0, 2 + par - (strokesTaken - effectiveHandicap))
  })
  const total = (values: Array<number | null>) =>
    values.length === 9 && values.every((value) => value !== null)
      ? values.reduce<number>((sum, value) => sum + Number(value), 0)
      : null

  return {
    points,
    frontNine: total(points.slice(0, 9)),
    backNine: points.length === 18 ? total(points.slice(9, 18)) : null,
    total:
      (points.length === 9 || points.length === 18) && points.every((value) => value !== null)
        ? points.reduce<number>((sum, value) => sum + Number(value), 0)
        : null,
  }
}
