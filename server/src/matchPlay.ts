import type { RoundGameResult } from './generated/prisma/enums.js'

export type MatchPlayHoleResult = 'WON' | 'LOST' | 'HALVED'

export type MatchPlayHole = {
  holeNumber: number
  opponentStrokes: number | null
  result: MatchPlayHoleResult
}

export type MatchPlaySummary = {
  holes: MatchPlayHole[]
  result: RoundGameResult
  finalScore: string
}

type PlayerHole = {
  holeNumber: number
  strokesTaken: number | null
  pickedUp: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function resultFromScores(player: number, opponent: number): MatchPlayHoleResult {
  if (player < opponent) return 'WON'
  if (player > opponent) return 'LOST'
  return 'HALVED'
}

export function parseMatchPlay(
  value: unknown,
  expectedHoleNumbers: readonly number[],
  playerHoles: readonly PlayerHole[],
): MatchPlaySummary | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > expectedHoleNumbers.length) return null
  const holes: MatchPlayHole[] = []
  let lead = 0

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index]
    const expectedHole = expectedHoleNumbers[index]
    if (expectedHole === undefined) return null
    if (!isRecord(item) || item.holeNumber !== expectedHole) return null
    const playerHole = playerHoles.find((hole) => hole.holeNumber === expectedHole)
    if (!playerHole) return null
    const opponentStrokes = item.opponentStrokes === null
      ? null
      : Number.isInteger(item.opponentStrokes) && Number(item.opponentStrokes) > 0 && Number(item.opponentStrokes) <= 30
        ? Number(item.opponentStrokes)
        : undefined
    if (opponentStrokes === undefined) return null

    let result: MatchPlayHoleResult | null =
      item.result === 'WON' || item.result === 'LOST' || item.result === 'HALVED'
        ? item.result
        : null
    if (opponentStrokes !== null && !playerHole.pickedUp && playerHole.strokesTaken !== null) {
      const calculated = resultFromScores(playerHole.strokesTaken, opponentStrokes)
      if (result !== null && result !== calculated) return null
      result = calculated
    } else if (result === null || playerHole.pickedUp && result !== 'LOST') {
      return null
    }

    lead += result === 'WON' ? 1 : result === 'LOST' ? -1 : 0
    holes.push({ holeNumber: expectedHole, opponentStrokes, result })
    const remaining = expectedHoleNumbers.length - holes.length
    if (Math.abs(lead) > remaining && holes.length !== value.length) return null
  }

  const remaining = expectedHoleNumbers.length - holes.length
  const complete = remaining === 0
  if (!complete && Math.abs(lead) <= remaining) return null

  if (lead === 0) return { holes, result: 'TIED', finalScore: 'All square' }
  const result: RoundGameResult = lead > 0 ? 'WON' : 'LOST'
  return {
    holes,
    result,
    finalScore: complete ? `${Math.abs(lead)} up` : `${Math.abs(lead)} & ${remaining}`,
  }
}
