export type ChallengeMetric = 'ROUND_COUNT' | 'STABLEFORD_POINTS' | 'LOWEST_GROSS_SCORE'
export type ChallengeStatus = 'PENDING' | 'ACTIVE' | 'DECLINED' | 'CANCELLED'
export type ChallengePlayer = { id: string; name: string; homeClub: { id: string; name: string } | null }
export type PlayerChallenge = { id: string; metric: ChallengeMetric; status: ChallengeStatus; creatorId: string; opponentId: string; startsOn: string; endsOn: string; createdAt: string; creator: ChallengePlayer; opponent: ChallengePlayer; standings: Array<{ player: ChallengePlayer; score: number | null }> }
export type ChallengesResponse = { challenges: PlayerChallenge[] }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function isPlayer(value: unknown): value is ChallengePlayer { return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && (value.homeClub === null || isRecord(value.homeClub) && typeof value.homeClub.id === 'string' && typeof value.homeClub.name === 'string') }
export function isChallengesResponse(value: unknown): value is ChallengesResponse {
  return isRecord(value) && Array.isArray(value.challenges) && value.challenges.every((challenge) => isRecord(challenge) && typeof challenge.id === 'string' && ['ROUND_COUNT', 'STABLEFORD_POINTS', 'LOWEST_GROSS_SCORE'].includes(String(challenge.metric)) && ['PENDING', 'ACTIVE', 'DECLINED', 'CANCELLED'].includes(String(challenge.status)) && typeof challenge.creatorId === 'string' && typeof challenge.opponentId === 'string' && typeof challenge.startsOn === 'string' && typeof challenge.endsOn === 'string' && typeof challenge.createdAt === 'string' && isPlayer(challenge.creator) && isPlayer(challenge.opponent) && Array.isArray(challenge.standings) && challenge.standings.every((standing) => isRecord(standing) && isPlayer(standing.player) && (standing.score === null || typeof standing.score === 'number')))
}
