export type SharedRoundPlayer = { id: string; name: string; homeClub: { id: string; name: string } | null }
export type SharedRound = {
  id: string; datePlayed: string; category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'; participation: 'INDIVIDUAL' | 'TEAM'; scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'; holeCount: number; nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null; grossScore: number | null; stablefordPoints: number | null; scoreDifferential: number | null; gameFormat: string | null; competitionName: string | null; competitionFormat: string | null; user: SharedRoundPlayer; tee: { teeName: string; par: number | null; course: { name: string; club: { name: string } } }; holeScores: Array<{ holeNumber: number; par: number; strokeIndex: number; strokesTaken: number; pickedUp: boolean }>
}
export type RoundSharesResponse = { availableRounds: Array<{ id: string; datePlayed: string; tee: { course: { name: string; club: { name: string } } } }>; shares: Array<{ id: string; direction: 'INCOMING' | 'OUTGOING'; createdAt: string; recipient: SharedRoundPlayer; round: SharedRound }> }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
export function isRoundSharesResponse(value: unknown): value is RoundSharesResponse {
  if (!record(value) || !Array.isArray(value.availableRounds) || !Array.isArray(value.shares)) return false
  return value.availableRounds.every((item) => record(item) && typeof item.id === 'string' && typeof item.datePlayed === 'string') && value.shares.every((share) => record(share) && typeof share.id === 'string' && ['INCOMING', 'OUTGOING'].includes(String(share.direction)) && record(share.round) && typeof share.round.id === 'string' && Array.isArray(share.round.holeScores) && record(share.recipient) && typeof share.recipient.name === 'string')
}
