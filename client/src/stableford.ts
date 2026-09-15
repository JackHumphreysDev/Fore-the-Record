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
  const points = holes.map((hole) => calculateStablefordPoints(hole, playingHandicap))
  const total = (values: Array<number | null>) =>
    values.length === 9 && values.every((value) => value !== null)
      ? values.reduce<number>((sum, value) => sum + Number(value), 0)
      : null

  return {
    points,
    frontNine: total(points.slice(0, 9)),
    backNine: total(points.slice(9, 18)),
    total:
      points.length === 18 && points.every((value) => value !== null)
        ? points.reduce<number>((sum, value) => sum + Number(value), 0)
        : null,
  }
}
