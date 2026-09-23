export type PartnerResult = 'WON' | 'LOST' | 'TIED' | null

type PlayerIdentity = {
  id: string
  name: string
  homeClub: { id: string; name: string } | null
}

type PartnerRound = {
  id: string
  userId: string
  datePlayed: Date
  createdAt: Date
  category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  participation: 'INDIVIDUAL' | 'TEAM'
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: number
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null
  competitionName: string | null
  competitionFormat: string | null
  gameFormat: string | null
  tee: {
    teeName: string
    course: { id: string; name: string; club: { id: string; name: string } }
  }
  user: PlayerIdentity
}

export type FriendPartnerRecord = {
  userId: string
  result: PartnerResult
  tagRemovedAt: Date | null
  user: PlayerIdentity
  round: PartnerRound
}

export type GuestPartnerRecord = {
  name: string
  normalizedName: string
  result: PartnerResult
  round: PartnerRound
}

function invertResult(result: PartnerResult): PartnerResult {
  if (result === 'WON') return 'LOST'
  if (result === 'LOST') return 'WON'
  return result
}

function formatName(round: PartnerRound): string {
  if (round.gameFormat) return round.gameFormat
  if (round.competitionFormat) return round.competitionFormat
  if (round.category === 'SOCIAL_GAME') return 'Game with friends'
  if (round.category === 'COMPETITION') return round.competitionName ?? 'Competition'
  return 'Casual round'
}

function roundDetail(
  round: PartnerRound,
  currentUserId: string,
  result: PartnerResult,
) {
  const ownedByPlayer = round.userId === currentUserId
  return {
    roundId: round.id,
    ownedByPlayer,
    recordedBy: round.user.name,
    datePlayed: round.datePlayed.toISOString().slice(0, 10),
    category: round.category,
    participation: round.participation,
    scoringFormat: round.scoringFormat,
    holeCount: round.holeCount as 9 | 18,
    nineHoleSegment: round.nineHoleSegment,
    format: formatName(round),
    result,
    teeName: round.tee.teeName,
    courseId: round.tee.course.id,
    courseName: round.tee.course.name,
    clubId: round.tee.course.club.id,
    clubName: round.tee.course.club.name,
  }
}

type RoundDetail = ReturnType<typeof roundDetail>
type PartnerAccumulator = {
  key: string
  kind: 'FRIEND' | 'GUEST'
  playerId: string | null
  name: string
  homeClub: PlayerIdentity['homeClub']
  rounds: RoundDetail[]
}

function summarizePartner(partner: PartnerAccumulator) {
  const orderedRounds = [...partner.rounds].sort((left, right) =>
    right.datePlayed.localeCompare(left.datePlayed) || right.roundId.localeCompare(left.roundId),
  )
  const courses = new Map<string, {
    courseId: string
    clubName: string
    courseName: string
    rounds: number
    lastPlayed: string
  }>()
  const formats = new Map<string, number>()
  for (const round of orderedRounds) {
    const course = courses.get(round.courseId)
    if (course) course.rounds += 1
    else courses.set(round.courseId, {
      courseId: round.courseId,
      clubName: round.clubName,
      courseName: round.courseName,
      rounds: 1,
      lastPlayed: round.datePlayed,
    })
    formats.set(round.format, (formats.get(round.format) ?? 0) + 1)
  }
  const wins = orderedRounds.filter((round) => round.result === 'WON').length
  const losses = orderedRounds.filter((round) => round.result === 'LOST').length
  const ties = orderedRounds.filter((round) => round.result === 'TIED').length
  return {
    key: partner.key,
    kind: partner.kind,
    playerId: partner.playerId,
    name: partner.name,
    homeClub: partner.homeClub,
    roundsPlayed: orderedRounds.length,
    wins,
    losses,
    ties,
    roundsWithoutResult: orderedRounds.length - wins - losses - ties,
    firstPlayed: orderedRounds.at(-1)?.datePlayed ?? null,
    lastPlayed: orderedRounds[0]?.datePlayed ?? null,
    courses: [...courses.values()].sort((left, right) =>
      right.rounds - left.rounds || right.lastPlayed.localeCompare(left.lastPlayed) || left.clubName.localeCompare(right.clubName),
    ),
    formats: [...formats].map(([name, rounds]) => ({ name, rounds }))
      .sort((left, right) => right.rounds - left.rounds || left.name.localeCompare(right.name)),
    rounds: orderedRounds,
  }
}

export function buildPlayingPartnersHistory(
  currentUserId: string,
  friendRecords: readonly FriendPartnerRecord[],
  guestRecords: readonly GuestPartnerRecord[],
) {
  const partners = new Map<string, PartnerAccumulator>()
  for (const record of friendRecords) {
    const ownedByPlayer = record.round.userId === currentUserId
    if (!ownedByPlayer && record.userId === currentUserId && record.tagRemovedAt !== null) continue
    const player = ownedByPlayer ? record.user : record.round.user
    const key = `friend:${player.id}`
    const partner = partners.get(key) ?? {
      key,
      kind: 'FRIEND' as const,
      playerId: player.id,
      name: player.name,
      homeClub: player.homeClub,
      rounds: [],
    }
    partner.rounds.push(roundDetail(
      record.round,
      currentUserId,
      ownedByPlayer ? record.result : invertResult(record.result),
    ))
    partners.set(key, partner)
  }
  for (const record of guestRecords) {
    const key = `guest:${record.normalizedName}`
    const partner = partners.get(key) ?? {
      key,
      kind: 'GUEST' as const,
      playerId: null,
      name: record.name,
      homeClub: null,
      rounds: [],
    }
    partner.rounds.push(roundDetail(record.round, currentUserId, record.result))
    partners.set(key, partner)
  }

  const history = [...partners.values()].map(summarizePartner)
    .sort((left, right) => right.roundsPlayed - left.roundsPlayed ||
      (right.lastPlayed ?? '').localeCompare(left.lastPlayed ?? '') || left.name.localeCompare(right.name))
  return {
    partners: history,
    summary: {
      partners: history.length,
      friends: history.filter((partner) => partner.kind === 'FRIEND').length,
      guests: history.filter((partner) => partner.kind === 'GUEST').length,
      partnerAppearances: history.reduce((total, partner) => total + partner.roundsPlayed, 0),
    },
  }
}
