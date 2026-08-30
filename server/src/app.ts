import express from 'express'
import {
  findBestClubNameMatch,
  getClubNameSearchTerms,
} from './clubNameMatch.js'
import { getCourseRatings, type CourseData } from './courseRatings.js'
import { mergeCourseSearchData } from './courseSearch.js'
import { prisma } from './database.js'
import {
  TeeSource,
  type TeeSource as TeeSourceValue,
} from './generated/prisma/enums.js'
import {
  logRound,
  parseLogRoundInput,
  RoundReferenceNotFoundError,
} from './rounds.js'

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

const app = express()

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
  })
})

app.get('/api/users/:id/rounds', async (request, response) => {
  const userId = request.params.id

  if (!UUID_PATTERN.test(userId)) {
    response.status(400).json({ error: 'Invalid user ID' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

app.get('/api/users/:id', async (request, response) => {
  const userId = request.params.id

  if (!UUID_PATTERN.test(userId)) {
    response.status(400).json({ error: 'Invalid user ID' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    },
  })

  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }

  response.status(200).json({
    ...user,
    handicapIndex:
      user.handicapIndex === null ? null : Number(user.handicapIndex),
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
  const body = request.body as Record<string, unknown> | undefined
  const name = body?.name
  const email = body?.email
  const homeClubId = body?.homeClubId

  if (
    typeof name !== 'string' ||
    name.trim() === '' ||
    typeof email !== 'string' ||
    email.trim() === ''
  ) {
    response.status(400).json({
      error: 'Name and email are required',
    })
    return
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        ...(typeof homeClubId === 'string' && homeClubId.trim() !== ''
          ? { homeClubId: homeClubId.trim() }
          : {}),
      },
    })

    response.status(201).json(user)
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      response.status(409).json({
        error: 'A user with this email already exists',
      })
      return
    }

    throw error
  }
})

app.post('/api/rounds', async (request, response) => {
  const input = parseLogRoundInput(request.body)

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
