import { prisma } from './database.js'
import {
  NineHoleSegment,
  type NineHoleSegment as NineHoleSegmentValue,
  RoundCategory,
  type RoundCategory as RoundCategoryValue,
  RoundGameResult,
  type RoundGameResult as RoundGameResultValue,
  RoundParticipation,
  type RoundParticipation as RoundParticipationValue,
  RoundScoringFormat,
  type RoundScoringFormat as RoundScoringFormatValue,
  RoundScorecardStatus,
  SubmissionType,
  WeatherCondition,
  type WeatherCondition as WeatherConditionValue,
} from './generated/prisma/enums.js'
import { isCompleteScorecard } from './courseScorecards.js'
import {
  calculateAdjustedGrossScore,
  calculateCourseHandicap,
  calculateHandicap,
  calculateHandicapStrokesReceived,
  calculateScoreDifferential,
} from './handicap.js'
import { parseRoundNotes, RoundNotesValidationError } from './roundNotes.js'
import { calculateStablefordRound } from './stableford.js'
import { parseMatchPlay, type MatchPlaySummary } from './matchPlay.js'
import {
  buildTeamCompetition,
  parseTeamCompetition,
  type TeamCompetitionInput,
} from './teamCompetition.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const HOLES_IN_ROUND = 18
const INITIAL_HANDICAP_STROKES_PER_HOLE = 3
const COMPETITION_NAME_MAX_LENGTH = 120
const COMPETITION_FORMAT_MAX_LENGTH = 100
const GAME_FORMAT_MAX_LENGTH = 100
const PLAYER_NAME_MAX_LENGTH = 80
const MAX_PLAYING_PARTNERS = 20

export const INDIVIDUAL_COMPETITION_FORMATS = [
  'Medal / Stroke Play',
  'Medal',
  'Stableford',
  'Match Play',
  'Bogey / Par',
] as const
export const TEAM_COMPETITION_FORMATS = [
  'Fourball Better Ball',
  'Foursomes',
  'Greensomes',
  'Scramble / Texas Scramble',
  'Texas Scramble',
] as const
export const SOCIAL_GAME_FORMATS = [
  'Wolf',
  'Sixes / Sixers',
  'Skins',
  'Nassau',
  'Match Play',
  'Bingo Bango Bongo',
] as const

// Product configuration: scored individual rounds can qualify for the
// simplified handicap calculation. Team entries are always record-only.
export const ROUND_ACCEPTABILITY_RULES = {
  scoredIndividualRoundIsAcceptable: true,
} as const

export type RoundHoleInput = {
  holeNumber: number
  par: number
  strokeIndex: number
  strokesTaken: number | null
  pickedUp: boolean
  yardage?: number
}

type LogRoundBase = {
  userId: string
  teeId: string
  datePlayed: Date
  timePlayed: string | null
  category: RoundCategoryValue
  competitionName: string | null
  competitionFormat: string | null
  gameFormat: string | null
  gameResult: RoundGameResultValue | null
  matchPlay: (MatchPlaySummary & { opponentName: string }) | null
  playingPartnerIds: string[]
  guestPlayerNames: string[]
  playingPartnerResults: Record<string, RoundGameResultValue | null>
  guestPlayerResults: Record<string, RoundGameResultValue | null>
  numberOfPlayers: number | null
  notes: string | null
  scoringFormat: RoundScoringFormatValue
  playingHandicap: number | null
  holeCount: 9 | 18
  nineHoleSegment: NineHoleSegmentValue | null
}

export type LogIndividualRoundInput = LogRoundBase & {
  participation: typeof RoundParticipation.INDIVIDUAL
  grossScore: number | null
  weatherCondition: WeatherConditionValue
  pccAdjustment: number
  holeScores: RoundHoleInput[]
  stablefordPoints: number | null
}

export type LogTeamRoundInput = LogRoundBase & {
  category: typeof RoundCategory.COMPETITION
  participation: typeof RoundParticipation.TEAM
  competitionName: string
  competitionFormat: string
  numberOfPlayers: number
  grossScore: null
  weatherCondition: null
  pccAdjustment: 0
  holeScores: []
  scoringFormat: typeof RoundScoringFormat.STROKE_PLAY
  playingHandicap: null
  stablefordPoints: null
  teamCompetition: TeamCompetitionInput
}

export type LogRoundInput = LogIndividualRoundInput | LogTeamRoundInput

export class RoundReferenceNotFoundError extends Error {
  constructor(readonly reference: 'user' | 'tee') {
    super(`${reference} not found`)
    this.name = 'RoundReferenceNotFoundError'
  }
}

