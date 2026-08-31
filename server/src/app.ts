import express from 'express'
import {
  getAuthenticatedUser,
  type AuthenticatedUser,
} from './auth.js'
import {
  findBestClubNameMatch,
  getClubNameSearchTerms,
} from './clubNameMatch.js'
import { getCourseRatings, type CourseData } from './courseRatings.js'
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
} from './generated/prisma/enums.js'
import {
  logRound,
  parseLogRoundInput,
  RoundReferenceNotFoundError,
} from './rounds.js'
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

type AdminProfile = {
  id: string
  name: string
  email: string
  role: typeof UserRole.ADMIN
}

type TeePersistenceData = {
  teeName: string
  courseRating: number
  slopeRating: number
  par?: number
  source: TeeSourceValue
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
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
          grossScore: true,
          adjustedGrossScore: true,
          isCapped: true,
          weatherCondition: true,
          pccAdjustment: true,
          scoreDifferential: true,
          isAcceptable: true,
          usedInHandicapCalc: true,
          createdAt: true,
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
      scoreDifferential: Number(round.scoreDifferential),
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
          clubName: localClub.name,
          source: COURSE_DATA_SOURCE_BY_TEE_SOURCE[firstLocalTee.source],
          tees: localClub.courses.flatMap((course) =>
            course.tees.map((tee) => ({
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
  const source = getTeeSource(body.source)
  const tees = body.tees

  if (
    typeof clubName !== 'string' ||
    clubName.trim() === '' ||
    !source ||
    !Array.isArray(tees) ||
    tees.length === 0
  ) {
    response.status(400).json({ error: 'Invalid course data' })
    return
  }

  const coursesByName = new Map<string, TeePersistenceData[]>()

  for (const tee of tees) {
    if (
      !isRecord(tee) ||
      typeof tee.courseName !== 'string' ||
      tee.courseName.trim() === '' ||
      typeof tee.teeName !== 'string' ||
      tee.teeName.trim() === '' ||
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
    const courseTees = coursesByName.get(courseName) ?? []

    courseTees.push({
      teeName: tee.teeName.trim(),
      courseRating: tee.courseRating,
      slopeRating: tee.slopeRating,
      ...(typeof tee.par === 'number' ? { par: tee.par } : {}),
      source,
    })
    coursesByName.set(courseName, courseTees)
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
      tees: { create: TeePersistenceData[] }
    }> = []
    const coursesToUpdate: Array<{
      where: { id: string }
      data: {
        tees: {
          create: TeePersistenceData[]
        }
      }
    }> = []

    for (const [courseName, courseTees] of coursesByName) {
      const existingCourse = existingClub.courses.find(
        (course) => normalizeLabel(course.name) === normalizeLabel(courseName),
      )

      if (!existingCourse) {
        coursesToCreate.push({
          name: courseName,
          tees: { create: courseTees },
        })
        continue
      }

      const savedTeeNames = new Set(
        existingCourse.tees.map((tee) => normalizeLabel(tee.teeName)),
      )
      const newTees = courseTees.filter(
        (tee) => !savedTeeNames.has(normalizeLabel(tee.teeName)),
      )

      if (newTees.length > 0) {
        coursesToUpdate.push({
          where: { id: existingCourse.id },
          data: {
            tees: { create: newTees },
          },
        })
      }
    }

    if (coursesToCreate.length === 0 && coursesToUpdate.length === 0) {
      response.status(200).json(existingClub)
      return
    }

    const updatedClub = await prisma.club.update({
      where: { id: existingClub.id },
      data: {
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
      name: normalizedClubName,
      courses: {
        create: [...coursesByName].map(([courseName, courseTees]) => ({
          name: courseName,
          tees: {
            create: courseTees,
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
