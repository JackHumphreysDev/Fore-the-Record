const FULL_ROUND_HOLES = 18

export type StablefordHoleInput = {
  holeNumber?: number
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

  if (!Number.isInteger(strokeIndex) || strokeIndex < 1 || strokeIndex > FULL_ROUND_HOLES) {
    throw new RangeError('strokeIndex must be an integer from 1 to 18')
  }

  return Math.floor((playingHandicap + FULL_ROUND_HOLES - strokeIndex) / FULL_ROUND_HOLES)
}

function allocateForCard(
  playingHandicap: number,
  strokeIndexRank: number,
  holeCount: 9 | 18,
): number {
  return Math.floor((playingHandicap + holeCount - strokeIndexRank) / holeCount)
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

  if (holes.length !== 9 && holes.length !== 18) {
    throw new RangeError('A Stableford round must contain 9 or 18 holes')
  }

  const holeCount = holes.length as 9 | 18
  const strokeIndexOrder = [...holes]
    .sort((left, right) => left.strokeIndex - right.strokeIndex)
    .map((hole) => hole)
  const rankByHole = new Map(
    strokeIndexOrder.map((hole, index) => [hole, index + 1]),
  )
  const scoredHoles = holes.map((hole) => {
    const handicapStrokesReceived = allocateForCard(
      playingHandicap,
      rankByHole.get(hole) ?? hole.strokeIndex,
      holeCount,
    )
    const netScore = hole.pickedUp
      ? null
      : Number(hole.strokesTaken) - handicapStrokesReceived

    return {
      ...hole,
      handicapStrokesReceived,
      netScore,
      points: netScore === null ? 0 : Math.max(0, 2 + hole.par - netScore),
    }
  })

  return {
    holes: scoredHoles,
    frontNinePoints: (scoredHoles[0]?.holeNumber ?? 1) <= 9
      ? scoredHoles.slice(0, 9).reduce((sum, hole) => sum + hole.points, 0)
      : null,
    backNinePoints: scoredHoles.some((hole) => (hole.holeNumber ?? 1) >= 10)
      ? scoredHoles.slice(holeCount === 18 ? 9 : 0).reduce((sum, hole) => sum + hole.points, 0)
      : null,
    totalPoints: scoredHoles.reduce((sum, hole) => sum + hole.points, 0),
  }
}
