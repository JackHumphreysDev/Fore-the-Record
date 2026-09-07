import type {
  RoundCategory,
  RoundParticipation,
  WeatherCondition,
} from './roundRecordValidation.ts'

export type AdminRound = {
  id: string
  userId: string
  datePlayed: string
  timePlayed: string | null
  category: RoundCategory
  participation: RoundParticipation
  competitionName: string | null
  competitionFormat: string | null
  numberOfPlayers: number | null
  grossScore: number | null
  adjustedGrossScore: number | null
  isCapped: boolean
  weatherCondition: WeatherCondition | null
  pccAdjustment: number
  scoreDifferential: number | null
  isAcceptable: boolean
  usedInHandicapCalc: boolean
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  holeScores: Array<{
    holeNumber: number
    par: number
    strokeIndex: number
    strokesTaken: number
  }>
  tee: {
    id: string
    teeName: string
    courseRating: number
    slopeRating: number
    par: number | null
    course: { id: string; name: string; club: { id: string; name: string } }
  }
}

export type AdminRoundsResponse = {
  player: { id: string; name: string; handicapIndex: number | null }
  rounds: AdminRound[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isAdminRound(value: unknown): value is AdminRound {
  if (!isRecord(value) || !isRecord(value.tee)) return false
  const tee = value.tee
  return (
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.datePlayed === 'string' &&
    (value.timePlayed === null || typeof value.timePlayed === 'string') &&
    (value.category === 'CASUAL' || value.category === 'COMPETITION') &&
    (value.participation === 'INDIVIDUAL' || value.participation === 'TEAM') &&
    (value.grossScore === null || typeof value.grossScore === 'number') &&
    typeof value.pccAdjustment === 'number' &&
    (value.scoreDifferential === null || typeof value.scoreDifferential === 'number') &&
    Array.isArray(value.holeScores) &&
    value.holeScores.every(
      (hole) =>
        isRecord(hole) &&
        Number.isInteger(hole.holeNumber) &&
        Number.isInteger(hole.par) &&
        Number.isInteger(hole.strokeIndex) &&
        Number.isInteger(hole.strokesTaken),
    ) &&
    typeof tee.id === 'string' &&
    typeof tee.teeName === 'string' &&
    typeof tee.courseRating === 'number' &&
    Number.isInteger(tee.slopeRating) &&
    isRecord(tee.course) &&
    typeof tee.course.name === 'string' &&
    isRecord(tee.course.club) &&
    typeof tee.course.club.name === 'string'
  )
}

export function isAdminRoundsResponse(value: unknown): value is AdminRoundsResponse {
  return (
    isRecord(value) &&
    isRecord(value.player) &&
    typeof value.player.id === 'string' &&
    typeof value.player.name === 'string' &&
    (value.player.handicapIndex === null || typeof value.player.handicapIndex === 'number') &&
    Array.isArray(value.rounds) &&
    value.rounds.every(isAdminRound) &&
    isRecord(value.pagination) &&
    Number.isInteger(value.pagination.page) &&
    Number.isInteger(value.pagination.pageSize) &&
    Number.isInteger(value.pagination.total) &&
    Number.isInteger(value.pagination.totalPages)
  )
}

export function buildAdminRoundsPath(userId: string, page: number): string {
  return `/api/admin/users/${encodeURIComponent(userId)}/rounds?page=${page}&pageSize=10`
}

export function buildAdminRoundPath(roundId: string): string {
  return `/api/admin/rounds/${encodeURIComponent(roundId)}`
}
