import {
  isScorecardPhoto,
  type ScorecardPhoto,
} from './scorecardPhotoApi.ts'

export type WeatherCondition = 'DRY' | 'MOIST' | 'WET' | 'SUPER_WET'
export type RoundCategory = 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
export type RoundParticipation = 'INDIVIDUAL' | 'TEAM'
export type RoundScoringFormat = 'STROKE_PLAY' | 'STABLEFORD'
export type NineHoleSegment = 'FRONT_NINE' | 'BACK_NINE'
export type RoundGameResult = 'WON' | 'LOST' | 'TIED'
export type MatchPlayHoleResult = 'WON' | 'LOST' | 'HALVED'
export type MatchPlayHole = {
  holeNumber: number
  opponentStrokes: number | null
  result: MatchPlayHoleResult
}

type ClassifiedRound = {
  id: string
  datePlayed: string
  timePlayed: string | null
  category: RoundCategory
  participation: RoundParticipation
  scoringFormat: RoundScoringFormat
  holeCount: 9 | 18
  nineHoleSegment: NineHoleSegment | null
  playingHandicap: number | null
  stablefordPoints: number | null
  competitionName: string | null
  competitionFormat: string | null
  gameFormat: string | null
  gameResult: RoundGameResult | null
  matchPlayOpponentName?: string | null
  matchPlayFinalScore?: string | null
  matchPlayHoles?: MatchPlayHole[] | null
  guestPlayerNames: string[]
  playingPartners: Array<{
    id: string
    name: string
    result: RoundGameResult | null
    homeClub?: { id: string; name: string } | null
  }>
  guestPlayers: Array<{ name: string; result: RoundGameResult | null }>
  numberOfPlayers: number | null
  notes: string | null
  grossScore: number | null
  adjustedGrossScore: number | null
  isCapped: boolean
  scoreDifferential: number | null
  scorecardStatus:
    | 'VERIFIED'
    | 'PENDING_REVIEW'
    | 'REJECTED'
    | 'NOT_REQUIRED'
}

export type RoundResult = {
  round: ClassifiedRound
  handicapIndex: number | null
}

export type HistoryRound = ClassifiedRound & {
  scorecardPhoto: ScorecardPhoto | null
  weatherCondition: WeatherCondition | null
  pccAdjustment: number
  isAcceptable: boolean
  usedInHandicapCalc: boolean
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
    course: {
      id: string
      name: string
      club: { id: string; name: string }
    }
  }
}

const WEATHER_CONDITIONS: WeatherCondition[] = [
  'DRY',
  'MOIST',
  'WET',
  'SUPER_WET',
]
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasValidMatchPlay(value: Record<string, unknown>): boolean {
  const isMatchPlay = value.participation === 'INDIVIDUAL' &&
    (value.competitionFormat === 'Match Play' || value.gameFormat === 'Match Play')
  if (!isMatchPlay) {
    return (value.matchPlayOpponentName === null || value.matchPlayOpponentName === undefined) &&
      (value.matchPlayFinalScore === null || value.matchPlayFinalScore === undefined) &&
      (value.matchPlayHoles === null || value.matchPlayHoles === undefined)
  }
  return typeof value.matchPlayOpponentName === 'string' && value.matchPlayOpponentName.length >= 2 &&
    typeof value.matchPlayFinalScore === 'string' && value.matchPlayFinalScore.length > 0 &&
    (value.gameResult === 'WON' || value.gameResult === 'LOST' || value.gameResult === 'TIED') &&
    Array.isArray(value.matchPlayHoles) && value.matchPlayHoles.length > 0 &&
    value.matchPlayHoles.every((hole) => isRecord(hole) && Number.isInteger(hole.holeNumber) &&
      (hole.opponentStrokes === null || Number.isInteger(hole.opponentStrokes) && Number(hole.opponentStrokes) > 0) &&
      (hole.result === 'WON' || hole.result === 'LOST' || hole.result === 'HALVED'))
}

