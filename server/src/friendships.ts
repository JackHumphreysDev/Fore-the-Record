export function buildFriendshipPairKey(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join(':')
}

export function normalizeFriendSearch(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const search = value.trim().replace(/\s+/g, ' ')
  return search.length >= 2 && search.length <= 100 ? search : null
}
