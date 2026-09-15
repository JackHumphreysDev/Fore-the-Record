const HOLES_IN_ROUND = 18

export type StablefordHoleInput = {
  par: number
  strokeIndex: number
  strokesTaken: number | null
  pickedUp: boolean
}

export type StablefordHoleResult = StablefordHoleInput & {
  handicapStrokesReceived: number
  netScore: number | null
  points: number
}

function assertPlayingHandicap(playingHandicap: number): void {
  if (!Number.isInteger(playingHandicap) || playingHandicap < -20 || playingHandicap > 54) {
    throw new RangeError('playingHandicap must be an integer from -20 to 54')
  }
}

export function allocatePlayingHandicapStrokes(
  playingHandicap: number,
  strokeIndex: number,
): number {
  assertPlayingHandicap(playingHandicap)

  if (!Number.isInteger(strokeIndex) || strokeIndex < 1 || strokeIndex > HOLES_IN_ROUND) {
    throw new RangeError('strokeIndex must be an integer from 1 to 18')
  }

  return Math.floor((playingHandicap + HOLES_IN_ROUND - strokeIndex) / HOLES_IN_ROUND)
}

export function calculateStablefordHole(
  hole: StablefordHoleInput,
  playingHandicap: number,
): StablefordHoleResult {
  const handicapStrokesReceived = allocatePlayingHandicapStrokes(
    playingHandicap,
    hole.strokeIndex,
  )

  if (hole.pickedUp) {
    return {
      ...hole,
      handicapStrokesReceived,
      netScore: null,
      points: 0,
    }
  }

  if (!Number.isInteger(hole.strokesTaken) || Number(hole.strokesTaken) <= 0) {
    throw new RangeError('strokesTaken must be a positive integer or the hole must be picked up')
  }

  const netScore = Number(hole.strokesTaken) - handicapStrokesReceived

  return {
    ...hole,
    handicapStrokesReceived,
    netScore,
    points: Math.max(0, 2 + hole.par - netScore),
  }
}

export function calculateStablefordRound(
  holes: readonly StablefordHoleInput[],
  playingHandicap: number,
) {
  assertPlayingHandicap(playingHandicap)

  if (holes.length !== HOLES_IN_ROUND) {
    throw new RangeError('A Stableford round must contain 18 holes')
  }

  const scoredHoles = holes.map((hole) =>
    calculateStablefordHole(hole, playingHandicap),
  )

  return {
    holes: scoredHoles,
    frontNinePoints: scoredHoles.slice(0, 9).reduce((sum, hole) => sum + hole.points, 0),
    backNinePoints: scoredHoles.slice(9).reduce((sum, hole) => sum + hole.points, 0),
    totalPoints: scoredHoles.reduce((sum, hole) => sum + hole.points, 0),
  }
}
