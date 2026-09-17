export type FriendActivity = {
  id: string
  datePlayed: string
  timePlayed: string | null
  category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  participation: 'INDIVIDUAL' | 'TEAM'
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: 9 | 18
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null
  grossScore: number | null
  stablefordPoints: number | null
  competitionFormat: string | null
  gameFormat: string | null
  gameResult: 'WON' | 'LOST' | 'TIED' | null
  usedInHandicapCalc: boolean
  player: {
    id: string
    name: string
    homeClub: { id: string; name: string } | null
    handicapVisible: boolean
    handicapIndex: number | null
  }
  tee: {
    teeName: string
    course: { name: string; club: { name: string } }
  }
}

export type FriendActivityResponse = {
  activities: FriendActivity[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isActivity(value: unknown): value is FriendActivity {
  if (!isRecord(value) || !isRecord(value.player) || !isRecord(value.tee)) {
    return false
  }
  const player = value.player
  const tee = value.tee
  return (
    typeof value.id === 'string' &&
    typeof value.datePlayed === 'string' &&
    (value.timePlayed === null || typeof value.timePlayed === 'string') &&
    (value.category === 'CASUAL' || value.category === 'COMPETITION' || value.category === 'SOCIAL_GAME') &&
    (value.participation === 'INDIVIDUAL' || value.participation === 'TEAM') &&
    (value.scoringFormat === 'STROKE_PLAY' || value.scoringFormat === 'STABLEFORD') &&
    (value.holeCount === 9 || value.holeCount === 18) &&
    ((value.holeCount === 18 && value.nineHoleSegment === null) ||
      (value.holeCount === 9 &&
        (value.nineHoleSegment === 'FRONT_NINE' || value.nineHoleSegment === 'BACK_NINE'))) &&
    isNullableNumber(value.grossScore) &&
    isNullableNumber(value.stablefordPoints) &&
    (value.competitionFormat === null || typeof value.competitionFormat === 'string') &&
    (value.gameFormat === null || typeof value.gameFormat === 'string') &&
    (value.gameResult === null || value.gameResult === 'WON' || value.gameResult === 'LOST' || value.gameResult === 'TIED') &&
    typeof value.usedInHandicapCalc === 'boolean' &&
    typeof player.id === 'string' &&
    typeof player.name === 'string' &&
    typeof player.handicapVisible === 'boolean' &&
    isNullableNumber(player.handicapIndex) &&
    (player.homeClub === null ||
      (isRecord(player.homeClub) &&
        typeof player.homeClub.id === 'string' &&
        typeof player.homeClub.name === 'string')) &&
    typeof tee.teeName === 'string' &&
    isRecord(tee.course) &&
    typeof tee.course.name === 'string' &&
    isRecord(tee.course.club) &&
    typeof tee.course.club.name === 'string'
  )
}

export function isFriendActivityResponse(
  value: unknown,
): value is FriendActivityResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.activities) &&
    value.activities.every(isActivity) &&
    isRecord(value.pagination) &&
    Number.isInteger(value.pagination.page) &&
    Number(value.pagination.page) > 0 &&
    Number.isInteger(value.pagination.pageSize) &&
    Number(value.pagination.pageSize) > 0 &&
    Number.isInteger(value.pagination.total) &&
    Number(value.pagination.total) >= 0 &&
    Number.isInteger(value.pagination.totalPages) &&
    Number(value.pagination.totalPages) >= 0
  )
}

export function buildFriendActivityPath(page: number, pageSize = 10): string {
  return `/api/users/me/friends/activity?page=${page}&pageSize=${pageSize}`
}
