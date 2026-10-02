import { prisma } from './database.js'
import {
  GroupRoundCardStatus,
  RoundScorecardStatus,
  RoundScoringFormat,
  WeatherCondition,
} from './generated/prisma/enums.js'
import { parseLiveRoundDraftState, type LiveRoundDraftState } from './liveRounds.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export class PartialRoundError extends Error {
  constructor(readonly status: 400 | 404 | 409, message: string) {
    super(message)
  }
}

type SavedHole = {
  holeNumber: number
  par: number
  strokeIndex: number
  strokesTaken: number
  pickedUp: boolean
  putts: number | null
  fairwayResult: 'HIT' | 'MISSED_LEFT' | 'MISSED_RIGHT' | 'NOT_APPLICABLE' | null
  greenInRegulation: boolean | null
  penaltyStrokes: number | null
  bunkerVisits: number | null
  upAndDownResult: 'NOT_ATTEMPTED' | 'SUCCESSFUL' | 'UNSUCCESSFUL' | null
}

function optionalCount(value: string): number | null {
  if (value === '') return null
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0 || number > 9) throw new PartialRoundError(400, 'Check the optional hole statistics.')
  return number
}

export function recordedHoles(state: LiveRoundDraftState): SavedHole[] {
  const result: SavedHole[] = []
  for (const hole of state.holeEntries) {
    const par = Number(hole.par)
    const strokeIndex = Number(hole.strokeIndex)
    if (!Number.isInteger(par) || par < 2 || par > 7 ||
        !Number.isInteger(strokeIndex) || strokeIndex < 1 || strokeIndex > 18) {
      throw new PartialRoundError(400, 'The scorecard has invalid par or stroke index values.')
    }
    if (hole.strokesTaken === '' && !hole.pickedUp) continue
    const strokes = Number(hole.strokesTaken)
    if (hole.pickedUp ? hole.strokesTaken !== '' : !Number.isInteger(strokes) || strokes < 1 || strokes > 30) {
      throw new PartialRoundError(400, 'Check the scored or picked-up holes.')
    }
    result.push({
      holeNumber: hole.holeNumber,
      par,
      strokeIndex,
      strokesTaken: hole.pickedUp ? 0 : strokes,
      pickedUp: hole.pickedUp,
      putts: optionalCount(hole.putts),
      fairwayResult: hole.fairwayResult || null,
      greenInRegulation: hole.greenInRegulation === '' ? null : hole.greenInRegulation === 'YES',
      penaltyStrokes: optionalCount(hole.penaltyStrokes),
      bunkerVisits: optionalCount(hole.bunkerVisits),
      upAndDownResult: hole.upAndDownResult || null,
    })
  }
  return result
}

export async function submitRecordOnlyRound(input: {
  userId: string
  draftId: string
  expectedRevision: number
}) {
  if (!UUID_PATTERN.test(input.userId) || !UUID_PATTERN.test(input.draftId) ||
      !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
    throw new PartialRoundError(400, 'Invalid live round reference.')
  }
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.round.findUnique({
      where: { sourceLiveRoundDraftId: input.draftId }, select: { id: true, userId: true },
    })
    if (existing) {
      if (existing.userId !== input.userId) throw new PartialRoundError(404, 'Live round not found.')
      return { round: { id: existing.id } }
    }
    const draft = await transaction.liveRoundDraft.findFirst({
      where: { id: input.draftId, userId: input.userId, revision: input.expectedRevision },
      select: { id: true, teeId: true, state: true },
    })
    if (!draft) throw new PartialRoundError(409, 'The live round changed or was already submitted.')
    const state = parseLiveRoundDraftState(draft.state)
    if (!state || state.tee.id !== draft.teeId || state.form.category !== 'CASUAL' ||
        state.form.participation !== 'INDIVIDUAL' || state.scorecardStatus !== 'available') {
      throw new PartialRoundError(400, 'This card cannot be submitted as a record-only round.')
    }
    const form = state.form
    if (typeof form.datePlayed !== 'string' || !DATE_PATTERN.test(form.datePlayed) ||
        Number.isNaN(Date.parse(`${form.datePlayed}T00:00:00Z`)) ||
        typeof form.timePlayed !== 'string' || !TIME_PATTERN.test(form.timePlayed) ||
        (form.scoringFormat !== 'STROKE_PLAY' && form.scoringFormat !== 'STABLEFORD') ||
        typeof form.notes !== 'string' || form.notes.length > 2000 ||
        typeof form.weatherCondition !== 'string' || !Object.values(WeatherCondition).includes(form.weatherCondition as WeatherCondition)) {
      throw new PartialRoundError(400, 'Check the round date, format and notes.')
    }
    const handicap = form.scoringFormat === 'STABLEFORD' ? Number(form.playingHandicap) : null
    if (handicap !== null && (!Number.isInteger(handicap) || handicap < -20 || handicap > 54)) {
      throw new PartialRoundError(400, 'Enter a valid Playing Handicap.')
    }
    const holes = recordedHoles(state)
    if (holes.length === 0) throw new PartialRoundError(400, 'Score or pick up at least one hole before submitting.')
    const groupPlayers = (state.groupPlayers ?? []).filter((player) =>
      player.holeEntries.some((hole) => hole.pickedUp || hole.strokesTaken !== ''))
    const friendIds = groupPlayers.filter((player) => player.kind === 'friend').map((player) => player.id)
    if (friendIds.length > 0) {
      const friendships = await transaction.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: friendIds.flatMap((id) => [
            { requesterId: input.userId, addresseeId: id },
            { requesterId: id, addresseeId: input.userId },
          ]),
        },
        select: { requesterId: true, addresseeId: true },
      })
      const accepted = new Set(friendships.map((item) => item.requesterId === input.userId ? item.addresseeId : item.requesterId))
      if (friendIds.some((id) => !accepted.has(id))) throw new PartialRoundError(400, 'Only accepted friends can be linked to this card.')
    }
    const created = await transaction.round.create({
      data: {
        sourceLiveRoundDraftId: draft.id,
        isPartial: true,
        userId: input.userId,
        teeId: draft.teeId,
        datePlayed: new Date(`${form.datePlayed}T00:00:00Z`),
        timePlayed: form.timePlayed,
        category: 'CASUAL',
        participation: 'INDIVIDUAL',
        scoringFormat: form.scoringFormat as RoundScoringFormat,
        holeCount: form.holeCount,
        nineHoleSegment: form.holeCount === 9 ? form.nineHoleSegment as 'FRONT_NINE' | 'BACK_NINE' : null,
        playingHandicap: handicap,
        notes: form.notes.trim() || null,
        grossScore: null,
        adjustedGrossScore: null,
        scoreDifferential: null,
        weatherCondition: form.weatherCondition as WeatherCondition,
        pccAdjustment: 0,
        isAcceptable: false,
        usedInHandicapCalc: false,
        scorecardStatus: RoundScorecardStatus.NOT_REQUIRED,
        holeScores: { create: holes },
        hostedGroupCards: {
          create: groupPlayers.map((player) => ({
            ...(player.kind === 'friend'
              ? { friend: { connect: { id: player.id } }, status: GroupRoundCardStatus.PENDING }
              : { guestName: player.name, status: GroupRoundCardStatus.GUEST }),
            state: { holeEntries: player.holeEntries },
          })),
        },
      },
      select: { id: true },
    })
    await transaction.liveRoundDraft.delete({ where: { id: draft.id, revision: input.expectedRevision } })
    return { round: { id: created.id } }
  })
}

