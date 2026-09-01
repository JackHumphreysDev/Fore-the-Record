export type WeatherCondition = 'DRY' | 'MOIST' | 'WET' | 'SUPER_WET'
export type RoundCategory = 'CASUAL' | 'COMPETITION'
export type RoundParticipation = 'INDIVIDUAL' | 'TEAM'

type ClassifiedRound = {
  id: string
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
  weatherCondition: WeatherCondition | null
  pccAdjustment: number
  isAcceptable: boolean
  usedInHandicapCalc: boolean
  tee: {
    id: string
    teeName: string
    courseRating: number
    slopeRating: number
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
      value.numberOfPlayers === null
    )
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
    typeof round.grossScore === 'number' &&
    typeof round.adjustedGrossScore === 'number' &&
    typeof round.scoreDifferential === 'number' &&
    (round.scorecardStatus === 'VERIFIED' ||
      round.scorecardStatus === 'PENDING_REVIEW')
  const hasValidTeamResult =
    round.category === 'COMPETITION' &&
    round.participation === 'TEAM' &&
    typeof round.timePlayed === 'string' &&
    round.grossScore === null &&
    round.adjustedGrossScore === null &&
    round.scoreDifferential === null &&
    round.scorecardStatus === 'NOT_REQUIRED'

  return (
    typeof round.id === 'string' &&
    typeof round.datePlayed === 'string' &&
    hasValidClassification(round) &&
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
    isFiniteNumber(value.grossScore) &&
    isFiniteNumber(value.adjustedGrossScore) &&
    typeof value.weatherCondition === 'string' &&
    WEATHER_CONDITIONS.includes(value.weatherCondition as WeatherCondition) &&
    isFiniteNumber(value.scoreDifferential) &&
    (value.scorecardStatus === 'VERIFIED' ||
      value.scorecardStatus === 'PENDING_REVIEW' ||
      value.scorecardStatus === 'REJECTED')
  const hasValidTeamRecord =
    value.category === 'COMPETITION' &&
    value.participation === 'TEAM' &&
    value.grossScore === null &&
    value.adjustedGrossScore === null &&
    value.weatherCondition === null &&
    value.scoreDifferential === null &&
    value.isAcceptable === false &&
    value.usedInHandicapCalc === false &&
    value.scorecardStatus === 'NOT_REQUIRED'

  return (
    typeof value.id === 'string' &&
    typeof value.datePlayed === 'string' &&
    hasValidClassification(value) &&
    (hasValidIndividualScore || hasValidTeamRecord) &&
    typeof value.isCapped === 'boolean' &&
    isFiniteNumber(value.pccAdjustment) &&
    typeof value.isAcceptable === 'boolean' &&
    typeof value.usedInHandicapCalc === 'boolean' &&
    typeof tee.id === 'string' &&
    typeof tee.teeName === 'string' &&
    isFiniteNumber(tee.courseRating) &&
    isFiniteNumber(tee.slopeRating) &&
    (tee.par === null || isFiniteNumber(tee.par)) &&
    typeof tee.course.id === 'string' &&
    typeof tee.course.name === 'string' &&
    typeof tee.course.club.id === 'string' &&
    typeof tee.course.club.name === 'string'
  )
}
