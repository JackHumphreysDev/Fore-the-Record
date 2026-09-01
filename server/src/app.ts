import express from 'express'
import {
  getAuthenticatedUser,
  type AuthenticatedUser,
} from './auth.js'
import {
  findBestClubNameMatch,
  getClubNameSearchTerms,
} from './clubNameMatch.js'
import {
  getCourseRatings,
  getProviderClubCourseRatings,
  searchCourseProviderClubs,
  type CourseData,
} from './courseRatings.js'
import {
  getProviderTeeScorecard,
  isCompleteScorecard,
} from './courseScorecards.js'
import { mergeCourseSearchData } from './courseSearch.js'
import { prisma } from './database.js'
import {
  SubmissionStatus,
  type SubmissionStatus as SubmissionStatusValue,
  SubmissionType,
  type SubmissionType as SubmissionTypeValue,
  TeeSource,
  type TeeSource as TeeSourceValue,
  UserRole,
  ScorecardSource,
  RoundParticipation,
  RoundScorecardStatus,
} from './generated/prisma/enums.js'
import {
  logRound,
  parseLogRoundInput,
  RoundReferenceNotFoundError,
} from './rounds.js'
import {
  calculateAdjustedGrossScore,
  calculateCourseHandicap,
  calculateHandicap,
  calculateHandicapStrokesReceived,
  calculateScoreDifferential,
} from './handicap.js'
import {
  parseScorecardReviewDecision,
  scorecardWasAmended,
  ScorecardReviewValidationError,
} from './scorecardReviews.js'
import {
  parseSubmissionInput,
  SubmissionValidationError,
} from './submissions.js'
import {
  parseSubmissionMessageInput,
  parseSubmissionStatusInput,
  SubmissionResponseValidationError,
} from './submissionResponses.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const COURSE_DATA_SOURCE_BY_TEE_SOURCE: Record<
  TeeSourceValue,
  CourseData['source']
> = {
  [TeeSource.API]: 'api',
  [TeeSource.FALLBACK_SCRAPE]: 'fallback_scrape',
  [TeeSource.MANUAL]: 'manual',
}

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  homeClubId: true,
  handicapIndex: true,
  createdAt: true,
  homeClub: {
    select: {
      id: true,
      name: true,
    },
  },
} as const

const ADMIN_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const

const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  handicapIndex: true,
  createdAt: true,
  homeClub: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: { rounds: true },
  },
} as const

const SUBMISSION_SELECT = {
  id: true,
  type: true,
  status: true,
  subject: true,
  message: true,
  clubName: true,
  townCounty: true,
  websiteUrl: true,
  courseName: true,
  teeDetails: true,
  createdAt: true,
  updatedAt: true,
} as const

const ADMIN_SUBMISSION_SELECT = {
  ...SUBMISSION_SELECT,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const

const SUBMISSION_MESSAGE_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
} as const

const SUBMISSION_STATUS_SELECT = {
  id: true,
  status: true,
  updatedAt: true,
} as const

const CATALOGUE_CLUB_SELECT = {
  id: true,
  name: true,
  city: true,
  county: true,
  postcode: true,
  countryCode: true,
  _count: { select: { courses: true } },
} as const

const CATALOGUE_COURSE_SELECT = {
  id: true,
  name: true,
  holes: true,
  par: true,
  designedBy: true,
  yearOpened: true,
  club: {
    select: {
      id: true,
      name: true,
      city: true,
      county: true,
    },
  },
  tees: {
    orderBy: { teeName: 'asc' },
    select: {
      id: true,
      teeName: true,
      colour: true,
      gender: true,
      totalYardage: true,
      totalMetres: true,
      par: true,
      courseRating: true,
      slopeRating: true,
    },
  },
} as const

type AdminProfile = {
  id: string
  name: string
  email: string
  role: typeof UserRole.ADMIN
}

type TeePersistenceData = {
  externalId?: string
  teeName: string
  courseRating: number
  slopeRating: number
  par?: number
  source: TeeSourceValue
}

type CoursePersistenceData = {
  externalId?: string
  tees: TeePersistenceData[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function getTeePersistenceKey(tee: {
  teeName: string
  courseRating: number | { toString(): string }
  slopeRating: number
}): string {
  return [
    normalizeLabel(tee.teeName),
    Number(tee.courseRating),
    tee.slopeRating,
  ].join('::')
}

function getTeeSource(source: unknown) {
  switch (source) {
    case 'api':
      return TeeSource.API
    case 'fallback_scrape':
      return TeeSource.FALLBACK_SCRAPE
    case 'manual':
      return TeeSource.MANUAL
    default:
      return null
  }
}

function getRequestUser(locals: Record<string, unknown>): AuthenticatedUser {
  return locals.authenticatedUser as AuthenticatedUser
}

function getAdminProfile(locals: Record<string, unknown>): AdminProfile {
  return locals.adminProfile as AdminProfile
}

function serializeProfile<
  T extends { handicapIndex: unknown | null },
>(profile: T) {
  return {
    ...profile,
    handicapIndex:
      profile.handicapIndex === null ? null : Number(profile.handicapIndex),
  }
}

function serializeAdminUser<
  T extends {
    handicapIndex: unknown | null
    _count: { rounds: number }
  },
>(user: T) {
  const { _count, ...profile } = user

  return {
    ...profile,
    handicapIndex:
      profile.handicapIndex === null
        ? null
        : Number(profile.handicapIndex),
    roundCount: _count.rounds,
  }
}

function parsePaginationValue(
  value: unknown,
  defaultValue: number,
): number | null {
  if (value === undefined) {
    return defaultValue
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null
}

function isSubmissionStatus(
  value: unknown,
): value is SubmissionStatusValue {
  return (
    typeof value === 'string' &&
    Object.values(SubmissionStatus).includes(
      value as SubmissionStatusValue,
    )
  )
}

function isSubmissionType(value: unknown): value is SubmissionTypeValue {
  return (
    typeof value === 'string' &&
    Object.values(SubmissionType).includes(value as SubmissionTypeValue)
  )
}

const app = express()

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
  })
})

