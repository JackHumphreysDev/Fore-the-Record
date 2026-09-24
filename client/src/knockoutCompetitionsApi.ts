export type KnockoutPlayer = { id: string; name: string; homeClub: { id: string; name: string } | null }
export type KnockoutParticipant = { userId: string; status: 'INVITED' | 'ACCEPTED' | 'DECLINED'; seed: number; respondedAt: string | null; user: KnockoutPlayer }
export type KnockoutMatch = { id: string; roundNumber: number; position: number; status: 'WAITING' | 'READY' | 'COMPLETED'; playerOneId: string | null; playerTwoId: string | null; winnerId: string | null; winningMargin: number | null; holesRemaining: number | null; resultLabel: string | null; completedAt: string | null; playerOne: KnockoutPlayer | null; playerTwo: KnockoutPlayer | null; winner: KnockoutPlayer | null }
export type KnockoutCompetition = { id: string; name: string; status: 'INVITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; organizerId: string; championId: string | null; isOrganizer: boolean; createdAt: string; updatedAt: string; organizer: KnockoutPlayer; champion: KnockoutPlayer | null; participants: KnockoutParticipant[]; matches: KnockoutMatch[] }
export type KnockoutCompetitionsResponse = { competitions: KnockoutCompetition[] }

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function isNullableString(value: unknown): boolean { return value === null || typeof value === 'string' }
function isPlayer(value: unknown): value is KnockoutPlayer { return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && (value.homeClub === null || isRecord(value.homeClub) && typeof value.homeClub.id === 'string' && typeof value.homeClub.name === 'string') }
function isParticipant(value: unknown): value is KnockoutParticipant { return isRecord(value) && typeof value.userId === 'string' && ['INVITED', 'ACCEPTED', 'DECLINED'].includes(String(value.status)) && Number.isInteger(value.seed) && isNullableString(value.respondedAt) && isPlayer(value.user) }
function isMatch(value: unknown): value is KnockoutMatch { return isRecord(value) && typeof value.id === 'string' && Number.isInteger(value.roundNumber) && Number.isInteger(value.position) && ['WAITING', 'READY', 'COMPLETED'].includes(String(value.status)) && isNullableString(value.playerOneId) && isNullableString(value.playerTwoId) && isNullableString(value.winnerId) && (value.winningMargin === null || Number.isInteger(value.winningMargin)) && (value.holesRemaining === null || Number.isInteger(value.holesRemaining)) && isNullableString(value.resultLabel) && isNullableString(value.completedAt) && (value.playerOne === null || isPlayer(value.playerOne)) && (value.playerTwo === null || isPlayer(value.playerTwo)) && (value.winner === null || isPlayer(value.winner)) }
function isCompetition(value: unknown): value is KnockoutCompetition { return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && ['INVITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(String(value.status)) && typeof value.organizerId === 'string' && isNullableString(value.championId) && typeof value.isOrganizer === 'boolean' && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string' && isPlayer(value.organizer) && (value.champion === null || isPlayer(value.champion)) && Array.isArray(value.participants) && value.participants.every(isParticipant) && Array.isArray(value.matches) && value.matches.every(isMatch) }
export function isKnockoutCompetitionsResponse(value: unknown): value is KnockoutCompetitionsResponse { return isRecord(value) && Array.isArray(value.competitions) && value.competitions.every(isCompetition) }

export function knockoutRoundLabel(roundNumber: number, totalRounds: number): string {
  const roundsRemaining = totalRounds - roundNumber
  if (roundsRemaining === 0) return 'Final'
  if (roundsRemaining === 1) return 'Semi-finals'
  if (roundsRemaining === 2) return 'Quarter-finals'
  return `Round ${roundNumber}`
}
