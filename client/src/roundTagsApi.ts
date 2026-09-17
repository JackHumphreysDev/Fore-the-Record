export type RoundTag = {
  roundId: string
  createdAt: string
  datePlayed: string
  category: 'COMPETITION' | 'SOCIAL_GAME'
  competitionFormat: string | null
  gameFormat: string | null
  gameResult: 'WON' | 'LOST' | 'TIED' | null
  result: 'WON' | 'LOST' | 'TIED' | null
  player: { id: string; name: string }
  tee: { teeName: string; course: { name: string; club: { name: string } } }
}

export type RoundTagsResponse = { tags: RoundTag[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRoundTag(value: unknown): value is RoundTag {
  return isRecord(value) && typeof value.roundId === 'string' &&
    typeof value.createdAt === 'string' && typeof value.datePlayed === 'string' &&
    (value.category === 'COMPETITION' || value.category === 'SOCIAL_GAME') &&
    (value.competitionFormat === null || typeof value.competitionFormat === 'string') &&
    (value.gameFormat === null || typeof value.gameFormat === 'string') &&
    (value.gameResult === null || value.gameResult === 'WON' || value.gameResult === 'LOST' || value.gameResult === 'TIED') &&
    (value.result === null || value.result === 'WON' || value.result === 'LOST' || value.result === 'TIED') &&
    isRecord(value.player) && typeof value.player.id === 'string' && typeof value.player.name === 'string' &&
    isRecord(value.tee) && typeof value.tee.teeName === 'string' && isRecord(value.tee.course) &&
    typeof value.tee.course.name === 'string' && isRecord(value.tee.course.club) && typeof value.tee.course.club.name === 'string'
}

export function isRoundTagsResponse(value: unknown): value is RoundTagsResponse {
  return isRecord(value) && Array.isArray(value.tags) && value.tags.every(isRoundTag)
}

export function buildRoundTagPath(roundId: string): string {
  return `/api/users/me/round-tags/${encodeURIComponent(roundId)}`
}