app.use('/api', async (request, response, next) => {
  const authenticatedUser = await getAuthenticatedUser(request)

  if (!authenticatedUser) {
    response.status(401).json({ error: 'Authentication required' })
    return
  }

  response.locals.authenticatedUser = authenticatedUser
  next()
})

app.use('/api/admin', async (_request, response, next) => {
  const authenticatedUser = getRequestUser(response.locals)
  const adminProfile = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: ADMIN_PROFILE_SELECT,
  })

  if (!adminProfile || adminProfile.role !== UserRole.ADMIN) {
    response.status(403).json({ error: 'Administrator access required' })
    return
  }

  response.locals.adminProfile = adminProfile
  next()
})

app.get('/api/admin/me', (_request, response) => {
  response.status(200).json(getAdminProfile(response.locals))
})

app.get('/api/admin/overview', async (_request, response) => {
  const [userCount, roundCount, clubCount, recentRegistrations] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.round.count(),
      prisma.club.count(),
      prisma.user.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
        select: ADMIN_USER_SELECT,
      }),
    ])

  response.status(200).json({
    totals: {
      users: userCount,
      rounds: roundCount,
      clubs: clubCount,
    },
    recentRegistrations: recentRegistrations.map(serializeAdminUser),
  })
})

app.get('/api/admin/users', async (request, response) => {
  const page = parsePaginationValue(request.query.page, 1)
  const pageSize = parsePaginationValue(request.query.pageSize, 20)

  if (page === null || pageSize === null || pageSize > 50) {
    response.status(400).json({ error: 'Invalid pagination' })
    return
  }

  if (
    request.query.search !== undefined &&
    typeof request.query.search !== 'string'
  ) {
    response.status(400).json({ error: 'Invalid search' })
    return
  }

  const search = request.query.search?.trim() ?? ''

  if (search.length > 100) {
    response.status(400).json({ error: 'Invalid search' })
    return
  }

  const where = search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }
    : {}

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ name: 'asc' }, { email: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ADMIN_USER_SELECT,
    }),
  ])

  response.status(200).json({
    users: users.map(serializeAdminUser),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

app.get('/api/admin/submissions', async (request, response) => {
  const page = parsePaginationValue(request.query.page, 1)
  const pageSize = parsePaginationValue(request.query.pageSize, 20)
  const status = request.query.status
  const type = request.query.type

  if (page === null || pageSize === null || pageSize > 50) {
    response.status(400).json({ error: 'Invalid pagination' })
    return
  }

  if (
    (status !== undefined && !isSubmissionStatus(status)) ||
    (type !== undefined && !isSubmissionType(type)) ||
    (request.query.search !== undefined &&
      typeof request.query.search !== 'string')
  ) {
    response.status(400).json({ error: 'Invalid submission filters' })
    return
  }

  const search = request.query.search?.trim() ?? ''

  if (search.length > 100) {
    response.status(400).json({ error: 'Invalid submission filters' })
    return
  }

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            {
              subject: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              message: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              clubName: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              courseName: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              user: {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
          ],
        }
      : {}),
  }

  const [total, submissions] = await prisma.$transaction([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ADMIN_SUBMISSION_SELECT,
    }),
  ])

  response.status(200).json({
    submissions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

app.get('/api/admin/scorecard-reviews', async (_request, response) => {
  const reviews = await prisma.scorecardReview.findMany({
    where: {
      reviewedAt: null,
      submission: {
        status: { in: [SubmissionStatus.NEW, SubmissionStatus.IN_PROGRESS] },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      createdAt: true,
      submission: {
        select: {
          id: true,
          status: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tee: {
        select: {
          id: true,
          teeName: true,
          courseRating: true,
          slopeRating: true,
          course: {
            select: {
              name: true,
              club: { select: { name: true } },
            },
          },
        },
      },
      round: {
        select: {
          id: true,
          datePlayed: true,
          grossScore: true,
          scoreDifferential: true,
          holeScores: {
            orderBy: { holeNumber: 'asc' },
            select: { holeNumber: true, strokesTaken: true },
          },
        },
      },
      holes: {
        orderBy: { holeNumber: 'asc' },
        select: {
          holeNumber: true,
          par: true,
          strokeIndex: true,
          yardage: true,
        },
      },
    },
  })

  response.status(200).json({
    reviews: reviews.map((review) => ({
      ...review,
      tee: {
        ...review.tee,
        courseRating: Number(review.tee.courseRating),
      },
      round: {
        ...review.round,
        scoreDifferential: Number(review.round.scoreDifferential),
      },
    })),
  })
})

app.patch(
  '/api/admin/scorecard-reviews/:reviewId',
  async (request, response) => {
    const reviewId = request.params.reviewId

    if (typeof reviewId !== 'string' || !UUID_PATTERN.test(reviewId)) {
      response.status(400).json({ error: 'Invalid scorecard review ID' })
      return
    }

    let decision

    try {
      decision = parseScorecardReviewDecision(request.body)
    } catch (error: unknown) {
      if (error instanceof ScorecardReviewValidationError) {
        response.status(400).json({ error: error.message })
        return
      }

      throw error
    }

    const review = await prisma.scorecardReview.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        submissionId: true,
        teeId: true,
        reviewedAt: true,
        holes: {
          orderBy: { holeNumber: 'asc' },
          select: {
            holeNumber: true,
            par: true,
            strokeIndex: true,
            yardage: true,
          },
        },
        round: {
          select: {
            id: true,
            userId: true,
            datePlayed: true,
            grossScore: true,
            pccAdjustment: true,
            user: { select: { handicapIndex: true } },
            tee: {
              select: {
                courseRating: true,
                slopeRating: true,
              },
            },
            holeScores: {
              orderBy: { holeNumber: 'asc' },
              select: { holeNumber: true, strokesTaken: true },
            },
          },
        },
      },
    })

    if (!review) {
      response.status(404).json({ error: 'Scorecard review not found' })
      return
    }

    if (review.reviewedAt) {
      response.status(409).json({ error: 'This scorecard has already been reviewed' })
      return
    }

    const administrator = getAdminProfile(response.locals)

    if (decision.action === 'REJECT') {
      await prisma.$transaction([
        prisma.round.update({
          where: { id: review.round.id },
          data: { scorecardStatus: RoundScorecardStatus.REJECTED },
        }),
        prisma.submission.update({
          where: { id: review.submissionId },
          data: { status: SubmissionStatus.CLOSED },
        }),
        prisma.scorecardReview.update({
          where: { id: review.id },
          data: {
            reviewedById: administrator.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.adminAuditLog.create({
          data: {
            actorUserId: administrator.id,
            action: 'SCORECARD_REVIEW_REJECTED',
            targetType: 'ScorecardReview',
            targetId: review.id,
          },
        }),
      ])

      response.status(200).json({ status: 'rejected' })
      return
    }

    if (
      review.round.grossScore === null ||
      review.round.holeScores.length !== 18
    ) {
      response.status(409).json({
        error: 'The player round does not contain a complete scored card',
      })
      return
    }

    const currentHandicapIndex =
      review.round.user.handicapIndex === null
        ? null
        : Number(review.round.user.handicapIndex)
    const approvedPar = decision.holes.reduce(
      (total, hole) => total + hole.par,
      0,
    )
    const courseRating = Number(review.round.tee.courseRating)
    const courseHandicap =
      currentHandicapIndex === null
        ? null
        : calculateCourseHandicap({
            handicapIndex: currentHandicapIndex,
            slopeRating: review.round.tee.slopeRating,
            courseRating,
            par: approvedPar,
          })
    const approvedHoleScores = decision.holes.map((hole) => {
      const playerScore = review.round.holeScores.find(
        (score) => score.holeNumber === hole.holeNumber,
      )

      return {
        ...hole,
        strokesTaken: playerScore?.strokesTaken ?? 0,
      }
    })
    const { adjustedGrossScore, isCapped } = calculateAdjustedGrossScore({
      grossScore: review.round.grossScore,
      holeScores: approvedHoleScores.map((hole) => ({
        par: hole.par,
        strokesTaken: hole.strokesTaken,
        handicapStrokesReceived:
          courseHandicap === null
            ? 3
            : calculateHandicapStrokesReceived(
                courseHandicap,
                hole.strokeIndex,
              ),
      })),
    })
    const scoreDifferential = calculateScoreDifferential({
      adjustedGrossScore,
      courseRating,
      slopeRating: review.round.tee.slopeRating,
      pccAdjustment: Number(review.round.pccAdjustment),
    })
    const recentRounds = await prisma.round.findMany({
      where: {
        userId: review.round.userId,
        OR: [
          {
            isAcceptable: true,
            participation: RoundParticipation.INDIVIDUAL,
            scoreDifferential: { not: null },
          },
          { id: review.round.id },
        ],
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
      recentRounds.flatMap((round) => {
        if (round.id === review.round.id) {
          return [
            {
              ...round,
              scoreDifferential,
              isAcceptable: true,
            },
          ]
        }

        return round.scoreDifferential === null
          ? []
          : [
              {
                ...round,
                scoreDifferential: Number(round.scoreDifferential),
              },
            ]
      }),
    )
    const amended = scorecardWasAmended(review.holes, decision.holes)
    const allYardages = decision.holes.map((hole) => hole.yardage)
    const totalYardage = allYardages.every(
      (yardage): yardage is number => typeof yardage === 'number',
    )
      ? allYardages.reduce((total, yardage) => total + yardage, 0)
      : null

    await prisma.$transaction([
      prisma.teeHole.deleteMany({ where: { teeId: review.teeId } }),
      prisma.teeHole.createMany({
        data: decision.holes.map((hole) => ({
          teeId: review.teeId,
          ...hole,
          source: amended
            ? ScorecardSource.ADMIN
            : ScorecardSource.PLAYER_APPROVED,
        })),
      }),
      prisma.tee.update({
        where: { id: review.teeId },
        data: {
          par: approvedPar,
          ...(totalYardage === null ? {} : { totalYardage }),
        },
      }),
      prisma.holeScore.deleteMany({ where: { roundId: review.round.id } }),
      prisma.holeScore.createMany({
        data: approvedHoleScores.map((hole) => ({
          roundId: review.round.id,
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          strokesTaken: hole.strokesTaken,
        })),
      }),
      prisma.round.update({
        where: { id: review.round.id },
        data: {
          adjustedGrossScore,
          isCapped,
          scoreDifferential,
          isAcceptable: true,
          scorecardStatus: RoundScorecardStatus.VERIFIED,
        },
      }),
      prisma.round.updateMany({
        where: {
          userId: review.round.userId,
          usedInHandicapCalc: true,
        },
        data: { usedInHandicapCalc: false },
      }),
      ...(handicapCalculation.usedRoundIds.length > 0
        ? [
            prisma.round.updateMany({
              where: { id: { in: handicapCalculation.usedRoundIds } },
              data: { usedInHandicapCalc: true },
            }),
          ]
        : []),
      prisma.user.update({
        where: { id: review.round.userId },
        data: { handicapIndex: handicapCalculation.handicapIndex },
      }),
      prisma.submission.update({
        where: { id: review.submissionId },
        data: { status: SubmissionStatus.RESOLVED },
      }),
      prisma.scorecardReview.update({
        where: { id: review.id },
        data: {
          reviewedById: administrator.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          actorUserId: administrator.id,
          action: amended
            ? 'SCORECARD_REVIEW_AMENDED_AND_APPROVED'
            : 'SCORECARD_REVIEW_APPROVED',
          targetType: 'ScorecardReview',
          targetId: review.id,
          before: { scorecardStatus: RoundScorecardStatus.PENDING_REVIEW },
          after: {
            scorecardStatus: RoundScorecardStatus.VERIFIED,
            adjustedGrossScore,
            scoreDifferential,
          },
        },
      }),
    ])

    response.status(200).json({
      status: 'approved',
      amended,
      handicapIndex: handicapCalculation.handicapIndex,
      adjustedGrossScore,
      scoreDifferential,
    })
  },
)

app.get(
  '/api/admin/submissions/:submissionId/messages',
  async (request, response) => {
    const submissionId = request.params.submissionId

    if (
      typeof submissionId !== 'string' ||
      !UUID_PATTERN.test(submissionId)
    ) {
      response.status(400).json({ error: 'Invalid submission ID' })
      return
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true },
    })

    if (!submission) {
      response.status(404).json({ error: 'Submission not found' })
      return
    }

    const messages = await prisma.submissionMessage.findMany({
      where: { submissionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: SUBMISSION_MESSAGE_SELECT,
    })

    response.status(200).json({ messages })
  },
)

app.post(
  '/api/admin/submissions/:submissionId/messages',
  async (request, response) => {
    const submissionId = request.params.submissionId

    if (
      typeof submissionId !== 'string' ||
      !UUID_PATTERN.test(submissionId)
    ) {
      response.status(400).json({ error: 'Invalid submission ID' })
      return
    }

    let input

    try {
      input = parseSubmissionMessageInput(request.body)
    } catch (error: unknown) {
      if (error instanceof SubmissionResponseValidationError) {
        response.status(400).json({ error: error.message })
        return
      }

      throw error
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, status: true },
    })

    if (!submission) {
      response.status(404).json({ error: 'Submission not found' })
      return
    }

    if (submission.status === SubmissionStatus.CLOSED) {
      response.status(409).json({
        error: 'Closed submissions cannot receive replies',
      })
      return
    }

    const administrator = getAdminProfile(response.locals)
    const [message] = await prisma.$transaction([
      prisma.submissionMessage.create({
        data: {
          submissionId,
          senderUserId: administrator.id,
          ...input,
        },
        select: SUBMISSION_MESSAGE_SELECT,
      }),
      prisma.adminAuditLog.create({
        data: {
          actorUserId: administrator.id,
          action: 'SUBMISSION_MESSAGE_CREATED',
          targetType: 'Submission',
          targetId: submissionId,
          after: { senderRole: UserRole.ADMIN },
        },
      }),
    ])

    response.status(201).json(message)
  },
)

app.patch(
  '/api/admin/submissions/:submissionId/status',
  async (request, response) => {
    const submissionId = request.params.submissionId

    if (
      typeof submissionId !== 'string' ||
      !UUID_PATTERN.test(submissionId)
    ) {
      response.status(400).json({ error: 'Invalid submission ID' })
      return
    }

    let input

    try {
      input = parseSubmissionStatusInput(request.body)
    } catch (error: unknown) {
      if (error instanceof SubmissionResponseValidationError) {
        response.status(400).json({ error: error.message })
        return
      }

      throw error
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: SUBMISSION_STATUS_SELECT,
    })

    if (!submission) {
      response.status(404).json({ error: 'Submission not found' })
      return
    }

    if (submission.status === input.status) {
      response.status(200).json(submission)
      return
    }

    const administrator = getAdminProfile(response.locals)
    const [updatedSubmission] = await prisma.$transaction([
      prisma.submission.update({
        where: { id: submissionId },
        data: input,
        select: SUBMISSION_STATUS_SELECT,
      }),
      prisma.adminAuditLog.create({
        data: {
          actorUserId: administrator.id,
          action: 'SUBMISSION_STATUS_UPDATED',
          targetType: 'Submission',
          targetId: submissionId,
          before: { status: submission.status },
          after: { status: input.status },
        },
      }),
    ])

    response.status(200).json(updatedSubmission)
  },
)

app.post('/api/submissions', async (request, response) => {
  let input

  try {
    input = parseSubmissionInput(request.body)
  } catch (error: unknown) {
    if (error instanceof SubmissionValidationError) {
      response.status(400).json({ error: error.message })
      return
    }

    throw error
  }

  const authenticatedUser = getRequestUser(response.locals)
  const user = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: { id: true },
  })

  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }

  const submission = await prisma.submission.create({
    data: {
      userId: user.id,
      ...input,
    },
    select: SUBMISSION_SELECT,
  })

  response.status(201).json(submission)
})

