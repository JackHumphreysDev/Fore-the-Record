import type { Prisma } from './generated/prisma/client.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_DRAFT_BYTES = 100_000

export type LiveRoundDraftState = {
  version: 1
  currentHoleIndex: number
  tee: Record<string, unknown> & { id: string }
  form: Record<string, unknown> & {
    teeId: string
    participation: 'INDIVIDUAL'
    holeCount: 9 | 18
  }
  scorecardStatus: 'available' | 'manual_required'
  scorecardSource: 'saved' | 'provider' | null
  holeEntries: Array<{
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
  }>
  matchPlayDraft: Record<string, unknown>
  groupPlayers?: Array<{ id: string; kind: 'friend' | 'guest'; name: string; holeEntries: LiveRoundDraftState['holeEntries'] }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isShortString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum
}

export function parseLiveRoundDraftState(value: unknown): LiveRoundDraftState | null {
  if (!isRecord(value)) return null

  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch {
    return null
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_DRAFT_BYTES) return null

  if (
    value.version !== 1 ||
    !Number.isInteger(value.currentHoleIndex) ||
    Number(value.currentHoleIndex) < 0 ||
    !isRecord(value.tee) ||
    typeof value.tee.id !== 'string' ||
    !UUID_PATTERN.test(value.tee.id) ||
    !isRecord(value.form) ||
    value.form.teeId !== value.tee.id ||
    value.form.participation !== 'INDIVIDUAL' ||
    (value.form.holeCount !== 9 && value.form.holeCount !== 18) ||
    (value.scorecardStatus !== 'available' && value.scorecardStatus !== 'manual_required') ||
    (value.scorecardSource != null && value.scorecardSource !== 'saved' && value.scorecardSource !== 'provider') ||
    !Array.isArray(value.holeEntries) ||
    value.holeEntries.length !== value.form.holeCount ||
    Number(value.currentHoleIndex) >= value.holeEntries.length ||
    !isRecord(value.matchPlayDraft)
  ) return null

  const normalizedHoleEntries = value.holeEntries.map((hole) =>
    isRecord(hole)
      ? {
          ...hole,
          putts: hole.putts ?? '',
          fairwayResult: hole.fairwayResult ?? '',
          greenInRegulation: hole.greenInRegulation ?? '',
          penaltyStrokes: hole.penaltyStrokes ?? '',
          bunkerVisits: hole.bunkerVisits ?? '',
          upAndDownResult: hole.upAndDownResult ?? '',
        }
      : hole,
  )
  const numbers = new Set<number>()
  for (const hole of normalizedHoleEntries) {
    if (
      !isRecord(hole) ||
      !Number.isInteger(hole.holeNumber) ||
      Number(hole.holeNumber) < 1 ||
      Number(hole.holeNumber) > 18 ||
      numbers.has(Number(hole.holeNumber)) ||
      !isShortString(hole.par, 2) ||
      !isShortString(hole.strokeIndex, 2) ||
      !isShortString(hole.yardage, 5) ||
      !isShortString(hole.strokesTaken, 2) ||
      typeof hole.pickedUp !== 'boolean' ||
      !isShortString(hole.putts, 1) ||
      (hole.fairwayResult !== '' && hole.fairwayResult !== 'HIT' && hole.fairwayResult !== 'MISSED_LEFT' && hole.fairwayResult !== 'MISSED_RIGHT' && hole.fairwayResult !== 'NOT_APPLICABLE') ||
      (hole.greenInRegulation !== '' && hole.greenInRegulation !== 'YES' && hole.greenInRegulation !== 'NO') ||
      !isShortString(hole.penaltyStrokes, 1) ||
      !isShortString(hole.bunkerVisits, 1) ||
      (hole.upAndDownResult !== '' && hole.upAndDownResult !== 'NOT_ATTEMPTED' && hole.upAndDownResult !== 'SUCCESSFUL' && hole.upAndDownResult !== 'UNSUCCESSFUL')
    ) return null
    numbers.add(Number(hole.holeNumber))
  }

  let normalizedGroupPlayers: LiveRoundDraftState['groupPlayers'] | undefined
  if (value.groupPlayers !== undefined && value.groupPlayers !== null) {
    if (!Array.isArray(value.groupPlayers) || value.groupPlayers.length > 7) return null
    const ids = new Set<string>()
    normalizedGroupPlayers = []
    for (const player of value.groupPlayers) {
      if (!isRecord(player) || typeof player.id !== 'string' || !UUID_PATTERN.test(player.id) ||
          ids.has(player.id) || (player.kind !== 'friend' && player.kind !== 'guest') ||
          !isShortString(player.name, 80) || player.name.trim().length === 0 ||
          !Array.isArray(player.holeEntries)) return null
      const card = parseLiveRoundDraftState({ ...value, groupPlayers: undefined, holeEntries: player.holeEntries })
      if (!card || card.holeEntries.some((hole, index) => hole.holeNumber !== normalizedHoleEntries[index].holeNumber)) return null
      ids.add(player.id)
      normalizedGroupPlayers.push({ id: player.id, kind: player.kind, name: player.name.trim(), holeEntries: card.holeEntries })
    }
  }

  // Swift's synthesized Encodable omits nil tee fields. Keep the API response in
  // the web client's nullable shape, including drafts saved before this fix.
  const normalizedTee = {
    ...value.tee,
    colour: value.tee.colour ?? null,
    gender: value.tee.gender ?? null,
    totalYardage: value.tee.totalYardage ?? null,
    totalMetres: value.tee.totalMetres ?? null,
    par: value.tee.par ?? null,
    frontNineCourseRating: value.tee.frontNineCourseRating ?? null,
    frontNineSlopeRating: value.tee.frontNineSlopeRating ?? null,
    backNineCourseRating: value.tee.backNineCourseRating ?? null,
    backNineSlopeRating: value.tee.backNineSlopeRating ?? null,
  }

  return {
    ...value,
    tee: normalizedTee,
    scorecardSource: value.scorecardSource ?? null,
    holeEntries: normalizedHoleEntries,
    ...(normalizedGroupPlayers ? { groupPlayers: normalizedGroupPlayers } : {}),
  } as unknown as LiveRoundDraftState
}

export function asLiveRoundJson(state: LiveRoundDraftState): Prisma.InputJsonValue {
  return state as unknown as Prisma.InputJsonValue
}