export class RoundPlayingPartnersError extends Error {
  constructor() {
    super('Every linked player must be an accepted active friend')
    this.name = 'RoundPlayingPartnersError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getWeatherCondition(value: unknown): WeatherConditionValue | null {
  switch (value) {
    case WeatherCondition.DRY:
      return WeatherCondition.DRY
    case WeatherCondition.MOIST:
      return WeatherCondition.MOIST
    case WeatherCondition.WET:
      return WeatherCondition.WET
    case WeatherCondition.SUPER_WET:
      return WeatherCondition.SUPER_WET
    default:
      return null
  }
}

function getDatePlayed(value: unknown): Date | null {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return null
  }

  const datePlayed = new Date(`${value}T00:00:00.000Z`)

  if (
    !Number.isFinite(datePlayed.getTime()) ||
    datePlayed.toISOString().slice(0, 10) !== value
  ) {
    return null
  }

  return datePlayed
}

function getTimePlayed(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return typeof value === 'string' && TIME_PATTERN.test(value)
    ? value
    : null
}

function getRoundCategory(value: unknown): RoundCategoryValue | null {
  if (value === undefined) {
    return RoundCategory.CASUAL
  }

  return value === RoundCategory.CASUAL ||
    value === RoundCategory.COMPETITION ||
    value === RoundCategory.SOCIAL_GAME
    ? value
    : null
}

function getGameResult(value: unknown): RoundGameResultValue | null {
  if (value === undefined || value === null || value === '') return null
  return value === RoundGameResult.WON ||
    value === RoundGameResult.LOST ||
    value === RoundGameResult.TIED
    ? value
    : null
}

function getPlayingPartnerIds(value: unknown): string[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > MAX_PLAYING_PARTNERS) return null
  const ids = value.filter((item): item is string =>
    typeof item === 'string' && UUID_PATTERN.test(item),
  )
  return ids.length === value.length && new Set(ids).size === ids.length
    ? ids
    : null
}

function getGuestPlayerNames(value: unknown): string[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > MAX_PLAYING_PARTNERS) return null
  const names = value.map((item) => typeof item === 'string' ? item.trim() : '')
  const normalized = names.map((name) => name.toLocaleLowerCase('en-GB'))
  return names.every((name) => name.length >= 2 && name.length <= PLAYER_NAME_MAX_LENGTH) &&
    new Set(normalized).size === normalized.length
    ? names
    : null
}

function getOpponentResults(
  value: unknown,
  allowedKeys: readonly string[],
  normalizeKeys = false,
): Record<string, RoundGameResultValue | null> | null {
  if (value === undefined) return Object.fromEntries(allowedKeys.map((key) => [key, null]))
  if (!isRecord(value)) return null
  const normalizedAllowed = new Map(allowedKeys.map((key) => [
    normalizeKeys ? key.toLocaleLowerCase('en-GB') : key,
    key,
  ]))
  const results: Record<string, RoundGameResultValue | null> = {}
  for (const [rawKey, rawResult] of Object.entries(value)) {
    const key = normalizeKeys ? rawKey.toLocaleLowerCase('en-GB') : rawKey
    const storedKey = normalizedAllowed.get(key)
    const result = getGameResult(rawResult)
    if (!storedKey || (rawResult !== null && rawResult !== '' && result === null)) return null
    results[storedKey] = rawResult === null || rawResult === '' ? null : result
  }
  for (const key of allowedKeys) results[key] ??= null
  return results
}

function isOtherFormat(value: string): boolean {
  return value.startsWith('Other — ') && value.length > 'Other — '.length
}

function isCompetitionFormat(
  value: string,
  participation: RoundParticipationValue,
): boolean {
  const formats = participation === RoundParticipation.TEAM
    ? TEAM_COMPETITION_FORMATS
    : INDIVIDUAL_COMPETITION_FORMATS
  return (formats as readonly string[]).includes(value) || isOtherFormat(value)
}

function isGameFormat(value: string): boolean {
  return (SOCIAL_GAME_FORMATS as readonly string[]).includes(value) || isOtherFormat(value)
}

function getRoundParticipation(
  value: unknown,
): RoundParticipationValue | null {
  if (value === undefined) {
    return RoundParticipation.INDIVIDUAL
  }

  return value === RoundParticipation.INDIVIDUAL ||
    value === RoundParticipation.TEAM
    ? value
    : null
}

function getRoundScoringFormat(value: unknown): RoundScoringFormatValue | null {
  if (value === undefined) {
    return RoundScoringFormat.STROKE_PLAY
  }

  return value === RoundScoringFormat.STROKE_PLAY ||
    value === RoundScoringFormat.STABLEFORD
    ? value
    : null
}