app.get('/api/submissions', async (request, response) => {
  const page = parsePaginationValue(request.query.page, 1)
  const pageSize = parsePaginationValue(request.query.pageSize, 20)

  if (page === null || pageSize === null || pageSize > 50) {
    response.status(400).json({ error: 'Invalid pagination' })
    return
  }

  const authenticatedUser = getRequestUser(response.locals)
  const user = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: { id: true },
  })

  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }

  const where = { userId: user.id }
  const [total, submissions] = await prisma.$transaction([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: SUBMISSION_SELECT,
    }),
  ])

  response.status(200).json({
    submissions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

app.get(
  '/api/submissions/:submissionId/messages',
  async (request, response) => {
    const submissionId = request.params.submissionId

    if (
      typeof submissionId !== 'string' ||
      !UUID_PATTERN.test(submissionId)
    ) {
      response.status(400).json({ error: 'Invalid submission ID' })
      return
    }

    const authenticatedUser = getRequestUser(response.locals)
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        user: { authUserId: authenticatedUser.id },
      },
      select: { id: true },
    })

    if (!submission) {
      response.status(404).json({ error: 'Submission not found' })
      return
    }

    const messages = await prisma.submissionMessage.findMany({
      where: { submissionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: SUBMISSION_MESSAGE_SELECT,
    })

    response.status(200).json({ messages })
  },
)