function hasValidClassification(value: Record<string, unknown>): boolean {
  const hasValidTime =
    value.timePlayed === null ||
    (typeof value.timePlayed === 'string' &&
      TIME_PATTERN.test(value.timePlayed))

  if (!hasValidTime) {
    return false
  }

  if (value.category === 'CASUAL') {
    return (
      value.participation === 'INDIVIDUAL' &&
      value.competitionName === null &&
      value.competitionFormat === null &&
      value.gameFormat === null &&
      value.gameResult === null &&
      value.numberOfPlayers === null &&
      Array.isArray(value.guestPlayerNames) && value.guestPlayerNames.length === 0 &&
      Array.isArray(value.playingPartners) && value.playingPartners.length === 0 &&
      Array.isArray(value.guestPlayers) && value.guestPlayers.length === 0
    )
  }

  const hasValidPeople =
    Array.isArray(value.guestPlayerNames) &&
    value.guestPlayerNames.every((name) => typeof name === 'string' && name.length >= 2) &&
    Array.isArray(value.playingPartners) &&
    value.playingPartners.every((partner) =>
      isRecord(partner) && typeof partner.id === 'string' && typeof partner.name === 'string' &&
      (partner.result === null || partner.result === 'WON' || partner.result === 'LOST' || partner.result === 'TIED')) &&
    Array.isArray(value.guestPlayers) && value.guestPlayers.every((guest) =>
      isRecord(guest) && typeof guest.name === 'string' &&
      (guest.result === null || guest.result === 'WON' || guest.result === 'LOST' || guest.result === 'TIED'))
  if (!hasValidPeople) return false

  if (value.category === 'SOCIAL_GAME') {
    return value.participation === 'INDIVIDUAL' &&
      value.competitionName === null && value.competitionFormat === null &&
      typeof value.gameFormat === 'string' && value.gameFormat.length >= 2 &&
      (value.gameResult === null || value.gameResult === 'WON' ||
        value.gameResult === 'LOST' || value.gameResult === 'TIED') &&
      Number.isInteger(value.numberOfPlayers) && Number(value.numberOfPlayers) > 0
  }

  return (
    value.category === 'COMPETITION' &&
    (value.participation === 'INDIVIDUAL' ||
      value.participation === 'TEAM') &&
    typeof value.competitionName === 'string' &&
    value.competitionName.length >= 2 &&
    value.competitionName.length <= 120 &&
    typeof value.competitionFormat === 'string' &&
    value.competitionFormat.length >= 2 &&
    value.competitionFormat.length <= 100 &&
    value.gameFormat === null &&
    (value.competitionFormat === 'Match Play'
      ? value.gameResult === 'WON' || value.gameResult === 'LOST' || value.gameResult === 'TIED'
      : value.gameResult === null) &&
    Number.isInteger(value.numberOfPlayers) &&
    Number(value.numberOfPlayers) > 0 &&
    Number(value.numberOfPlayers) <= 10000
  )
}

export function isRoundResult(value: unknown): value is RoundResult {
  if (
    !isRecord(value) ||
    !isRecord(value.round) ||
    (value.handicapIndex !== null &&
      typeof value.handicapIndex !== 'number')
  ) {
    return false
  }

  const round = value.round
  const hasValidScoredResult =
    round.participation === 'INDIVIDUAL' &&
    typeof round.adjustedGrossScore === 'number' &&
    ((round.holeCount === 18 &&
      round.nineHoleSegment === null &&
      typeof round.scoreDifferential === 'number') ||
      (round.holeCount === 9 &&
        (round.nineHoleSegment === 'FRONT_NINE' ||
          round.nineHoleSegment === 'BACK_NINE') &&
        round.scoreDifferential === null)) &&
    ((round.scoringFormat === 'STROKE_PLAY' &&
      typeof round.grossScore === 'number' &&
      round.playingHandicap === null &&
      round.stablefordPoints === null) ||
      (round.scoringFormat === 'STABLEFORD' &&
        (round.grossScore === null || typeof round.grossScore === 'number') &&
        Number.isInteger(round.playingHandicap) &&
        Number.isInteger(round.stablefordPoints))) &&
    (round.scorecardStatus === 'VERIFIED' ||
      round.scorecardStatus === 'PENDING_REVIEW')
  const hasValidTeamResult =
    round.category === 'COMPETITION' &&
    round.participation === 'TEAM' &&
    round.scoringFormat === 'STROKE_PLAY' &&
    round.playingHandicap === null &&
    round.stablefordPoints === null &&
    typeof round.timePlayed === 'string' &&
    round.grossScore === null &&
    round.adjustedGrossScore === null &&
    round.scoreDifferential === null &&
    round.scorecardStatus === 'NOT_REQUIRED'
    && round.holeCount === 18
    && round.nineHoleSegment === null

  return (
    typeof round.id === 'string' &&
    typeof round.datePlayed === 'string' &&
    (round.notes === undefined ||
      round.notes === null ||
      (typeof round.notes === 'string' && round.notes.length <= 2000)) &&
    hasValidClassification(round) &&
    hasValidMatchPlay(round) &&
    typeof round.isCapped === 'boolean' &&
    (hasValidScoredResult || hasValidTeamResult)
  )
}

