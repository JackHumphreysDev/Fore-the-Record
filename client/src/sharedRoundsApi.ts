import { isTeamCompetition, type TeamCompetition } from './teamCompetition.ts'

export type SharedRoundPlayer = { id: string; name: string; homeClub: { id: string; name: string } | null }
export type SharedRound = {
  id: string; datePlayed: string; category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'; participation: 'INDIVIDUAL' | 'TEAM'; scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'; holeCount: number; nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null; grossScore: number | null; stablefordPoints: number | null; scoreDifferential: number | null; gameFormat: string | null; competitionName: string | null; competitionFormat: string | null; teamCompetition: TeamCompetition | null; hasScorecardPhoto: boolean; user: SharedRoundPlayer; tee: { teeName: string; par: number | null; course: { name: string; club: { name: string } } }; holeScores: Array<{ holeNumber: number; par: number; strokeIndex: number; strokesTaken: number; pickedUp: boolean }>
}
export type RoundSharesResponse = { availableRounds: Array<{ id: string; datePlayed: string; tee: { course: { name: string; club: { name: string } } } }>; shares: Array<{ id: string; direction: 'INCOMING' | 'OUTGOING'; createdAt: string; recipient: SharedRoundPlayer; round: SharedRound }> }
export type FriendProfileRoundsResponse = { player: SharedRoundPlayer & { handicapIndex: number | null; handicapVisible: boolean }; rounds: SharedRound[] }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
export function isRoundSharesResponse(value: unknown): value is RoundSharesResponse {
  if (!record(value) || !Array.isArray(value.availableRounds) || !Array.isArray(value.shares)) return false
  return value.availableRounds.every((item) => record(item) && typeof item.id === 'string' && typeof item.datePlayed === 'string') && value.shares.every((share) => record(share) && typeof share.id === 'string' && ['INCOMING', 'OUTGOING'].includes(String(share.direction)) && record(share.round) && typeof share.round.id === 'string' && Array.isArray(share.round.holeScores) && (share.round.teamCompetition === null || isTeamCompetition(share.round.teamCompetition)) && record(share.recipient) && typeof share.recipient.name === 'string')
}
export function isFriendProfileRoundsResponse(value: unknown): value is FriendProfileRoundsResponse {
  return record(value) && record(value.player) && typeof value.player.id === 'string' && typeof value.player.name === 'string' && typeof value.player.handicapVisible === 'boolean' && (value.player.handicapIndex === null || typeof value.player.handicapIndex === 'number') && Array.isArray(value.rounds) && value.rounds.every((round) => record(round) && typeof round.id === 'string' && typeof round.datePlayed === 'string' && typeof round.hasScorecardPhoto === 'boolean' && Array.isArray(round.holeScores) && (round.teamCompetition === null || isTeamCompetition(round.teamCompetition)))
}