function getNineHoleSegment(value: unknown): NineHoleSegmentValue | null {
  return value === NineHoleSegment.FRONT_NINE ||
    value === NineHoleSegment.BACK_NINE
    ? value
    : null
}

function getRequiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()

  return trimmedValue.length >= 2 && trimmedValue.length <= maxLength
    ? trimmedValue
    : null
}

function getHoleScores(
  value: unknown,
  allowPickedUp: boolean,
  holeCount: 9 | 18,
  nineHoleSegment: NineHoleSegmentValue | null,
): RoundHoleInput[] | null {
  if (!Array.isArray(value) || value.length !== holeCount) {
    return null
  }

  const holeScores: RoundHoleInput[] = []

  for (const score of value) {
    const pickedUp = isRecord(score) && score.pickedUp === true
    if (
      !isRecord(score) ||
      typeof score.holeNumber !== 'number' ||
      !Number.isInteger(score.holeNumber) ||
      score.holeNumber < 1 ||
      score.holeNumber > HOLES_IN_ROUND ||
      typeof score.par !== 'number' ||
      !Number.isInteger(score.par) ||
      score.par < 2 ||
      score.par > 7 ||
      typeof score.strokeIndex !== 'number' ||
      !Number.isInteger(score.strokeIndex) ||
      score.strokeIndex < 1 ||
      score.strokeIndex > HOLES_IN_ROUND ||
      (pickedUp
        ? !allowPickedUp ||
          (score.strokesTaken !== null && score.strokesTaken !== undefined)
        : typeof score.strokesTaken !== 'number' ||
          !Number.isInteger(score.strokesTaken) ||
          score.strokesTaken <= 0) ||
      (score.yardage !== undefined &&
        (typeof score.yardage !== 'number' ||
          !Number.isInteger(score.yardage) ||
          score.yardage <= 0))
    ) {
      return null
    }

    holeScores.push({
      holeNumber: score.holeNumber,
      par: score.par,
      strokeIndex: score.strokeIndex,
      strokesTaken: pickedUp ? null : (score.strokesTaken as number),
      pickedUp,
      ...(typeof score.yardage === 'number'
        ? { yardage: score.yardage }
        : {}),
    })
  }

  const holeNumbers = new Set(holeScores.map(({ holeNumber }) => holeNumber))
  const strokeIndexes = new Set(
    holeScores.map(({ strokeIndex }) => strokeIndex),
  )

  const expectedHoleNumbers = holeCount === 18
    ? Array.from({ length: 18 }, (_, index) => index + 1)
    : Array.from(
        { length: 9 },
        (_, index) => index + (nineHoleSegment === NineHoleSegment.BACK_NINE ? 10 : 1),
      )

  if (
    holeNumbers.size !== holeCount ||
    strokeIndexes.size !== holeCount ||
    expectedHoleNumbers.some((holeNumber) => !holeNumbers.has(holeNumber))
  ) {
    return null
  }

  return holeScores
}

