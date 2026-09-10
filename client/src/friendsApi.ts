export type FriendPlayer = {
  id: string
  name: string
  handicapIndex: number | null
  homeClub: { id: string; name: string } | null
}

export type FriendshipItem = {
  id: string
  createdAt: string
  updatedAt: string
  player: FriendPlayer
}

export type FriendsResponse = {
  friends: FriendshipItem[]
  incoming: FriendshipItem[]
  outgoing: FriendshipItem[]
}

export type FriendSearchPlayer = FriendPlayer & {
  relationship: null | {
    id: string
    status: 'PENDING' | 'ACCEPTED'
    direction: 'INCOMING' | 'OUTGOING'
  }
}

export type FriendSearchResponse = { players: FriendSearchPlayer[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlayer(value: unknown): value is FriendPlayer {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.handicapIndex === null || typeof value.handicapIndex === 'number') &&
    (value.homeClub === null ||
      (isRecord(value.homeClub) &&
        typeof value.homeClub.id === 'string' &&
        typeof value.homeClub.name === 'string'))
  )
}

function isFriendshipItem(value: unknown): value is FriendshipItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isPlayer(value.player)
  )
}

export function isFriendsResponse(value: unknown): value is FriendsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.friends) &&
    value.friends.every(isFriendshipItem) &&
    Array.isArray(value.incoming) &&
    value.incoming.every(isFriendshipItem) &&
    Array.isArray(value.outgoing) &&
    value.outgoing.every(isFriendshipItem)
  )
}

function isSearchPlayer(value: unknown): value is FriendSearchPlayer {
  if (!isPlayer(value) || !('relationship' in value)) return false
  if (value.relationship === null) return true
  return (
    isRecord(value.relationship) &&
    typeof value.relationship.id === 'string' &&
    (value.relationship.status === 'PENDING' ||
      value.relationship.status === 'ACCEPTED') &&
    (value.relationship.direction === 'INCOMING' ||
      value.relationship.direction === 'OUTGOING')
  )
}

export function isFriendSearchResponse(
  value: unknown,
): value is FriendSearchResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.players) &&
    value.players.every(isSearchPlayer)
  )
}

export function buildFriendSearchPath(search: string): string {
  return `/api/users/me/friends/search?q=${encodeURIComponent(search.trim())}`
}
