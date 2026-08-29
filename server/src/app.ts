import express from 'express'
import { getCourseRatings } from './courseRatings.js'
import { prisma } from './database.js'
import { TeeSource } from './generated/prisma/enums.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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

app.get('/api/courses/search', async (request, response) => {
  const query = request.query.q

  if (typeof query !== 'string' || query.trim() === '') {
    response.status(400).json({
      error: 'Course search query is required',
    })
    return
  }

  const courseData = await getCourseRatings(query.trim())

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

  const coursesByName = new Map<
    string,
    Array<{
      teeName: string
      courseRating: number
      slopeRating: number
      par?: number
      source: typeof source
    }>
  >()

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

  const club = await prisma.club.create({
    data: {
      name: clubName.trim(),
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

export default app