export function parseLogRoundInput(value: unknown): LogRoundInput | null {
  if (!isRecord(value)) {
    return null
  }

  const datePlayed = getDatePlayed(value.datePlayed)
  const timePlayed = getTimePlayed(value.timePlayed)
  const category = getRoundCategory(value.category)
  const participation = getRoundParticipation(value.participation)
  const scoringFormat = getRoundScoringFormat(value.scoringFormat)
  const gameResult = getGameResult(value.gameResult)
  const playingPartnerIds = getPlayingPartnerIds(value.playingPartnerIds)
  const guestPlayerNames = getGuestPlayerNames(value.guestPlayerNames)
  const playingPartnerResults = playingPartnerIds === null
    ? null
    : getOpponentResults(value.playingPartnerResults, playingPartnerIds)
  const guestPlayerResults = guestPlayerNames === null
    ? null
    : getOpponentResults(value.guestPlayerResults, guestPlayerNames, true)
  const holeCount = value.holeCount === undefined ? 18 : value.holeCount
  const nineHoleSegment = holeCount === 9
    ? getNineHoleSegment(value.nineHoleSegment)
    : null
  let notes: string | null

  try {
    notes = parseRoundNotes(value.notes)
  } catch (error: unknown) {
    if (error instanceof RoundNotesValidationError) {
      return null
    }
    throw error
  }

  if (
    typeof value.userId !== 'string' ||
    !UUID_PATTERN.test(value.userId) ||
    typeof value.teeId !== 'string' ||
    !UUID_PATTERN.test(value.teeId) ||
    !datePlayed ||
    !category ||
    !participation ||
    !scoringFormat ||
    playingPartnerIds === null ||
    guestPlayerNames === null ||
    playingPartnerResults === null ||
    guestPlayerResults === null ||
    (holeCount !== 9 && holeCount !== 18) ||
    (holeCount === 9 && nineHoleSegment === null) ||
    (holeCount === 18 && value.nineHoleSegment !== undefined && value.nineHoleSegment !== null) ||
    (value.timePlayed !== undefined && timePlayed === null)
  ) {
    return null
  }

  const isCompetition = category === RoundCategory.COMPETITION
  const isSocialGame = category === RoundCategory.SOCIAL_GAME
  const competitionName = isCompetition
    ? getRequiredText(value.competitionName, COMPETITION_NAME_MAX_LENGTH)
    : null
  const competitionFormat = isCompetition
    ? getRequiredText(value.competitionFormat, COMPETITION_FORMAT_MAX_LENGTH)
    : null
  const gameFormat = isSocialGame
    ? getRequiredText(value.gameFormat, GAME_FORMAT_MAX_LENGTH)
    : null
  const numberOfPlayers = isCompetition || isSocialGame ? value.numberOfPlayers : null
  const isMatchPlay = participation === RoundParticipation.INDIVIDUAL &&
    (competitionFormat === 'Match Play' || gameFormat === 'Match Play')

  if (
    (category === RoundCategory.CASUAL &&
      (participation !== RoundParticipation.INDIVIDUAL ||
        value.competitionName !== undefined ||
        value.competitionFormat !== undefined ||
        value.gameFormat !== undefined ||
        value.gameResult !== undefined ||
        value.numberOfPlayers !== undefined ||
        value.playingPartnerIds !== undefined ||
        value.guestPlayerNames !== undefined ||
        value.matchPlayOpponentName !== undefined ||
        value.matchPlayHoles !== undefined)) ||
    (isCompetition &&
      (!competitionName ||
        !competitionFormat ||
        !isCompetitionFormat(competitionFormat, participation) ||
        typeof numberOfPlayers !== 'number' ||
        !Number.isInteger(numberOfPlayers) ||
        numberOfPlayers <= 0 ||
        numberOfPlayers > 10000 ||
        value.gameFormat !== undefined ||
        value.gameResult !== undefined)) ||
    (isSocialGame &&
      (participation !== RoundParticipation.INDIVIDUAL ||
        !gameFormat ||
        !isGameFormat(gameFormat) ||
        typeof numberOfPlayers !== 'number' ||
        !Number.isInteger(numberOfPlayers) ||
        numberOfPlayers <= 0 ||
        numberOfPlayers > 100 ||
        value.competitionName !== undefined ||
        value.competitionFormat !== undefined ||
        (value.gameResult !== undefined && gameResult === null)))
  ) {
    return null
  }

  if (
    (isCompetition || isSocialGame) &&
    typeof numberOfPlayers === 'number' &&
    playingPartnerIds.length + guestPlayerNames.length > numberOfPlayers - 1
  ) {
    return null
  }

  if (participation === RoundParticipation.TEAM) {
    const teamCompetition = parseTeamCompetition(value.teamCompetition)
    const teamCompetitionPlayerCount = teamCompetition
      ? 1 + playingPartnerIds.length + guestPlayerNames.length + teamCompetition.opponents.reduce((sum, team) => sum + team.members.length, 0)
      : 0
    if (
      category !== RoundCategory.COMPETITION ||
      timePlayed === null ||
      !competitionName ||
      !competitionFormat ||
      typeof numberOfPlayers !== 'number' ||
      (value.grossScore !== undefined && value.grossScore !== null) ||
      (value.weatherCondition !== undefined &&
        value.weatherCondition !== null) ||
      (value.holeScores !== undefined && value.holeScores !== null) ||
      (value.pccAdjustment !== undefined && value.pccAdjustment !== 0) ||
      scoringFormat !== RoundScoringFormat.STROKE_PLAY ||
      value.playingHandicap !== undefined ||
      value.matchPlayOpponentName !== undefined ||
      value.matchPlayHoles !== undefined
      || holeCount !== 18 || !teamCompetition || numberOfPlayers !== teamCompetitionPlayerCount
    ) {
      return null
    }

    return {
      userId: value.userId,
      teeId: value.teeId,
      datePlayed,
      timePlayed,
      category,
      participation,
      competitionName,
      competitionFormat,
      gameFormat: null,
      gameResult: null,
      matchPlay: null,
      playingPartnerIds,
      guestPlayerNames,
      playingPartnerResults,
      guestPlayerResults,
      numberOfPlayers,
      notes,
      scoringFormat: RoundScoringFormat.STROKE_PLAY,
      playingHandicap: null,
      grossScore: null,
      weatherCondition: null,
      pccAdjustment: 0,
      holeScores: [],
      stablefordPoints: null,
      holeCount: 18,
      nineHoleSegment: null,
      teamCompetition,
    }
  }

  if (value.teamCompetition !== undefined && value.teamCompetition !== null) {
    return null
  }

  const weatherCondition = getWeatherCondition(value.weatherCondition)
  const isStableford = scoringFormat === RoundScoringFormat.STABLEFORD
  const holeScores = getHoleScores(
    value.holeScores,
    isStableford,
    holeCount as 9 | 18,
    nineHoleSegment,
  )
  const pccAdjustment = value.pccAdjustment ?? 0
  const playingHandicap = isStableford ? value.playingHandicap : null
  const hasPickedUpHole = holeScores?.some((hole) => hole.pickedUp) ?? false
  const grossScore = value.grossScore
  const expectedHoleNumbers = holeCount === 18
    ? Array.from({ length: 18 }, (_, index) => index + 1)
    : Array.from(
        { length: 9 },
        (_, index) => index + (nineHoleSegment === NineHoleSegment.BACK_NINE ? 10 : 1),
      )
  const matchPlayOpponentName = isMatchPlay
    ? getRequiredText(value.matchPlayOpponentName, PLAYER_NAME_MAX_LENGTH)
    : null
  const matchPlay = isMatchPlay
    ? parseMatchPlay(value.matchPlayHoles, expectedHoleNumbers, holeScores ?? [])
    : null

  if (
    (hasPickedUpHole
      ? grossScore !== null && grossScore !== undefined
      : typeof grossScore !== 'number' ||
        !Number.isInteger(grossScore) ||
        grossScore <= 0) ||
    !weatherCondition ||
    typeof pccAdjustment !== 'number' ||
    !Number.isFinite(pccAdjustment) ||
    pccAdjustment < -9.9 ||
    pccAdjustment > 9.9 ||
    holeScores === null ||
    (isMatchPlay && (!matchPlayOpponentName || !matchPlay)) ||
    (isMatchPlay && value.gameResult !== undefined) ||
    (isMatchPlay && playingPartnerIds.length + guestPlayerNames.length !== 1) ||
    (isMatchPlay && guestPlayerNames.length === 1 && guestPlayerNames[0] !== matchPlayOpponentName) ||
    (!isMatchPlay &&
      (value.matchPlayOpponentName !== undefined || value.matchPlayHoles !== undefined)) ||
    (isSocialGame && isMatchPlay && numberOfPlayers !== 2) ||
    (isStableford
      ? typeof playingHandicap !== 'number' ||
        !Number.isInteger(playingHandicap) ||
        playingHandicap < -20 ||
        playingHandicap > 54
      : value.playingHandicap !== undefined && value.playingHandicap !== null)
  ) {
    return null
  }

  if (
    !hasPickedUpHole &&
    holeScores.reduce((total, hole) => total + Number(hole.strokesTaken), 0) !==
      grossScore
  ) {
    return null
  }

  return {
    userId: value.userId,
    teeId: value.teeId,
    datePlayed,
    timePlayed,
    category,
    participation,
    competitionName,
    competitionFormat,
    gameFormat,
    gameResult: matchPlay?.result ?? gameResult,
    matchPlay: matchPlay && matchPlayOpponentName
      ? { ...matchPlay, opponentName: matchPlayOpponentName }
      : null,
    playingPartnerIds,
    guestPlayerNames,
    playingPartnerResults,
    guestPlayerResults,
    numberOfPlayers:
      typeof numberOfPlayers === 'number' ? numberOfPlayers : null,
    notes,
    scoringFormat,
    playingHandicap: isStableford ? (playingHandicap as number) : null,
    grossScore: typeof grossScore === 'number' ? grossScore : null,
    weatherCondition,
    pccAdjustment,
    holeScores,
    stablefordPoints: isStableford
      ? calculateStablefordRound(holeScores, playingHandicap as number).totalPoints
      : null,
    holeCount: holeCount as 9 | 18,
    nineHoleSegment,
  }
}

