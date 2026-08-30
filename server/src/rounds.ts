import { prisma } from './database.js'
import {
  WeatherCondition,
  type WeatherCondition as WeatherConditionValue,
} from './generated/prisma/enums.js'
import {
  calculateAdjustedGrossScore,
  calculateCourseHandicap,
  calculateHandicap,
  calculateHandicapStrokesReceived,
  calculateScoreDifferential,
} from './handicap.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const HOLES_IN_ROUND = 18
const INITIAL_HANDICAP_STROKES_PER_HOLE = 3

// Product configuration: all user-entered rounds currently qualify for the
// simplified handicap calculation. Future eligibility rules belong here.
export const ROUND_ACCEPTABILITY_RULES = {
  loggedRoundIsAcceptable: true,
} as const

export type RoundHoleInput = {
  holeNumber: number
  par: number
  strokeIndex: number
  strokesTaken: number
}

export type LogRoundInput = {
  userId: string
  teeId: string
  datePlayed: Date
  grossScore: number
  weatherCondition: WeatherConditionValue
  pccAdjustment: number
  holeScores?: RoundHoleInput[]
}

export class RoundReferenceNotFoundError extends Error {
  constructor(readonly reference: 'user' | 'tee') {
    super(`${reference} not found`)
    this.name = 'RoundReferenceNotFoundError'
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

function getHoleScores(value: unknown): RoundHoleInput[] | null | undefined {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) {
    return undefined
  }

  if (!Array.isArray(value) || value.length !== HOLES_IN_ROUND) {
    return null
  }

  const holeScores: RoundHoleInput[] = []

  for (const score of value) {
    if (
      !isRecord(score) ||
      typeof score.holeNumber !== 'number' ||
      !Number.isInteger(score.holeNumber) ||
      score.holeNumber < 1 ||
      score.holeNumber > HOLES_IN_ROUND ||
      typeof score.par !== 'number' ||
      !Number.isInteger(score.par) ||
      score.par <= 0 ||
      typeof score.strokeIndex !== 'number' ||
      !Number.isInteger(score.strokeIndex) ||
      score.strokeIndex < 1 ||
      score.strokeIndex > HOLES_IN_ROUND ||
      typeof score.strokesTaken !== 'number' ||
      !Number.isInteger(score.strokesTaken) ||
      score.strokesTaken <= 0
    ) {
      return null
    }

    holeScores.push({
      holeNumber: score.holeNumber,
      par: score.par,
      strokeIndex: score.strokeIndex,
      strokesTaken: score.strokesTaken,
    })
  }

  const holeNumbers = new Set(holeScores.map(({ holeNumber }) => holeNumber))
  const strokeIndexes = new Set(
    holeScores.map(({ strokeIndex }) => strokeIndex),
  )

  if (
    holeNumbers.size !== HOLES_IN_ROUND ||
    strokeIndexes.size !== HOLES_IN_ROUND
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
  const weatherCondition = getWeatherCondition(value.weatherCondition)
  const holeScores = getHoleScores(value.holeScores)
  const pccAdjustment = value.pccAdjustment ?? 0

  if (
    typeof value.userId !== 'string' ||
    !UUID_PATTERN.test(value.userId) ||
    typeof value.teeId !== 'string' ||
    !UUID_PATTERN.test(value.teeId) ||
    !datePlayed ||
    typeof value.grossScore !== 'number' ||
    !Number.isInteger(value.grossScore) ||
    value.grossScore <= 0 ||
    !weatherCondition ||
    typeof pccAdjustment !== 'number' ||
    !Number.isFinite(pccAdjustment) ||
    pccAdjustment < -9.9 ||
    pccAdjustment > 9.9 ||
    holeScores === null
  ) {
    return null
  }

  const grossScore = value.grossScore

  if (
    holeScores &&
    holeScores.reduce((total, hole) => total + hole.strokesTaken, 0) !==
      grossScore
  ) {
    return null
  }

  return {
    userId: value.userId,
    teeId: value.teeId,
    datePlayed,
    grossScore,
    weatherCondition,
    pccAdjustment,
    ...(holeScores ? { holeScores } : {}),
  }
}

export async function logRound(input: LogRoundInput) {
  return prisma.$transaction(async (transaction) => {
    const [user, tee] = await Promise.all([
      transaction.user.findUnique({
        where: { id: input.userId },
        select: { handicapIndex: true },
      }),
      transaction.tee.findUnique({
        where: { id: input.teeId },
        select: {
          courseRating: true,
          slopeRating: true,
          par: true,
        },
      }),
    ])

    if (!user) {
      throw new RoundReferenceNotFoundError('user')
    }

    if (!tee) {
      throw new RoundReferenceNotFoundError('tee')
    }

    const courseRating = Number(tee.courseRating)
    const currentHandicapIndex =
      user.handicapIndex === null ? null : Number(user.handicapIndex)
    const coursePar =
      tee.par ??
      input.holeScores?.reduce((total, hole) => total + hole.par, 0)
    const courseHandicap =
      currentHandicapIndex === null || coursePar === undefined
        ? null
        : calculateCourseHandicap({
            handicapIndex: currentHandicapIndex,
            slopeRating: tee.slopeRating,
            courseRating,
            par: coursePar,
          })
    const adjustedHoleScores = input.holeScores?.map((hole) => ({
      par: hole.par,
      strokesTaken: hole.strokesTaken,
      handicapStrokesReceived:
        courseHandicap === null
          ? INITIAL_HANDICAP_STROKES_PER_HOLE
          : calculateHandicapStrokesReceived(
              courseHandicap,
              hole.strokeIndex,
            ),
    }))
    const { adjustedGrossScore, isCapped } =
      calculateAdjustedGrossScore({
        grossScore: input.grossScore,
        ...(adjustedHoleScores ? { holeScores: adjustedHoleScores } : {}),
      })
    const scoreDifferential = calculateScoreDifferential({
      adjustedGrossScore,
      courseRating,
      slopeRating: tee.slopeRating,
      pccAdjustment: input.pccAdjustment,
    })
    const isAcceptable = ROUND_ACCEPTABILITY_RULES.loggedRoundIsAcceptable

    const createdRound = await transaction.round.create({
      data: {
        userId: input.userId,
        teeId: input.teeId,
        datePlayed: input.datePlayed,
        grossScore: input.grossScore,
        adjustedGrossScore,
        isCapped,
        weatherCondition: input.weatherCondition,
        pccAdjustment: input.pccAdjustment,
        scoreDifferential,
        isAcceptable,
        ...(input.holeScores
          ? {
              holeScores: {
                create: input.holeScores,
              },
            }
          : {}),
      },
      include: {
        holeScores: {
          orderBy: { holeNumber: 'asc' },
        },
      },
    })

    const recentRounds = await transaction.round.findMany({
      where: {
        userId: input.userId,
        isAcceptable: true,
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
      recentRounds.map((round) => ({
        ...round,
        scoreDifferential: Number(round.scoreDifferential),
      })),
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
        usedInHandicapCalc: handicapCalculation.usedRoundIds.includes(
          createdRound.id,
        ),
      },
      handicapIndex: handicapCalculation.handicapIndex,
      usedRoundIds: handicapCalculation.usedRoundIds,
    }
  })
}
