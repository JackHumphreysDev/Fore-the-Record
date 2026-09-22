import type { MatchPlayHole, MatchPlayHoleResult, RoundGameResult } from './roundRecordValidation.ts'

export type MatchPlayDraft = Record<number, { opponentStrokes: string; result: '' | MatchPlayHoleResult }>

export type MatchPlayPreview = {
  holes: MatchPlayHole[]
  result: RoundGameResult
  finalScore: string
}

export function buildMatchPlayPreview(
  holeNumbers: readonly number[],
  playerScores: ReadonlyMap<number, number | null>,
  draft: MatchPlayDraft,
): MatchPlayPreview | null {
  const holes: MatchPlayHole[] = []
  let lead = 0
  for (const holeNumber of holeNumbers) {
    const entry = draft[holeNumber]
    if (!entry || entry.opponentStrokes === '' && entry.result === '') break
    const opponent = entry.opponentStrokes === '' ? null : Number(entry.opponentStrokes)
    if (opponent !== null && (!Number.isInteger(opponent) || opponent <= 0 || opponent > 30)) return null
    const player = playerScores.get(holeNumber) ?? null
    const calculated = opponent !== null && player !== null
      ? player < opponent ? 'WON' : player > opponent ? 'LOST' : 'HALVED'
      : null
    const result = calculated ?? entry.result
    if (!result || calculated && entry.result && entry.result !== calculated) return null
    holes.push({ holeNumber, opponentStrokes: opponent, result })
    lead += result === 'WON' ? 1 : result === 'LOST' ? -1 : 0
    const remaining = holeNumbers.length - holes.length
    if (Math.abs(lead) > remaining) {
      return { holes, result: lead > 0 ? 'WON' : 'LOST', finalScore: `${Math.abs(lead)} & ${remaining}` }
    }
  }
  if (holes.length !== holeNumbers.length) return null
  if (lead === 0) return { holes, result: 'TIED', finalScore: 'All square' }
  return { holes, result: lead > 0 ? 'WON' : 'LOST', finalScore: `${Math.abs(lead)} up` }
}
