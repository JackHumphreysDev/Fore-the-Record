import type {
  RoundCategory,
  RoundParticipation,
  WeatherCondition,
} from './roundRecordValidation.ts'
import { isScorecardPhoto, type ScorecardPhoto } from './scorecardPhotoApi.ts'

export type AdminRound = {
  id: string
  userId: string
  datePlayed: string
  timePlayed: string | null
  category: RoundCategory
  participation: RoundParticipation
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: 9 | 18
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null
  playingHandicap: number | null
  stablefordPoints: number | null
  competitionName: string | null
  competitionFormat: string | null
  gameFormat: string | null
  gameResult: 'WON' | 'LOST' | 'TIED' | null
  guestPlayerNames: string[]
  playingPartners: Array<{ id: string; name: string; result: 'WON' | 'LOST' | 'TIED' | null }>
  guestPlayers: Array<{ name: string; result: 'WON' | 'LOST' | 'TIED' | null }>
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
  scorecardPhoto: ScorecardPhoto | null
  holeScores: Array<{
    holeNumber: number
    par: number
    strokeIndex: number
    strokesTaken: number
    pickedUp: boolean
  }>
  tee: {
    id: string
    teeName: string
    courseRating: number
    slopeRating: number
    frontNineCourseRating: number | null
    frontNineSlopeRating: number | null
    backNineCourseRating: number | null
    backNineSlopeRating: number | null
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
    (value.category === 'CASUAL' || value.category === 'COMPETITION' || value.category === 'SOCIAL_GAME') &&
    (value.participation === 'INDIVIDUAL' || value.participation === 'TEAM') &&
    (value.scoringFormat === 'STROKE_PLAY' || value.scoringFormat === 'STABLEFORD') &&
    (value.holeCount === 9 || value.holeCount === 18) &&
    (value.nineHoleSegment === null || value.nineHoleSegment === 'FRONT_NINE' || value.nineHoleSegment === 'BACK_NINE') &&
    (value.playingHandicap === null || Number.isInteger(value.playingHandicap)) &&
    (value.stablefordPoints === null || Number.isInteger(value.stablefordPoints)) &&
    (value.gameFormat === null || typeof value.gameFormat === 'string') &&
    (value.gameResult === null || value.gameResult === 'WON' || value.gameResult === 'LOST' || value.gameResult === 'TIED') &&
    Array.isArray(value.guestPlayerNames) && value.guestPlayerNames.every((name) => typeof name === 'string') &&
    Array.isArray(value.playingPartners) && value.playingPartners.every((player) => isRecord(player) && typeof player.id === 'string' && typeof player.name === 'string' && (player.result === null || player.result === 'WON' || player.result === 'LOST' || player.result === 'TIED')) &&
    Array.isArray(value.guestPlayers) && value.guestPlayers.every((player) => isRecord(player) && typeof player.name === 'string' && (player.result === null || player.result === 'WON' || player.result === 'LOST' || player.result === 'TIED')) &&
    (value.grossScore === null || typeof value.grossScore === 'number') &&
    typeof value.pccAdjustment === 'number' &&
    (value.scoreDifferential === null || typeof value.scoreDifferential === 'number') &&
    (value.scorecardPhoto === null || isScorecardPhoto(value.scorecardPhoto)) &&
    Array.isArray(value.holeScores) &&
    value.holeScores.every(
      (hole) =>
        isRecord(hole) &&
        Number.isInteger(hole.holeNumber) &&
        Number.isInteger(hole.par) &&
        Number.isInteger(hole.strokeIndex) &&
        Number.isInteger(hole.strokesTaken) &&
        typeof hole.pickedUp === 'boolean',
    ) &&
    typeof tee.id === 'string' &&
    typeof tee.teeName === 'string' &&
    typeof tee.courseRating === 'number' &&
    Number.isInteger(tee.slopeRating) &&
    (tee.frontNineCourseRating === null || typeof tee.frontNineCourseRating === 'number') &&
    (tee.frontNineSlopeRating === null || Number.isInteger(tee.frontNineSlopeRating)) &&
    (tee.backNineCourseRating === null || typeof tee.backNineCourseRating === 'number') &&
    (tee.backNineSlopeRating === null || Number.isInteger(tee.backNineSlopeRating)) &&
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