export async function logRound(input: LogRoundInput) {
  return prisma.$transaction(async (transaction) => {
    const [user, tee] = await Promise.all([
      transaction.user.findUnique({
        where: { id: input.userId },
        select: { name: true, handicapIndex: true },
      }),
      transaction.tee.findUnique({
        where: { id: input.teeId },
        select: {
          teeName: true,
          courseRating: true,
          slopeRating: true,
          par: true,
          holes: {
            orderBy: { holeNumber: 'asc' },
            select: {
              holeNumber: true,
              par: true,
              strokeIndex: true,
              yardage: true,
            },
          },
          frontNineCourseRating: true,
          frontNineSlopeRating: true,
          backNineCourseRating: true,
          backNineSlopeRating: true,
          course: {
            select: {
              name: true,
              club: { select: { name: true } },
            },
          },
        },
      }),
    ])

    if (!user) {
      throw new RoundReferenceNotFoundError('user')
    }

    if (!tee) {
      throw new RoundReferenceNotFoundError('tee')
    }

    if (input.playingPartnerIds.includes(input.userId)) {
      throw new RoundPlayingPartnersError()
    }

    if (input.playingPartnerIds.length > 0) {
      const friendships = await transaction.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          requester: { status: 'ACTIVE' },
          addressee: { status: 'ACTIVE' },
          OR: input.playingPartnerIds.flatMap((friendId) => [
            { requesterId: input.userId, addresseeId: friendId },
            { requesterId: friendId, addresseeId: input.userId },
          ]),
        },
        select: { requesterId: true, addresseeId: true },
      })
      const acceptedIds = new Set(friendships.map((friendship) =>
        friendship.requesterId === input.userId
          ? friendship.addresseeId
          : friendship.requesterId,
      ))
      if (input.playingPartnerIds.some((friendId) => !acceptedIds.has(friendId))) {
        throw new RoundPlayingPartnersError()
      }
    }

    const courseRating = Number(tee.courseRating)
    const currentHandicapIndex =
      user.handicapIndex === null ? null : Number(user.handicapIndex)

    if (input.participation === RoundParticipation.TEAM) {
      const partnerUsers = input.playingPartnerIds.length === 0 ? [] : await transaction.user.findMany({
        where: { id: { in: input.playingPartnerIds } },
        select: { id: true, name: true },
      })
      const partnerNames = new Map(partnerUsers.map((partner) => [partner.id, partner.name]))
      const teamCompetition = buildTeamCompetition(input.teamCompetition, [
        user.name,
        ...input.playingPartnerIds.flatMap((id) => partnerNames.get(id) ?? []),
        ...input.guestPlayerNames,
      ])
      const createdRound = await transaction.round.create({
        data: {
          userId: input.userId,
          teeId: input.teeId,
          datePlayed: input.datePlayed,
          timePlayed: input.timePlayed,
          category: input.category,
          participation: input.participation,
          scoringFormat: input.scoringFormat,
          playingHandicap: null,
          stablefordPoints: null,
          holeCount: 18,
          nineHoleSegment: null,
          competitionName: input.competitionName,
          competitionFormat: input.competitionFormat,
          gameFormat: input.gameFormat,
          gameResult: input.gameResult,
          teamCompetition,
          guestPlayerNames: input.guestPlayerNames,
          numberOfPlayers: input.numberOfPlayers,
          notes: input.notes,
          grossScore: null,
          adjustedGrossScore: null,
          isCapped: false,
          weatherCondition: null,
          pccAdjustment: 0,
          scoreDifferential: null,
          isAcceptable: false,
          usedInHandicapCalc: false,
          scorecardStatus: RoundScorecardStatus.NOT_REQUIRED,
          playingPartners: {
            create: input.playingPartnerIds.map((userId) => ({
              user: { connect: { id: userId } },
              result: input.playingPartnerResults[userId] ?? null,
            })),
          },
          guestPlayers: {
            create: input.guestPlayerNames.map((name) => ({
              name,
              normalizedName: name.toLocaleLowerCase('en-GB'),
              result: input.guestPlayerResults[name] ?? null,
            })),
          },
        },
        include: {
          holeScores: {
            orderBy: { holeNumber: 'asc' },
          },
          playingPartners: {
            select: { result: true, user: { select: { id: true, name: true } } },
          },
          guestPlayers: { select: { name: true, result: true } },
        },
      })
      const countingRounds = await transaction.round.findMany({
        where: {
          userId: input.userId,
          usedInHandicapCalc: true,
        },
        select: { id: true },
      })

      return {
        round: {
          ...createdRound,
          playingPartners: (createdRound.playingPartners ?? []).map(({ user, result }) => ({ ...user, result })),
          pccAdjustment: Number(createdRound.pccAdjustment),
          scoreDifferential: null,
          usedInHandicapCalc: false,
        },
        handicapIndex: currentHandicapIndex,
        usedRoundIds: countingRounds.map(({ id }) => id),
      }
    }

    const expectedHoleNumbers = input.holeCount === 18
      ? Array.from({ length: 18 }, (_, index) => index + 1)
      : Array.from(
          { length: 9 },
          (_, index) => index + (input.nineHoleSegment === NineHoleSegment.BACK_NINE ? 10 : 1),
        )
    const hasSavedScorecard = input.holeCount === 18
      ? isCompleteScorecard(tee.holes ?? [])
      : expectedHoleNumbers.every((holeNumber) =>
          tee.holes.some((hole) => hole.holeNumber === holeNumber),
        )
    const effectiveHoleScores = input.holeScores.map((submittedHole) => {
      const savedHole = hasSavedScorecard
        ? tee.holes?.find(
            (hole) => hole.holeNumber === submittedHole.holeNumber,
          )
        : undefined

      return {
        holeNumber: submittedHole.holeNumber,
        par: savedHole?.par ?? submittedHole.par,
        strokeIndex: savedHole?.strokeIndex ?? submittedHole.strokeIndex,
        strokesTaken: submittedHole.strokesTaken,
        pickedUp: submittedHole.pickedUp,
        ...(savedHole?.yardage ?? submittedHole.yardage
          ? { yardage: savedHole?.yardage ?? submittedHole.yardage }
          : {}),
      }
    })
    const manualReviewRequired = !hasSavedScorecard
    const stablefordPoints =
      input.scoringFormat === RoundScoringFormat.STABLEFORD &&
      input.playingHandicap !== null
        ? calculateStablefordRound(
            effectiveHoleScores,
            input.playingHandicap,
          ).totalPoints
        : null
    const coursePar = input.holeCount === 18
      ? tee.par ?? effectiveHoleScores.reduce((total, hole) => total + hole.par, 0)
      : effectiveHoleScores.reduce((total, hole) => total + hole.par, 0)
    const ratedNineCourseRating = input.nineHoleSegment === NineHoleSegment.FRONT_NINE
      ? tee.frontNineCourseRating
      : tee.backNineCourseRating
    const ratedNineSlopeRating = input.nineHoleSegment === NineHoleSegment.FRONT_NINE
      ? tee.frontNineSlopeRating
      : tee.backNineSlopeRating
    const calculationCourseRating = input.holeCount === 18
      ? courseRating
      : ratedNineCourseRating === null
        ? null
        : Number(ratedNineCourseRating)
    const calculationSlopeRating = input.holeCount === 18
      ? tee.slopeRating
      : ratedNineSlopeRating
    const courseHandicap =
      currentHandicapIndex === null || calculationCourseRating === null || calculationSlopeRating === null
        ? null
        : calculateCourseHandicap({
            handicapIndex: currentHandicapIndex,
            slopeRating: calculationSlopeRating,
            courseRating: calculationCourseRating,
            par: coursePar,
          })
    const strokeIndexRank = new Map(
      [...effectiveHoleScores]
        .sort((left, right) => left.strokeIndex - right.strokeIndex)
        .map((hole, index) => [hole.holeNumber, index + 1]),
    )
    const adjustedHoleScores = effectiveHoleScores.map((hole) => {
      const handicapStrokesReceived =
        courseHandicap === null
          ? INITIAL_HANDICAP_STROKES_PER_HOLE
          : input.holeCount === 18
            ? calculateHandicapStrokesReceived(courseHandicap, hole.strokeIndex)
            : Math.floor(
                (courseHandicap + input.holeCount -
                  (strokeIndexRank.get(hole.holeNumber) ?? hole.strokeIndex)) /
                  input.holeCount,
              )

      return {
        par: hole.par,
        strokesTaken:
          hole.strokesTaken ?? hole.par + 2 + handicapStrokesReceived,
        handicapStrokesReceived,
      }
    })
    const calculationGrossScore =
      input.grossScore ??
      adjustedHoleScores.reduce((total, hole) => total + hole.strokesTaken, 0)
    const { adjustedGrossScore, isCapped } =
      calculateAdjustedGrossScore({
        grossScore: calculationGrossScore,
        ...(adjustedHoleScores ? { holeScores: adjustedHoleScores } : {}),
      })
    const scoreDifferential = input.holeCount === 18
      ? calculateScoreDifferential({
          adjustedGrossScore,
          courseRating,
          slopeRating: tee.slopeRating,
          pccAdjustment: input.pccAdjustment,
        })
      : null
    const isAcceptable =
      ROUND_ACCEPTABILITY_RULES.scoredIndividualRoundIsAcceptable &&
      !manualReviewRequired &&
      input.holeCount === 18

    const createdRound = await transaction.round.create({
      data: {
        userId: input.userId,
        teeId: input.teeId,
        datePlayed: input.datePlayed,
        timePlayed: input.timePlayed,
        category: input.category,
        participation: input.participation,
        scoringFormat: input.scoringFormat,
        playingHandicap: input.playingHandicap,
        stablefordPoints,
        holeCount: input.holeCount,
        nineHoleSegment: input.nineHoleSegment,
        competitionName: input.competitionName,
        competitionFormat: input.competitionFormat,
        gameFormat: input.gameFormat,
        gameResult: input.gameResult,
        ...(input.matchPlay ? {
          matchPlayOpponentName: input.matchPlay.opponentName,
          matchPlayFinalScore: input.matchPlay.finalScore,
          matchPlayHoles: input.matchPlay.holes,
        } : {}),
        guestPlayerNames: input.guestPlayerNames,
        numberOfPlayers: input.numberOfPlayers,
        notes: input.notes,
        grossScore: input.grossScore,
        adjustedGrossScore,
        isCapped: isCapped || effectiveHoleScores.some((hole) => hole.pickedUp),
        weatherCondition: input.weatherCondition,
        pccAdjustment: input.pccAdjustment,
        scoreDifferential,
        isAcceptable,
        scorecardStatus: manualReviewRequired
          ? RoundScorecardStatus.PENDING_REVIEW
          : RoundScorecardStatus.VERIFIED,
        holeScores: {
          create: effectiveHoleScores.map(({ yardage: _yardage, ...hole }) => ({
            ...hole,
            strokesTaken: hole.strokesTaken ?? 0,
          })),
        },
        playingPartners: {
          create: input.playingPartnerIds.map((userId) => ({
            user: { connect: { id: userId } },
            result: input.playingPartnerResults[userId] ?? null,
          })),
        },
        guestPlayers: {
          create: input.guestPlayerNames.map((name) => ({
            name,
            normalizedName: name.toLocaleLowerCase('en-GB'),
            result: input.guestPlayerResults[name] ?? null,
          })),
        },
        ...(manualReviewRequired
          ? {
              scorecardReview: {
                create: {
                  tee: { connect: { id: input.teeId } },
                  submission: {
                    create: {
                      userId: input.userId,
                      type: SubmissionType.SCORECARD_REVIEW,
                      subject: `Scorecard review: ${tee.course?.name ?? tee.teeName}`,
                      message: input.holeCount === 9
                        ? 'Player-entered nine-hole pars and stroke indexes require administrator approval for future scorecard use. This round remains outside the Handicap Index until official expected-differential support is available.'
                        : 'Player-entered hole pars and stroke indexes require administrator approval before this round can count towards the Handicap Index.',
                      clubName: tee.course?.club.name,
                      courseName: tee.course?.name,
                      teeDetails: tee.teeName,
                      adminHasUnread: true,
                    },
                  },
                  holes: {
                    create: effectiveHoleScores.map(
                      ({ strokesTaken: _strokesTaken, pickedUp: _pickedUp, ...hole }) => hole,
                    ),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        holeScores: {
          orderBy: { holeNumber: 'asc' },
        },
      playingPartners: {
        select: { result: true, user: { select: { id: true, name: true } } },
      },
      guestPlayers: { select: { name: true, result: true } },
      },
    })

    const recentRounds = await transaction.round.findMany({
      where: {
        userId: input.userId,
        isAcceptable: true,
        participation: RoundParticipation.INDIVIDUAL,
        scoreDifferential: { not: null },
      },
      orderBy: [{ datePlayed: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        datePlayed: true,
        scoreDifferential: true,
        isAcceptable: true,
      },
    })
    const handicapCalculation = calculateHandicap(
      recentRounds.flatMap((round) =>
        round.scoreDifferential === null
          ? []
          : [
              {
                ...round,
                scoreDifferential: Number(round.scoreDifferential),
              },
            ],
      ),
    )

    await transaction.round.updateMany({
      where: {
        userId: input.userId,
        usedInHandicapCalc: true,
      },
      data: { usedInHandicapCalc: false },
    })

    if (handicapCalculation.usedRoundIds.length > 0) {
      await transaction.round.updateMany({
        where: {
          id: { in: handicapCalculation.usedRoundIds },
        },
        data: { usedInHandicapCalc: true },
      })
    }

    await transaction.user.update({
      where: { id: input.userId },
      data: { handicapIndex: handicapCalculation.handicapIndex },
    })

    return {
      round: {
        ...createdRound,
        playingPartners: (createdRound.playingPartners ?? []).map(({ user, result }) => ({ ...user, result })),
        pccAdjustment: Number(createdRound.pccAdjustment),
        scoreDifferential:
          createdRound.scoreDifferential === null
            ? null
            : Number(createdRound.scoreDifferential),
        usedInHandicapCalc: handicapCalculation.usedRoundIds.includes(
          createdRound.id,
        ),
      },
      handicapIndex: handicapCalculation.handicapIndex,
      usedRoundIds: handicapCalculation.usedRoundIds,
    }
  })
}
