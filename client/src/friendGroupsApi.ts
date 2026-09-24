export type FriendGroupPlayer = {
  id: string
  name: string
  homeClub: { id: string; name: string } | null
  hasProfileImage: boolean
  joinedAt: string
  isOwner: boolean
}

export type FriendGroup = {
  id: string
  name: string
  description: string | null
  ownerId: string
  isOwner: boolean
  createdAt: string
  updatedAt: string
  image: { name: string; mimeType: string; size: number; uploadedAt: string } | null
  players: FriendGroupPlayer[]
}

export type FriendGroupPeriod = '30_DAYS' | '90_DAYS' | '12_MONTHS' | 'ALL_TIME'
export type FriendGroupMetric = 'ROUNDS_PLAYED' | 'STABLEFORD_POINTS' | 'AVERAGE_GROSS' | 'BEST_GROSS' | 'HANDICAP_IMPROVEMENT'

export type FriendGroupStanding = {
  player: Omit<FriendGroupPlayer, 'joinedAt' | 'isOwner'>
  roundsPlayed: number
  stablefordPoints: number
  averageGross: number | null
  grossRounds: number
  bestGross: number | null
  handicapImprovement: number | null
}

export type FriendGroupsResponse = { groups: FriendGroup[] }
export type FriendGroupLeaderboardResponse = {
  group: FriendGroup
  period: FriendGroupPeriod
  startsOn: string | null
  standings: FriendGroupStanding[]
  recentRounds: FriendGroupRoundSummary[]
}

export type FriendGroupRoundSummary = {
  id: string
  datePlayed: string
  grossScore: number | null
  stablefordPoints: number | null
  player: Omit<FriendGroupPlayer, 'joinedAt' | 'isOwner'>
  tee: { teeName: string; course: { name: string; club: { name: string } } }
}

export type FriendGroupMessage = {
  id: string
  groupId: string
  authorId: string
  body: string
  createdAt: string
  canDelete: boolean
  author: Omit<FriendGroupPlayer, 'joinedAt' | 'isOwner'>
  round: FriendGroupRoundSummary | null
}

export type FriendGroupMessagesResponse = { messages: FriendGroupMessage[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHomeClub(value: unknown): boolean {
  return value === null || isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
}

function isBasePlayer(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.hasProfileImage === 'boolean' && isHomeClub(value.homeClub)
}

export function isFriendGroup(value: unknown): value is FriendGroup {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.ownerId === 'string' && typeof value.isOwner === 'boolean' &&
    typeof value.createdAt === 'string' && typeof value.updatedAt === 'string' &&
    (value.image === null || isRecord(value.image) && typeof value.image.name === 'string' && typeof value.image.mimeType === 'string' && Number.isInteger(value.image.size) && typeof value.image.uploadedAt === 'string') &&
    Array.isArray(value.players) && value.players.every((player) => isBasePlayer(player) && typeof player.joinedAt === 'string' && typeof player.isOwner === 'boolean')
}

export function isFriendGroupsResponse(value: unknown): value is FriendGroupsResponse {
  return isRecord(value) && Array.isArray(value.groups) && value.groups.every(isFriendGroup)
}

export function isFriendGroupLeaderboardResponse(value: unknown): value is FriendGroupLeaderboardResponse {
  return isRecord(value) && isFriendGroup(value.group) &&
    ['30_DAYS', '90_DAYS', '12_MONTHS', 'ALL_TIME'].includes(String(value.period)) &&
    (value.startsOn === null || typeof value.startsOn === 'string') &&
    Array.isArray(value.standings) && value.standings.every((standing) => isRecord(standing) &&
      isBasePlayer(standing.player) && Number.isInteger(standing.roundsPlayed) &&
      Number.isInteger(standing.stablefordPoints) && Number.isInteger(standing.grossRounds) &&
      (standing.averageGross === null || typeof standing.averageGross === 'number') &&
      (standing.bestGross === null || typeof standing.bestGross === 'number') &&
      (standing.handicapImprovement === null || typeof standing.handicapImprovement === 'number')) &&
    Array.isArray(value.recentRounds) && value.recentRounds.every(isFriendGroupRoundSummary)
}

function isFriendGroupRoundSummary(value: unknown): value is FriendGroupRoundSummary {
  return isRecord(value) && typeof value.id === 'string' && typeof value.datePlayed === 'string' &&
    (value.grossScore === null || typeof value.grossScore === 'number') &&
    (value.stablefordPoints === null || typeof value.stablefordPoints === 'number') && isBasePlayer(value.player) &&
    isRecord(value.tee) && typeof value.tee.teeName === 'string' && isRecord(value.tee.course) &&
    typeof value.tee.course.name === 'string' && isRecord(value.tee.course.club) && typeof value.tee.course.club.name === 'string'
}

export function isFriendGroupMessage(value: unknown): value is FriendGroupMessage {
  return isRecord(value) && typeof value.id === 'string' && typeof value.groupId === 'string' &&
    typeof value.authorId === 'string' && typeof value.body === 'string' && typeof value.createdAt === 'string' &&
    typeof value.canDelete === 'boolean' && isBasePlayer(value.author) && (value.round === null || isFriendGroupRoundSummary(value.round))
}

export function isFriendGroupMessagesResponse(value: unknown): value is FriendGroupMessagesResponse {
  return isRecord(value) && Array.isArray(value.messages) && value.messages.every(isFriendGroupMessage)
}

export function buildFriendGroupLeaderboardPath(groupId: string, period: FriendGroupPeriod): string {
  return `/api/users/me/friend-groups/${encodeURIComponent(groupId)}/leaderboard?period=${period}`
}

function metricValue(standing: FriendGroupStanding, metric: FriendGroupMetric): number | null {
  if (metric === 'ROUNDS_PLAYED') return standing.roundsPlayed
  if (metric === 'STABLEFORD_POINTS') return standing.stablefordPoints
  if (metric === 'AVERAGE_GROSS') return standing.averageGross
  if (metric === 'BEST_GROSS') return standing.bestGross
  return standing.handicapImprovement
}

export function sortFriendGroupStandings(standings: readonly FriendGroupStanding[], metric: FriendGroupMetric): FriendGroupStanding[] {
  const lowerWins = metric === 'AVERAGE_GROSS' || metric === 'BEST_GROSS'
  return [...standings].sort((left, right) => {
    const leftValue = metricValue(left, metric)
    const rightValue = metricValue(right, metric)
    if (leftValue === null) return rightValue === null ? left.player.name.localeCompare(right.player.name) : 1
    if (rightValue === null) return -1
    return (lowerWins ? leftValue - rightValue : rightValue - leftValue) || left.player.name.localeCompare(right.player.name)
  })
}