export async function approveGroupRoundCard(input: { cardId: string; friendId: string }) {
  if (!UUID_PATTERN.test(input.cardId) || !UUID_PATTERN.test(input.friendId)) {
    throw new PartialRoundError(400, 'Invalid group card reference.')
  }
  return prisma.$transaction(async (transaction) => {
    const card = await transaction.groupRoundCard.findFirst({
      where: { id: input.cardId, friendId: input.friendId, status: GroupRoundCardStatus.PENDING },
      include: { hostRound: true },
    })
    if (!card) throw new PartialRoundError(404, 'Group card not found.')
    const claimed = await transaction.groupRoundCard.updateMany({
      where: { id: card.id, friendId: input.friendId, status: GroupRoundCardStatus.PENDING },
      data: { status: GroupRoundCardStatus.APPROVED },
    })
    if (claimed.count !== 1) throw new PartialRoundError(409, 'This group card has already been answered.')
    const state = card.state as { holeEntries?: LiveRoundDraftState['holeEntries'] }
    if (!Array.isArray(state.holeEntries)) throw new PartialRoundError(400, 'Group card is incomplete.')
    const holes = recordedHoles({ holeEntries: state.holeEntries } as LiveRoundDraftState)
    if (holes.length === 0) throw new PartialRoundError(400, 'There are no scored holes to approve.')
    const source = card.hostRound
    const round = await transaction.round.create({
      data: {
        isPartial: true,
        userId: input.friendId,
        teeId: source.teeId,
        datePlayed: source.datePlayed,
        timePlayed: source.timePlayed,
        category: 'CASUAL',
        participation: 'INDIVIDUAL',
        scoringFormat: source.scoringFormat,
        holeCount: source.holeCount,
        nineHoleSegment: source.nineHoleSegment,
        playingHandicap: null,
        grossScore: null,
        adjustedGrossScore: null,
        scoreDifferential: null,
        weatherCondition: source.weatherCondition,
        pccAdjustment: 0,
        isAcceptable: false,
        usedInHandicapCalc: false,
        scorecardStatus: RoundScorecardStatus.NOT_REQUIRED,
        holeScores: { create: holes },
      },
      select: { id: true },
    })
    await transaction.groupRoundCard.update({
      where: { id: card.id }, data: { approvedRoundId: round.id },
    })
    return { round: { id: round.id } }
  })
}

export async function declineGroupRoundCard(input: { cardId: string; friendId: string }) {
  if (!UUID_PATTERN.test(input.cardId) || !UUID_PATTERN.test(input.friendId)) {
    throw new PartialRoundError(400, 'Invalid group card reference.')
  }
  const result = await prisma.groupRoundCard.updateMany({
    where: { id: input.cardId, friendId: input.friendId, status: GroupRoundCardStatus.PENDING },
    data: { status: GroupRoundCardStatus.DECLINED },
  })
  if (result.count !== 1) throw new PartialRoundError(404, 'Group card not found.')
}
