export type PartnerResult = 'WON' | 'LOST' | 'TIED' | null

export type PlayingPartnerRound = {
  roundId: string
  ownedByPlayer: boolean
  recordedBy: string
  datePlayed: string
  category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  participation: 'INDIVIDUAL' | 'TEAM'
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: 9 | 18
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null
  format: string
  result: PartnerResult
  teeName: string
  courseId: string
  courseName: string
  clubId: string
  clubName: string
}

export type PlayingPartner = {
  key: string
  kind: 'FRIEND' | 'GUEST'
  playerId: string | null
  name: string
  homeClub: { id: string; name: string } | null
  roundsPlayed: number
  wins: number
  losses: number
  ties: number
  roundsWithoutResult: number
  firstPlayed: string | null
  lastPlayed: string | null
  courses: Array<{
    courseId: string
    clubName: string
    courseName: string
    rounds: number
    lastPlayed: string
  }>
  formats: Array<{ name: string; rounds: number }>
  rounds: PlayingPartnerRound[]
}

export type PlayingPartnersHistoryResponse = {
  partners: PlayingPartner[]
  summary: {
    partners: number
    friends: number
    guests: number
    partnerAppearances: number
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isHomeClub(value: unknown): value is PlayingPartner['homeClub'] {
  return value === null || (isObject(value) && typeof value.id === 'string' && typeof value.name === 'string')
}

function isRound(value: unknown): value is PlayingPartnerRound {
  if (!isObject(value)) return false
  const resultValid = value.result === null || ['WON', 'LOST', 'TIED'].includes(String(value.result))
  return typeof value.roundId === 'string' && typeof value.ownedByPlayer === 'boolean' &&
    typeof value.recordedBy === 'string' && isDate(value.datePlayed) &&
    ['CASUAL', 'COMPETITION', 'SOCIAL_GAME'].includes(String(value.category)) &&
    ['INDIVIDUAL', 'TEAM'].includes(String(value.participation)) &&
    ['STROKE_PLAY', 'STABLEFORD'].includes(String(value.scoringFormat)) &&
    (value.holeCount === 9 || value.holeCount === 18) &&
    (value.nineHoleSegment === null || value.nineHoleSegment === 'FRONT_NINE' || value.nineHoleSegment === 'BACK_NINE') &&
    resultValid && typeof value.format === 'string' && typeof value.teeName === 'string' &&
    typeof value.courseId === 'string' && typeof value.courseName === 'string' &&
    typeof value.clubId === 'string' && typeof value.clubName === 'string'
}

function isPartner(value: unknown): value is PlayingPartner {
  if (!isObject(value) || !Array.isArray(value.courses) || !Array.isArray(value.formats) || !Array.isArray(value.rounds)) return false
  if (!isCount(value.roundsPlayed) || !isCount(value.wins) || !isCount(value.losses) ||
    !isCount(value.ties) || !isCount(value.roundsWithoutResult)) return false
  if (value.roundsPlayed !== value.rounds.length ||
    value.roundsPlayed !== value.wins + value.losses + value.ties + value.roundsWithoutResult) return false
  return typeof value.key === 'string' && (value.kind === 'FRIEND' || value.kind === 'GUEST') &&
    (value.playerId === null || typeof value.playerId === 'string') && typeof value.name === 'string' &&
    isHomeClub(value.homeClub) && (value.firstPlayed === null || isDate(value.firstPlayed)) &&
    (value.lastPlayed === null || isDate(value.lastPlayed)) &&
    value.courses.every((course) => isObject(course) && typeof course.courseId === 'string' &&
      typeof course.clubName === 'string' && typeof course.courseName === 'string' &&
      isCount(course.rounds) && isDate(course.lastPlayed)) &&
    value.formats.every((format) => isObject(format) && typeof format.name === 'string' && isCount(format.rounds)) &&
    value.rounds.every(isRound)
}

export function isPlayingPartnersHistoryResponse(value: unknown): value is PlayingPartnersHistoryResponse {
  if (!isObject(value) || !Array.isArray(value.partners) || !isObject(value.summary) || !value.partners.every(isPartner)) return false
  const summary = value.summary
  if (!isCount(summary.partners) || !isCount(summary.friends) || !isCount(summary.guests) || !isCount(summary.partnerAppearances)) return false
  return summary.partners === value.partners.length && summary.friends + summary.guests === summary.partners &&
    summary.partnerAppearances === value.partners.reduce((total, partner) => total + partner.roundsPlayed, 0)
}
