import { prisma } from './database.js'
import {
  RoundParticipation,
  RoundScoringFormat,
  RoundScorecardStatus,
} from './generated/prisma/enums.js'
import type { Prisma } from './generated/prisma/client.js'
import {
  calculateAdjustedGrossScore,
  calculateCourseHandicap,
  calculateHandicap,
  calculateHandicapStrokesReceived,
  calculateScoreDifferential,
} from './handicap.js'
import { parseLogRoundInput } from './rounds.js'
import { calculateStablefordRound } from './stableford.js'

export class AdminRoundError extends Error {
  constructor(
    readonly reason: 'validation' | 'not_found' | 'conflict',
    message: string,
  ) {
    super(message)
    this.name = 'AdminRoundError'
  }
}

async function recalculateHandicap(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  const recentRounds = await transaction.round.findMany({
    where: {
      userId,
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
  const calculation = calculateHandicap(
    recentRounds.flatMap((round) =>
      round.scoreDifferential === null
        ? []
        : [{ ...round, scoreDifferential: Number(round.scoreDifferential) }],
    ),
  )

  await transaction.round.updateMany({
    where: { userId, usedInHandicapCalc: true },
    data: { usedInHandicapCalc: false },
  })
  if (calculation.usedRoundIds.length > 0) {
    await transaction.round.updateMany({
      where: { id: { in: calculation.usedRoundIds } },
      data: { usedInHandicapCalc: true },
    })
  }
  await transaction.user.update({
    where: { id: userId },
    data: { handicapIndex: calculation.handicapIndex },
  })

  return calculation
}

export async function updateRoundAsAdmin(input: {
  roundId: string
  administratorId: string
  body: unknown
}) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.round.findUnique({
      where: { id: input.roundId },
      include: {
        user: { select: { handicapIndex: true } },
        tee: { select: { courseRating: true, slopeRating: true, par: true } },
        holeScores: { orderBy: { holeNumber: 'asc' } },
      },
    })
    if (!existing) {
      throw new AdminRoundError('not_found', 'Round not found')
    }

    const body =
      typeof input.body === 'object' && input.body !== null
        ? (input.body as Record<string, unknown>)
        : {}
    const submittedStrokes = Array.isArray(body.holeScores)
      ? body.holeScores
      : []
    const holeScores = existing.holeScores.map((hole) => {
      const submitted = submittedStrokes.find(
        (candidate) =>
          typeof candidate === 'object' &&
          candidate !== null &&
          (candidate as Record<string, unknown>).holeNumber === hole.holeNumber,
      ) as Record<string, unknown> | undefined
      return {
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        strokesTaken:
          submitted?.pickedUp === true ? null : submitted?.strokesTaken,
        pickedUp: submitted?.pickedUp === true,
      }
    })
    const existingHoleCount = existing.holeCount ?? 18
    const parsed = parseLogRoundInput({
      ...body,
      userId: existing.userId,
      teeId: existing.teeId,
      participation: existing.participation,
      holeCount: existingHoleCount,
      ...(existing.nineHoleSegment
        ? { nineHoleSegment: existing.nineHoleSegment }
        : {}),
      ...(existing.participation === RoundParticipation.INDIVIDUAL
        ? {
            holeScores,
            scoringFormat: existing.scoringFormat,
            playingHandicap:
              existing.scoringFormat === RoundScoringFormat.STABLEFORD
                ? body.playingHandicap
                : null,
          }
        : { holeScores: null, grossScore: null, weatherCondition: null }),
    })
    if (!parsed) {
      throw new AdminRoundError(
        'validation',
        `Enter valid round details. The gross total must equal all ${existingHoleCount} hole scores.`,
      )
    }

    const before = {
      datePlayed: existing.datePlayed.toISOString().slice(0, 10),
      timePlayed: existing.timePlayed,
      category: existing.category,
      competitionName: existing.competitionName,
      competitionFormat: existing.competitionFormat,
      gameFormat: existing.gameFormat,
      gameResult: existing.gameResult,
      scoringFormat: existing.scoringFormat,
      playingHandicap: existing.playingHandicap,
      stablefordPoints: existing.stablefordPoints,
      numberOfPlayers: existing.numberOfPlayers,
      grossScore: existing.grossScore,
      weatherCondition: existing.weatherCondition,
      pccAdjustment: Number(existing.pccAdjustment),
      holeScores: existing.holeScores.map((hole) => ({
        holeNumber: hole.holeNumber,
        strokesTaken: hole.strokesTaken,
        pickedUp: hole.pickedUp,
      })),
    }

    let roundData: Record<string, unknown>
    if (parsed.participation === RoundParticipation.TEAM) {
      roundData = {
        datePlayed: parsed.datePlayed,
        timePlayed: parsed.timePlayed,
        category: parsed.category,
        competitionName: parsed.competitionName,
        competitionFormat: parsed.competitionFormat,
        gameFormat: parsed.gameFormat,
        gameResult: parsed.gameResult,
        numberOfPlayers: parsed.numberOfPlayers,
      }
    } else {
      const handicapIndex =
        existing.user.handicapIndex === null
          ? null
          : Number(existing.user.handicapIndex)
      const courseRating = Number(existing.tee.courseRating)
      const coursePar =
        existing.tee.par ??
        existing.holeScores.reduce((total, hole) => total + hole.par, 0)
      const courseHandicap =
        handicapIndex === null
          ? null
          : calculateCourseHandicap({
              handicapIndex,
              slopeRating: existing.tee.slopeRating,
              courseRating,
              par: coursePar,
            })
      const handicapHoles = parsed.holeScores.map((hole) => {
        const handicapStrokesReceived =
          courseHandicap === null
            ? 3
            : calculateHandicapStrokesReceived(courseHandicap, hole.strokeIndex)

        return {
          par: hole.par,
          strokesTaken:
            hole.strokesTaken ?? hole.par + 2 + handicapStrokesReceived,
          handicapStrokesReceived,
        }
      })
      const calculationGross =
        parsed.grossScore ??
        handicapHoles.reduce((total, hole) => total + hole.strokesTaken, 0)
      const adjusted = calculateAdjustedGrossScore({
        grossScore: calculationGross,
        holeScores: handicapHoles,
      })
      const stablefordPoints =
        parsed.scoringFormat === RoundScoringFormat.STABLEFORD &&
        parsed.playingHandicap !== null
          ? calculateStablefordRound(
              parsed.holeScores,
              parsed.playingHandicap,
            ).totalPoints
          : null
      const scoreDifferential = parsed.holeCount === 18
        ? calculateScoreDifferential({
            adjustedGrossScore: adjusted.adjustedGrossScore,
            courseRating,
            slopeRating: existing.tee.slopeRating,
            pccAdjustment: parsed.pccAdjustment,
          })
        : null
      roundData = {
        datePlayed: parsed.datePlayed,
        timePlayed: parsed.timePlayed,
        category: parsed.category,
        competitionName: parsed.competitionName,
        competitionFormat: parsed.competitionFormat,
        gameFormat: parsed.gameFormat,
        gameResult: parsed.gameResult,
        scoringFormat: parsed.scoringFormat,
        playingHandicap: parsed.playingHandicap,
        stablefordPoints,
        holeCount: parsed.holeCount,
        nineHoleSegment: parsed.nineHoleSegment,
        numberOfPlayers: parsed.numberOfPlayers,
        grossScore: parsed.grossScore,
        adjustedGrossScore: adjusted.adjustedGrossScore,
        isCapped:
          adjusted.isCapped || parsed.holeScores.some((hole) => hole.pickedUp),
        weatherCondition: parsed.weatherCondition,
        pccAdjustment: parsed.pccAdjustment,
        scoreDifferential,
        isAcceptable:
          parsed.holeCount === 18 &&
          existing.scorecardStatus === RoundScorecardStatus.VERIFIED,
      }
      await transaction.holeScore.deleteMany({
        where: { roundId: existing.id },
      })
      await transaction.holeScore.createMany({
        data: parsed.holeScores.map((hole) => ({
          roundId: existing.id,
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          strokesTaken: hole.strokesTaken ?? 0,
          pickedUp: hole.pickedUp,
        })),
      })
    }

    await transaction.round.update({
      where: { id: existing.id },
      data: roundData,
    })
    const handicap = await recalculateHandicap(transaction, existing.userId)
    await transaction.adminAuditLog.create({
      data: {
        actorUserId: input.administratorId,
        action: 'ROUND_UPDATED',
        targetType: 'Round',
        targetId: existing.id,
        before,
        after: {
          ...roundData,
          datePlayed: parsed.datePlayed.toISOString().slice(0, 10),
          holeScores:
            parsed.participation === RoundParticipation.INDIVIDUAL
              ? parsed.holeScores.map((hole) => ({
                  holeNumber: hole.holeNumber,
                  strokesTaken: hole.strokesTaken,
                  pickedUp: hole.pickedUp,
                }))
              : [],
          handicapIndex: handicap.handicapIndex,
        },
      },
    })

    return { handicapIndex: handicap.handicapIndex }
  })
}

