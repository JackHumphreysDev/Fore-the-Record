export type OpponentRecord = {
  wins: number
  losses: number
  ties: number
  played: number
}

export type OpponentRecordsResponse = {
  friends: Array<OpponentRecord & {
    id: string
    name: string
    homeClub: { id: string; name: string } | null
  }>
  guests: Array<OpponentRecord & { name: string }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasTotals(value: Record<string, unknown>): boolean {
  return ['wins', 'losses', 'ties', 'played'].every((key) => Number.isInteger(value[key]) && Number(value[key]) >= 0) &&
    value.played === Number(value.wins) + Number(value.losses) + Number(value.ties)
}

export function isOpponentRecordsResponse(value: unknown): value is OpponentRecordsResponse {
  return isRecord(value) && Array.isArray(value.friends) && Array.isArray(value.guests) &&
    value.friends.every((item) => isRecord(item) && hasTotals(item) && typeof item.id === 'string' && typeof item.name === 'string' &&
      (item.homeClub === null || isRecord(item.homeClub) && typeof item.homeClub.id === 'string' && typeof item.homeClub.name === 'string')) &&
    value.guests.every((item) => isRecord(item) && hasTotals(item) && typeof item.name === 'string')
}
