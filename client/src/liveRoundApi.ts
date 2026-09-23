import type { CatalogueTee } from './courseCatalogueApi.ts'
import type { MatchPlayDraft } from './matchPlay.ts'
import type {
  RoundCategory,
  RoundGameResult,
  RoundScoringFormat,
  WeatherCondition,
} from './roundRecordValidation.ts'

export type LiveRoundTee = CatalogueTee & {
  courseId: string
  clubName: string
  courseName: string
  isFavourite: boolean
}

export type LiveRoundForm = {
  teeId: string
  datePlayed: string
  timePlayed: string
  category: RoundCategory
  participation: 'INDIVIDUAL' | 'TEAM'
  scoringFormat: RoundScoringFormat
  playingHandicap: string
  holeCount: 9 | 18
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE'
  competitionName: string
  competitionFormat: string
  competitionFormatOther: string
  gameFormat: string
  gameFormatOther: string
  gameResult: '' | 'WON' | 'LOST' | 'TIED'
  matchPlayOpponentName: string
  playingPartnerIds: string[]
  playingPartnerResults: Record<string, RoundGameResult | ''>
  guestPlayerNames: string
  guestPlayerResults: Record<string, RoundGameResult | ''>
  numberOfPlayers: string
  grossScore: string
  weatherCondition: WeatherCondition
  notes: string
}

export type LiveRoundHole = {
  holeNumber: number
  par: string
  strokeIndex: string
  yardage: string
  strokesTaken: string
  pickedUp: boolean
  putts: string
  fairwayResult: '' | 'HIT' | 'MISSED_LEFT' | 'MISSED_RIGHT' | 'NOT_APPLICABLE'
  greenInRegulation: '' | 'YES' | 'NO'
  penaltyStrokes: string
  bunkerVisits: string
  upAndDownResult: '' | 'NOT_ATTEMPTED' | 'SUCCESSFUL' | 'UNSUCCESSFUL'
}

export type LiveRoundDraftState = {
  version: 1
  currentHoleIndex: number
  tee: LiveRoundTee
  form: LiveRoundForm & { participation: 'INDIVIDUAL' }
  scorecardStatus: 'available' | 'manual_required'
  scorecardSource: 'saved' | 'provider' | null
  holeEntries: LiveRoundHole[]
  matchPlayDraft: MatchPlayDraft
}

export type LiveRoundDraft = {
  id: string
  teeId: string
  state: LiveRoundDraftState
  createdAt: string
  updatedAt: string
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isTee(value: unknown): value is LiveRoundTee {
  return record(value) && typeof value.id === 'string' && typeof value.courseId === 'string' &&
    typeof value.clubName === 'string' && typeof value.courseName === 'string' && typeof value.teeName === 'string' &&
    (value.colour === null || typeof value.colour === 'string') && (value.gender === null || typeof value.gender === 'string') &&
    nullableNumber(value.totalYardage) && nullableNumber(value.totalMetres) && nullableNumber(value.par) &&
    typeof value.courseRating === 'number' && typeof value.slopeRating === 'number' &&
    nullableNumber(value.frontNineCourseRating) && nullableNumber(value.frontNineSlopeRating) &&
    nullableNumber(value.backNineCourseRating) && nullableNumber(value.backNineSlopeRating) &&
    typeof value.isFavourite === 'boolean'
}

function isForm(value: unknown): value is LiveRoundDraftState['form'] {
  return record(value) && typeof value.teeId === 'string' && value.participation === 'INDIVIDUAL' &&
    (value.holeCount === 9 || value.holeCount === 18) && typeof value.datePlayed === 'string' &&
    typeof value.timePlayed === 'string' && ['CASUAL', 'COMPETITION', 'SOCIAL_GAME'].includes(String(value.category)) &&
    ['STROKE_PLAY', 'STABLEFORD'].includes(String(value.scoringFormat)) && typeof value.playingHandicap === 'string' &&
    (value.nineHoleSegment === 'FRONT_NINE' || value.nineHoleSegment === 'BACK_NINE') &&
    typeof value.competitionName === 'string' && typeof value.competitionFormat === 'string' &&
    typeof value.competitionFormatOther === 'string' && typeof value.gameFormat === 'string' &&
    typeof value.gameFormatOther === 'string' && typeof value.gameResult === 'string' &&
    typeof value.matchPlayOpponentName === 'string' && Array.isArray(value.playingPartnerIds) &&
    value.playingPartnerIds.every((id) => typeof id === 'string') && record(value.playingPartnerResults) &&
    typeof value.guestPlayerNames === 'string' && record(value.guestPlayerResults) &&
    typeof value.numberOfPlayers === 'string' && typeof value.grossScore === 'string' &&
    ['DRY', 'MOIST', 'WET', 'SUPER_WET'].includes(String(value.weatherCondition)) && typeof value.notes === 'string'
}

export function isLiveRoundDraftState(value: unknown): value is LiveRoundDraftState {
  if (!record(value) || value.version !== 1 || !Number.isInteger(value.currentHoleIndex) || !isTee(value.tee) ||
    !isForm(value.form) || value.form.teeId !== value.tee.id ||
    (value.scorecardStatus !== 'available' && value.scorecardStatus !== 'manual_required') ||
    (value.scorecardSource !== null && value.scorecardSource !== 'saved' && value.scorecardSource !== 'provider') ||
    !Array.isArray(value.holeEntries) || value.holeEntries.length !== value.form.holeCount || !record(value.matchPlayDraft) ||
    Number(value.currentHoleIndex) < 0 || Number(value.currentHoleIndex) >= value.holeEntries.length) return false
  return value.holeEntries.every((hole) => record(hole) && Number.isInteger(hole.holeNumber) &&
    typeof hole.par === 'string' && typeof hole.strokeIndex === 'string' && typeof hole.yardage === 'string' &&
    typeof hole.strokesTaken === 'string' && typeof hole.pickedUp === 'boolean' &&
    typeof hole.putts === 'string' &&
    (hole.fairwayResult === '' || hole.fairwayResult === 'HIT' || hole.fairwayResult === 'MISSED_LEFT' || hole.fairwayResult === 'MISSED_RIGHT' || hole.fairwayResult === 'NOT_APPLICABLE') &&
    (hole.greenInRegulation === '' || hole.greenInRegulation === 'YES' || hole.greenInRegulation === 'NO') &&
    typeof hole.penaltyStrokes === 'string' && typeof hole.bunkerVisits === 'string' &&
    (hole.upAndDownResult === '' || hole.upAndDownResult === 'NOT_ATTEMPTED' || hole.upAndDownResult === 'SUCCESSFUL' || hole.upAndDownResult === 'UNSUCCESSFUL'))
}

export function isLiveRoundResponse(value: unknown): value is { draft: LiveRoundDraft | null } {
  if (!record(value) || value.draft === null) return record(value) && value.draft === null
  return record(value.draft) && typeof value.draft.id === 'string' && typeof value.draft.teeId === 'string' &&
    typeof value.draft.createdAt === 'string' && typeof value.draft.updatedAt === 'string' &&
    isLiveRoundDraftState(value.draft.state)
}