app.post(
  '/api/submissions/:submissionId/messages',
  async (request, response) => {
    const submissionId = request.params.submissionId

    if (
      typeof submissionId !== 'string' ||
      !UUID_PATTERN.test(submissionId)
    ) {
      response.status(400).json({ error: 'Invalid submission ID' })
      return
    }

    let input

    try {
      input = parseSubmissionMessageInput(request.body)
    } catch (error: unknown) {
      if (error instanceof SubmissionResponseValidationError) {
        response.status(400).json({ error: error.message })
        return
      }

      throw error
    }

    const authenticatedUser = getRequestUser(response.locals)
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        user: { authUserId: authenticatedUser.id },
      },
      select: { id: true, userId: true, status: true },
    })

    if (!submission) {
      response.status(404).json({ error: 'Submission not found' })
      return
    }

    if (submission.status === SubmissionStatus.CLOSED) {
      response.status(409).json({
        error: 'Closed submissions cannot receive replies',
      })
      return
    }

    const message = await prisma.submissionMessage.create({
      data: {
        submissionId,
        senderUserId: submission.userId,
        ...input,
      },
      select: SUBMISSION_MESSAGE_SELECT,
    })

    response.status(201).json(message)
  },
)

app.get('/api/users/me/rounds', async (_request, response) => {
  const authenticatedUser = getRequestUser(response.locals)

  const user = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: {
      rounds: {
        orderBy: [{ datePlayed: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          userId: true,
          teeId: true,
          datePlayed: true,
          timePlayed: true,
          category: true,
          participation: true,
          competitionName: true,
          competitionFormat: true,
          numberOfPlayers: true,
          grossScore: true,
          adjustedGrossScore: true,
          isCapped: true,
          weatherCondition: true,
          pccAdjustment: true,
          scoreDifferential: true,
          isAcceptable: true,
          usedInHandicapCalc: true,
          scorecardStatus: true,
          createdAt: true,
          holeScores: {
            orderBy: { holeNumber: 'asc' },
            select: {
              holeNumber: true,
              par: true,
              strokeIndex: true,
              strokesTaken: true,
            },
          },
          tee: {
            select: {
              id: true,
              teeName: true,
              courseRating: true,
              slopeRating: true,
              par: true,
              course: {
                select: {
                  id: true,
                  name: true,
                  club: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }

  response.status(200).json(
    user.rounds.map((round) => ({
      ...round,
      pccAdjustment: Number(round.pccAdjustment),
      scoreDifferential:
        round.scoreDifferential === null
          ? null
          : Number(round.scoreDifferential),
      tee: {
        ...round.tee,
        courseRating: Number(round.tee.courseRating),
      },
    })),
  )
})

app.get('/api/users/me', async (_request, response) => {
  const authenticatedUser = getRequestUser(response.locals)

  const user = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: PROFILE_SELECT,
  })

  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }

  response.status(200).json(serializeProfile(user))
})

app.patch('/api/users/me', async (request, response) => {
  const authenticatedUser = getRequestUser(response.locals)

  const body: unknown = request.body
  const requestedHomeClubId = isRecord(body) ? body.homeClubId : undefined
  let homeClubId: string | null

  if (requestedHomeClubId === null) {
    homeClubId = null
  } else if (typeof requestedHomeClubId === 'string') {
    const normalizedHomeClubId = requestedHomeClubId.trim()

    if (!UUID_PATTERN.test(normalizedHomeClubId)) {
      response.status(400).json({ error: 'Invalid home club ID' })
      return
    }

    homeClubId = normalizedHomeClubId
  } else {
    response.status(400).json({ error: 'Invalid home club ID' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: { id: true },
  })

  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }

  if (homeClubId !== null) {
    const homeClub = await prisma.club.findUnique({
      where: { id: homeClubId },
      select: { id: true },
    })

    if (!homeClub) {
      response.status(404).json({ error: 'Home club not found' })
      return
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { homeClubId },
    select: PROFILE_SELECT,
  })

  response.status(200).json(serializeProfile(updatedUser))
})

app.get('/api/catalogue/clubs', async (request, response) => {
  const search = request.query.search
  const page = parsePaginationValue(request.query.page, 1)
  const pageSize = parsePaginationValue(request.query.pageSize, 10)

  if (
    typeof search !== 'string' ||
    search.trim() === '' ||
    search.trim().length > 100
  ) {
    response.status(400).json({ error: 'Club search query is required' })
    return
  }

  if (page === null || pageSize === null || pageSize > 25) {
    response.status(400).json({ error: 'Invalid pagination' })
    return
  }

  const normalizedSearch = search.trim()
  const where = {
    AND: getClubNameSearchTerms(normalizedSearch).map((searchTerm) => ({
      name: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    })),
  }
  const [total, clubs] = await prisma.$transaction([
    prisma.club.count({ where }),
    prisma.club.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: CATALOGUE_CLUB_SELECT,
    }),
  ])

  response.status(200).json({
    clubs: clubs.map(({ _count, ...club }) => ({
      ...club,
      courseCount: _count.courses,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

app.get('/api/catalogue/courses', async (request, response) => {
  const clubQuery = request.query.club
  const courseQuery = request.query.course
  const page = parsePaginationValue(request.query.page, 1)
  const pageSize = parsePaginationValue(request.query.pageSize, 10)

  if (
    (clubQuery !== undefined && typeof clubQuery !== 'string') ||
    (courseQuery !== undefined && typeof courseQuery !== 'string')
  ) {
    response.status(400).json({
      error: 'Club or course search query is required',
    })
    return
  }

  const clubSearch = clubQuery?.trim() ?? ''
  const courseSearch = courseQuery?.trim() ?? ''

  if (
    (!clubSearch && !courseSearch) ||
    clubSearch.length > 100 ||
    courseSearch.length > 100
  ) {
    response.status(400).json({
      error: 'Club or course search query is required',
    })
    return
  }

  if (page === null || pageSize === null || pageSize > 25) {
    response.status(400).json({ error: 'Invalid pagination' })
    return
  }

  const where = {
    AND: [
      ...(clubSearch
        ? [
            {
              club: {
                name: {
                  contains: clubSearch,
                  mode: 'insensitive' as const,
                },
              },
            },
          ]
        : []),
      ...(courseSearch
        ? [
            {
              name: {
                contains: courseSearch,
                mode: 'insensitive' as const,
              },
            },
          ]
        : []),
    ],
  }
  const [total, courses] = await prisma.$transaction([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: [
        { club: { name: 'asc' } },
        { name: 'asc' },
        { id: 'asc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: CATALOGUE_COURSE_SELECT,
    }),
  ])

  response.status(200).json({
    courses: courses.map((course) => ({
      ...course,
      tees: course.tees.map((tee) => ({
        ...tee,
        courseRating: Number(tee.courseRating),
      })),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

app.get('/api/courses', async (_request, response) => {
  const clubs = await prisma.club.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      courses: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          tees: {
            orderBy: { teeName: 'asc' },
            select: {
              id: true,
              teeName: true,
              courseRating: true,
              slopeRating: true,
              par: true,
            },
          },
        },
      },
    },
  })

  response.status(200).json(
    clubs.flatMap((club) => {
      const courses = club.courses
        .filter((course) => course.tees.length > 0)
        .map((course) => ({
          ...course,
          tees: course.tees.map((tee) => ({
            ...tee,
            courseRating: Number(tee.courseRating),
          })),
        }))

      return courses.length > 0 ? [{ ...club, courses }] : []
    }),
  )
})

app.get('/api/tees/:teeId/scorecard', async (request, response) => {
  const teeId = request.params.teeId

  if (typeof teeId !== 'string' || !UUID_PATTERN.test(teeId)) {
    response.status(400).json({ error: 'Invalid tee ID' })
    return
  }

  const tee = await prisma.tee.findUnique({
    where: { id: teeId },
    select: {
      id: true,
      externalId: true,
      teeName: true,
      courseRating: true,
      slopeRating: true,
      course: {
        select: {
          id: true,
          externalId: true,
          name: true,
          club: {
            select: {
              id: true,
              externalId: true,
              name: true,
            },
          },
        },
      },
      holes: {
        orderBy: { holeNumber: 'asc' },
        select: {
          holeNumber: true,
          par: true,
          strokeIndex: true,
          yardage: true,
        },
      },
    },
  })

  if (!tee) {
    response.status(404).json({ error: 'Tee not found' })
    return
  }

  if (isCompleteScorecard(tee.holes)) {
    response.status(200).json({
      status: 'available',
      source: 'saved',
      holes: tee.holes,
    })
    return
  }

  let courseExternalId = tee.course.externalId
  let teeExternalId = tee.externalId

  if (!courseExternalId) {
    const providerClub = tee.course.club.externalId
      ? {
          id: tee.course.club.externalId,
          name: tee.course.club.name,
        }
      : findBestClubNameMatch(
          await searchCourseProviderClubs(tee.course.club.name),
          tee.course.club.name,
        )
    const providerCourseData = providerClub
      ? await getProviderClubCourseRatings(providerClub)
      : null
    const providerTee = providerCourseData?.tees.find((candidate) => {
      const candidateCourseName =
        candidate.courseName ?? providerCourseData.clubName

      return (
        typeof candidate.courseExternalId === 'string' &&
        normalizeLabel(candidateCourseName) ===
          normalizeLabel(tee.course.name) &&
        normalizeLabel(candidate.teeName) === normalizeLabel(tee.teeName) &&
        Math.abs(candidate.courseRating - Number(tee.courseRating)) < 0.001 &&
        candidate.slopeRating === tee.slopeRating
      )
    })

    if (providerClub && providerTee?.courseExternalId) {
      courseExternalId = providerTee.courseExternalId
      teeExternalId = providerTee.teeExternalId ?? teeExternalId

      await prisma.$transaction([
        prisma.course.update({
          where: { id: tee.course.id },
          data: { externalId: courseExternalId },
        }),
        ...(!tee.course.club.externalId
          ? [
              prisma.club.update({
                where: { id: tee.course.club.id },
                data: { externalId: providerClub.id },
              }),
            ]
          : []),
        ...(!tee.externalId && teeExternalId
          ? [
              prisma.tee.update({
                where: { id: tee.id },
                data: { externalId: teeExternalId },
              }),
            ]
          : []),
      ])
    }
  }

  if (!courseExternalId) {
    response.status(200).json({ status: 'manual_required', holes: [] })
    return
  }

  const providerScorecard = await getProviderTeeScorecard(
    courseExternalId,
    {
      externalId: teeExternalId,
      teeName: tee.teeName,
      courseRating: Number(tee.courseRating),
      slopeRating: tee.slopeRating,
    },
  )

  if (!providerScorecard) {
    response.status(200).json({ status: 'manual_required', holes: [] })
    return
  }

  await prisma.$transaction([
    prisma.teeHole.deleteMany({ where: { teeId } }),
    prisma.teeHole.createMany({
      data: providerScorecard.holes.map((hole) => ({
        teeId,
        ...hole,
        source: ScorecardSource.API,
      })),
    }),
  ])

  response.status(200).json({
    status: 'available',
    source: 'provider',
    holes: providerScorecard.holes.map((hole) => ({
      ...hole,
      yardage: hole.yardage ?? null,
    })),
  })
})

app.get('/api/courses/provider/clubs', async (request, response) => {
  const query = request.query.q

  if (
    typeof query !== 'string' ||
    query.trim() === '' ||
    query.trim().length > 100
  ) {
    response.status(400).json({ error: 'Provider club search is required' })
    return
  }

  const clubs = await searchCourseProviderClubs(query.trim())

  response.status(200).json({ clubs })
})

app.get(
  '/api/courses/provider/clubs/:clubId/courses',
  async (request, response) => {
    const clubId = request.params.clubId
    const clubName = request.query.name

    if (
      typeof clubId !== 'string' ||
      !UUID_PATTERN.test(clubId) ||
      typeof clubName !== 'string' ||
      clubName.trim() === '' ||
      clubName.trim().length > 100
    ) {
      response.status(400).json({ error: 'Invalid provider club selection' })
      return
    }

    const courseData = await getProviderClubCourseRatings({
      id: clubId,
      name: clubName.trim(),
    })

    if (!courseData) {
      response.status(404).json({ error: 'Course ratings not found' })
      return
    }

    response.status(200).json({
      ...courseData,
      tees: courseData.tees.map((tee) => ({ ...tee, isSaved: false })),
    })
  },
)

app.get('/api/courses/search', async (request, response) => {
  const query = request.query.q

  if (typeof query !== 'string' || query.trim() === '') {
    response.status(400).json({
      error: 'Course search query is required',
    })
    return
  }

  const clubName = query.trim()
  const localClubs = await prisma.club.findMany({
    where: {
      AND: getClubNameSearchTerms(clubName).map((searchTerm) => ({
        name: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })),
    },
    include: {
      courses: {
        include: {
          tees: true,
        },
      },
    },
  })
  const localClub = findBestClubNameMatch(localClubs, clubName)
  const firstLocalTee = localClub?.courses[0]?.tees[0]
  const savedCourseData: CourseData | null =
    localClub && firstLocalTee
      ? {
          ...(localClub.externalId
            ? { clubExternalId: localClub.externalId }
            : {}),
          clubName: localClub.name,
          source: COURSE_DATA_SOURCE_BY_TEE_SOURCE[firstLocalTee.source],
          tees: localClub.courses.flatMap((course) =>
            course.tees.map((tee) => ({
              ...(course.externalId
                ? { courseExternalId: course.externalId }
                : {}),
              ...(tee.externalId ? { teeExternalId: tee.externalId } : {}),
              courseName: course.name,
              teeName: tee.teeName,
              courseRating: Number(tee.courseRating),
              slopeRating: tee.slopeRating,
              ...(tee.par === null ? {} : { par: tee.par }),
            })),
          ),
        }
      : null
  const lookupData = await getCourseRatings(localClub?.name ?? clubName)
  const courseData = mergeCourseSearchData(lookupData, savedCourseData)

  if (!courseData) {
    response.status(404).json({
      error: 'Course ratings not found',
    })
    return
  }

  response.status(200).json(courseData)
})

app.post('/api/courses', async (request, response) => {
  const body: unknown = request.body

  if (!isRecord(body)) {
    response.status(400).json({ error: 'Invalid course data' })
    return
  }

  const clubName = body.clubName
  const clubExternalId = body.clubExternalId
  const source = getTeeSource(body.source)
  const tees = body.tees

  if (
    typeof clubName !== 'string' ||
    clubName.trim() === '' ||
    !source ||
    (clubExternalId !== undefined &&
      (typeof clubExternalId !== 'string' ||
        !UUID_PATTERN.test(clubExternalId))) ||
    !Array.isArray(tees) ||
    tees.length === 0
  ) {
    response.status(400).json({ error: 'Invalid course data' })
    return
  }

  const coursesByName = new Map<string, CoursePersistenceData>()

  for (const tee of tees) {
    if (
      !isRecord(tee) ||
      typeof tee.courseName !== 'string' ||
      tee.courseName.trim() === '' ||
      typeof tee.teeName !== 'string' ||
      tee.teeName.trim() === '' ||
      (tee.courseExternalId !== undefined &&
        (typeof tee.courseExternalId !== 'string' ||
          !UUID_PATTERN.test(tee.courseExternalId))) ||
      (tee.teeExternalId !== undefined &&
        (typeof tee.teeExternalId !== 'string' ||
          !UUID_PATTERN.test(tee.teeExternalId))) ||
      typeof tee.courseRating !== 'number' ||
      !Number.isFinite(tee.courseRating) ||
      typeof tee.slopeRating !== 'number' ||
      !Number.isInteger(tee.slopeRating) ||
      (tee.par !== undefined &&
        (typeof tee.par !== 'number' || !Number.isInteger(tee.par)))
    ) {
      response.status(400).json({ error: 'Invalid course data' })
      return
    }

    const courseName = tee.courseName.trim()
    const courseData = coursesByName.get(courseName) ?? { tees: [] }

    courseData.tees.push({
      ...(typeof tee.teeExternalId === 'string'
        ? { externalId: tee.teeExternalId }
        : {}),
      teeName: tee.teeName.trim(),
      courseRating: tee.courseRating,
      slopeRating: tee.slopeRating,
      ...(typeof tee.par === 'number' ? { par: tee.par } : {}),
      source,
    })
    if (typeof tee.courseExternalId === 'string') {
      courseData.externalId = tee.courseExternalId
    }
    coursesByName.set(courseName, courseData)
  }

  const normalizedClubName = clubName.trim()
  const existingClub = await prisma.club.findFirst({
    where: {
      name: {
        equals: normalizedClubName,
        mode: 'insensitive',
      },
    },
    include: {
      courses: {
        include: {
          tees: true,
        },
      },
    },
  })

  if (existingClub) {
    const coursesToCreate: Array<{
      name: string
      externalId?: string
      tees: { create: TeePersistenceData[] }
    }> = []
    const coursesToUpdate: Array<{
      where: { id: string }
      data: {
        externalId?: string
        tees: {
          create: TeePersistenceData[]
          update?: Array<{
            where: { id: string }
            data: { externalId: string }
          }>
        }
      }
    }> = []

    for (const [courseName, courseData] of coursesByName) {
      const existingCourse = existingClub.courses.find(
        (course) => normalizeLabel(course.name) === normalizeLabel(courseName),
      )

      if (!existingCourse) {
        coursesToCreate.push({
          name: courseName,
          ...(courseData.externalId
            ? { externalId: courseData.externalId }
            : {}),
          tees: { create: courseData.tees },
        })
        continue
      }

      const savedTeeKeys = new Set(
        existingCourse.tees.map((tee) => getTeePersistenceKey(tee)),
      )
      const newTees = courseData.tees.filter(
        (tee) => !savedTeeKeys.has(getTeePersistenceKey(tee)),
      )
      const teesToUpdate = courseData.tees.flatMap((tee) => {
        if (!tee.externalId) {
          return []
        }

        const savedTee = existingCourse.tees.find(
          (candidate) =>
            getTeePersistenceKey(candidate) === getTeePersistenceKey(tee),
        )

        return savedTee && !savedTee.externalId
          ? [
              {
                where: { id: savedTee.id },
                data: { externalId: tee.externalId },
              },
            ]
          : []
      })

      if (
        newTees.length > 0 ||
        teesToUpdate.length > 0 ||
        (courseData.externalId && !existingCourse.externalId)
      ) {
        coursesToUpdate.push({
          where: { id: existingCourse.id },
          data: {
            ...(courseData.externalId && !existingCourse.externalId
              ? { externalId: courseData.externalId }
              : {}),
            tees: {
              create: newTees,
              ...(teesToUpdate.length > 0 ? { update: teesToUpdate } : {}),
            },
          },
        })
      }
    }

    const shouldAddClubExternalId =
      typeof clubExternalId === 'string' && !existingClub.externalId

    if (
      coursesToCreate.length === 0 &&
      coursesToUpdate.length === 0 &&
      !shouldAddClubExternalId
    ) {
      response.status(200).json(existingClub)
      return
    }

    const updatedClub = await prisma.club.update({
      where: { id: existingClub.id },
      data: {
        ...(shouldAddClubExternalId ? { externalId: clubExternalId } : {}),
        courses: {
          create: coursesToCreate,
          update: coursesToUpdate,
        },
      },
      include: {
        courses: {
          include: {
            tees: true,
          },
        },
      },
    })

    response.status(201).json(updatedClub)
    return
  }

  const club = await prisma.club.create({
    data: {
      ...(typeof clubExternalId === 'string'
        ? { externalId: clubExternalId }
        : {}),
      name: normalizedClubName,
      courses: {
        create: [...coursesByName].map(([courseName, courseData]) => ({
          name: courseName,
          ...(courseData.externalId
            ? { externalId: courseData.externalId }
            : {}),
          tees: {
            create: courseData.tees,
          },
        })),
      },
    },
    include: {
      courses: {
        include: {
          tees: true,
        },
      },
    },
  })

  response.status(201).json(club)
})

app.post('/api/users', async (request, response) => {
  const authenticatedUser = getRequestUser(response.locals)

  if (!authenticatedUser.emailConfirmed) {
    response.status(403).json({
      error: 'Confirm your email before continuing',
    })
    return
  }

  const linkedProfile = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: PROFILE_SELECT,
  })

  if (linkedProfile) {
    response.status(200).json(serializeProfile(linkedProfile))
    return
  }

  const existingProfile = await prisma.user.findFirst({
    where: {
      email: {
        equals: authenticatedUser.email,
        mode: 'insensitive',
      },
    },
    select: { id: true, authUserId: true },
  })

  if (existingProfile?.authUserId) {
    response.status(409).json({
      error: 'This profile is already linked to another account',
    })
    return
  }

  try {
    if (existingProfile) {
      const claimedProfile = await prisma.user.update({
        where: { id: existingProfile.id },
        data: { authUserId: authenticatedUser.id },
        select: PROFILE_SELECT,
      })

      response.status(200).json(serializeProfile(claimedProfile))
      return
    }

    const body: unknown = request.body
    const name = isRecord(body) ? body.name : undefined

    if (typeof name !== 'string' || name.trim() === '') {
      response.status(400).json({
        error: 'Name is required for a new profile',
      })
      return
    }

    const createdProfile = await prisma.user.create({
      data: {
        name: name.trim(),
        email: authenticatedUser.email.trim().toLowerCase(),
        authUserId: authenticatedUser.id,
      },
      select: PROFILE_SELECT,
    })

    response.status(201).json(serializeProfile(createdProfile))
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      response.status(409).json({
        error: 'This account or email is already linked to a profile',
      })
      return
    }

    throw error
  }
})

app.post('/api/rounds', async (request, response) => {
  const authenticatedUser = getRequestUser(response.locals)
  const profile = await prisma.user.findUnique({
    where: { authUserId: authenticatedUser.id },
    select: { id: true },
  })

  if (!profile) {
    response.status(404).json({ error: 'Profile not found' })
    return
  }

  const input = parseLogRoundInput(
    isRecord(request.body)
      ? { ...request.body, userId: profile.id }
      : request.body,
  )

  if (!input) {
    response.status(400).json({ error: 'Invalid round data' })
    return
  }

  try {
    const result = await logRound(input)

    response.status(201).json(result)
  } catch (error: unknown) {
    if (error instanceof RoundReferenceNotFoundError) {
      const referenceName =
        error.reference === 'user' ? 'User' : 'Tee'

      response.status(404).json({ error: `${referenceName} not found` })
      return
    }

    throw error
  }
})

export default app