export function isHistoryRound(value: unknown): value is HistoryRound {
  if (!isRecord(value) || !isRecord(value.tee)) {
    return false
  }

  const tee = value.tee

  if (!isRecord(tee.course) || !isRecord(tee.course.club)) {
    return false
  }

  const hasValidIndividualScore =
    value.participation === 'INDIVIDUAL' &&
    isFiniteNumber(value.adjustedGrossScore) &&
    typeof value.weatherCondition === 'string' &&
    WEATHER_CONDITIONS.includes(value.weatherCondition as WeatherCondition) &&
    ((value.holeCount === 18 && value.nineHoleSegment === null && isFiniteNumber(value.scoreDifferential)) ||
      (value.holeCount === 9 &&
        (value.nineHoleSegment === 'FRONT_NINE' || value.nineHoleSegment === 'BACK_NINE') &&
        value.scoreDifferential === null &&
        value.isAcceptable === false &&
        value.usedInHandicapCalc === false)) &&
    ((value.scoringFormat === 'STROKE_PLAY' &&
      isFiniteNumber(value.grossScore) &&
      value.playingHandicap === null &&
      value.stablefordPoints === null) ||
      (value.scoringFormat === 'STABLEFORD' &&
        (value.grossScore === null || isFiniteNumber(value.grossScore)) &&
        Number.isInteger(value.playingHandicap) &&
        Number.isInteger(value.stablefordPoints))) &&
    (value.scorecardStatus === 'VERIFIED' ||
      value.scorecardStatus === 'PENDING_REVIEW' ||
      value.scorecardStatus === 'REJECTED')
  const hasValidTeamRecord =
    value.category === 'COMPETITION' &&
    value.participation === 'TEAM' &&
    value.scoringFormat === 'STROKE_PLAY' &&
    value.playingHandicap === null &&
    value.stablefordPoints === null &&
    value.grossScore === null &&
    value.adjustedGrossScore === null &&
    value.weatherCondition === null &&
    value.scoreDifferential === null &&
    value.isAcceptable === false &&
    value.usedInHandicapCalc === false &&
    value.scorecardStatus === 'NOT_REQUIRED'
    && value.holeCount === 18
    && value.nineHoleSegment === null
  const hasValidHoleScores =
    Array.isArray(value.holeScores) &&
    (value.holeScores.length === 0 || value.holeScores.length === value.holeCount) &&
    value.holeScores.every(
      (hole) =>
        isRecord(hole) &&
        Number.isInteger(hole.holeNumber) &&
        Number(hole.holeNumber) >= 1 &&
        Number(hole.holeNumber) <= 18 &&
        Number.isInteger(hole.par) &&
        Number.isInteger(hole.strokeIndex) &&
        typeof hole.pickedUp === 'boolean' &&
        Number.isInteger(hole.strokesTaken) &&
        (hole.pickedUp
          ? Number(hole.strokesTaken) === 0
          : Number(hole.strokesTaken) > 0),
    )

  return (
    typeof value.id === 'string' &&
    typeof value.datePlayed === 'string' &&
    (value.notes === undefined ||
      value.notes === null ||
      (typeof value.notes === 'string' && value.notes.length <= 2000)) &&
    hasValidClassification(value) &&
    hasValidMatchPlay(value) &&
    (hasValidIndividualScore || hasValidTeamRecord) &&
    typeof value.isCapped === 'boolean' &&
    isFiniteNumber(value.pccAdjustment) &&
    typeof value.isAcceptable === 'boolean' &&
    typeof value.usedInHandicapCalc === 'boolean' &&
    (value.scorecardPhoto === null || isScorecardPhoto(value.scorecardPhoto)) &&
    hasValidHoleScores &&
    typeof tee.id === 'string' &&
    typeof tee.teeName === 'string' &&
    isFiniteNumber(tee.courseRating) &&
    isFiniteNumber(tee.slopeRating) &&
    (tee.frontNineCourseRating === null || isFiniteNumber(tee.frontNineCourseRating)) &&
    (tee.frontNineSlopeRating === null || isFiniteNumber(tee.frontNineSlopeRating)) &&
    (tee.backNineCourseRating === null || isFiniteNumber(tee.backNineCourseRating)) &&
    (tee.backNineSlopeRating === null || isFiniteNumber(tee.backNineSlopeRating)) &&
    (tee.par === null || isFiniteNumber(tee.par)) &&
    typeof tee.course.id === 'string' &&
    typeof tee.course.name === 'string' &&
    typeof tee.course.club.id === 'string' &&
    typeof tee.course.club.name === 'string'
  )
}