export async function deleteRoundAsAdmin(input: {
  roundId: string
  administratorId: string
  confirmation: unknown
}) {
  if (input.confirmation !== 'DELETE') {
    throw new AdminRoundError(
      'validation',
      'Type DELETE to confirm permanent round deletion.',
    )
  }

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.round.findUnique({
      where: { id: input.roundId },
      select: {
        id: true,
        userId: true,
        datePlayed: true,
        grossScore: true,
        scoreDifferential: true,
        scorecardPhotoPath: true,
        tee: {
          select: {
            teeName: true,
            course: { select: { name: true, club: { select: { name: true } } } },
          },
        },
        scorecardReview: { select: { id: true, submissionId: true } },
      },
    })
    if (!existing) {
      throw new AdminRoundError('not_found', 'Round not found')
    }

    if (existing.scorecardReview) {
      await transaction.scorecardReview.delete({
        where: { id: existing.scorecardReview.id },
      })
      await transaction.submission.delete({
        where: { id: existing.scorecardReview.submissionId },
      })
    }
    await transaction.round.delete({ where: { id: existing.id } })
    const handicap = await recalculateHandicap(transaction, existing.userId)
    await transaction.adminAuditLog.create({
      data: {
        actorUserId: input.administratorId,
        action: 'ROUND_DELETED',
        targetType: 'Round',
        targetId: existing.id,
        before: {
          datePlayed: existing.datePlayed.toISOString().slice(0, 10),
          grossScore: existing.grossScore,
          scoreDifferential:
            existing.scoreDifferential === null
              ? null
              : Number(existing.scoreDifferential),
          club: existing.tee.course.club.name,
          course: existing.tee.course.name,
          tee: existing.tee.teeName,
        },
        after: { deleted: true, handicapIndex: handicap.handicapIndex },
      },
    })

    return {
      userId: existing.userId,
      handicapIndex: handicap.handicapIndex,
      scorecardPhotoPath: existing.scorecardPhotoPath,
    }
  })
}
