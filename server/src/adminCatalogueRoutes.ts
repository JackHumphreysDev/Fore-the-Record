import { randomUUID } from 'node:crypto'
import { Router, type Response } from 'express'
import {
  AdminCatalogueValidationError,
  parseAdminClubInput,
  parseAdminCourseInput,
  parseAdminScorecardInput,
  parseAdminTeeInput,
  parseCatalogueDeleteConfirmation,
} from './adminCatalogue.js'
import { prisma } from './database.js'
import type { Prisma } from './generated/prisma/client.js'
import { ScorecardSource, TeeSource } from './generated/prisma/enums.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ADMIN_CATALOGUE_SELECT = {
  id: true,
  externalId: true,
  name: true,
  city: true,
  county: true,
  postcode: true,
  countryCode: true,
  latitude: true,
  longitude: true,
  googleRating: true,
  clubType: true,
  courseType: true,
  _count: { select: { members: true, courses: true } },
  courses: {
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      externalId: true,
      name: true,
      holes: true,
      par: true,
      designedBy: true,
      yearOpened: true,
      _count: { select: { tees: true } },
      tees: {
        orderBy: [{ teeName: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          externalId: true,
          teeName: true,
          colour: true,
          gender: true,
          totalYardage: true,
          totalMetres: true,
          par: true,
          courseRating: true,
          slopeRating: true,
          source: true,
          _count: { select: { rounds: true, scorecardReviews: true } },
          holes: {
            orderBy: { holeNumber: 'asc' },
            select: {
              holeNumber: true,
              par: true,
              strokeIndex: true,
              yardage: true,
              source: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ClubSelect

type AdminCatalogueClub = Prisma.ClubGetPayload<{
  select: typeof ADMIN_CATALOGUE_SELECT
}>

function parsePage(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function getAdministratorId(locals: Record<string, unknown>): string {
  return (locals.adminProfile as { id: string }).id
}

function serializeCatalogue(club: AdminCatalogueClub) {
  const { _count: clubCount, ...clubData } = club
  return {
    ...clubData,
    canDelete: clubCount.members === 0 && clubCount.courses === 0,
    courses: club.courses.map((course) => {
      const { _count: courseCount, ...courseData } = course
      return {
        ...courseData,
        canDelete: courseCount.tees === 0,
        tees: course.tees.map((tee) => {
          const { _count: teeCount, ...teeData } = tee
          return {
            ...teeData,
            courseRating: Number(tee.courseRating),
            canDelete:
              teeCount.rounds === 0 && teeCount.scorecardReviews === 0,
            isUsed: teeCount.rounds > 0,
          }
        }),
      }
    }),
  }
}

function sendValidationError(response: Response, error: unknown): boolean {
  if (error instanceof AdminCatalogueValidationError) {
    response.status(400).json({ error: error.message })
    return true
  }
  return false
}

const router = Router()

router.get('/', async (request, response) => {
  const page = parsePage(request.query.page, 1)
  const pageSize = parsePage(request.query.pageSize, 10)
  const rawSearch = request.query.search

  if (
    page === null ||
    pageSize === null ||
    pageSize > 20 ||
    (rawSearch !== undefined && typeof rawSearch !== 'string')
  ) {
    response.status(400).json({ error: 'Invalid catalogue search' })
    return
  }

  const search = typeof rawSearch === 'string' ? rawSearch.trim() : ''
  if (search.length > 100) {
    response.status(400).json({ error: 'Invalid catalogue search' })
    return
  }

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { city: { contains: search, mode: 'insensitive' as const } },
          { county: { contains: search, mode: 'insensitive' as const } },
          { postcode: { contains: search, mode: 'insensitive' as const } },
          {
            courses: {
              some: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  {
                    tees: {
                      some: {
                        teeName: {
                          contains: search,
                          mode: 'insensitive' as const,
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      }
    : {}

  const [total, clubs] = await prisma.$transaction([
    prisma.club.count({ where }),
    prisma.club.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ADMIN_CATALOGUE_SELECT,
    }),
  ])

  response.status(200).json({
    clubs: clubs.map(serializeCatalogue),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

router.post('/clubs', async (request, response) => {
  let input
  try {
    input = parseAdminClubInput(request.body)
  } catch (error: unknown) {
    if (sendValidationError(response, error)) return
    throw error
  }

  const duplicate = await prisma.club.findFirst({
    where: { name: { equals: input.name, mode: 'insensitive' } },
    select: { id: true },
  })
  if (duplicate) {
    response.status(409).json({ error: 'A club with this name already exists' })
    return
  }

  const id = randomUUID()
  const administratorId = getAdministratorId(response.locals)
  await prisma.$transaction([
    prisma.club.create({ data: { id, ...input }, select: { id: true } }),
    prisma.adminAuditLog.create({
      data: {
        actorUserId: administratorId,
        action: 'CATALOGUE_CLUB_CREATED',
        targetType: 'Club',
        targetId: id,
        after: input,
      },
    }),
  ])
  response.status(201).json({ id })
})

router.patch('/clubs/:clubId', async (request, response) => {
  const clubId = request.params.clubId
  if (typeof clubId !== 'string' || !UUID_PATTERN.test(clubId)) {
    response.status(400).json({ error: 'Invalid club ID' })
    return
  }

  let input
  try {
    input = parseAdminClubInput(request.body)
  } catch (error: unknown) {
    if (sendValidationError(response, error)) return
    throw error
  }

  const existing = await prisma.club.findUnique({ where: { id: clubId } })
  if (!existing) {
    response.status(404).json({ error: 'Club not found' })
    return
  }

  const duplicate = await prisma.club.findFirst({
    where: {
      id: { not: clubId },
      name: { equals: input.name, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (duplicate) {
    response.status(409).json({ error: 'A club with this name already exists' })
    return
  }

  await prisma.$transaction([
    prisma.club.update({ where: { id: clubId }, data: input }),
    prisma.adminAuditLog.create({
      data: {
        actorUserId: getAdministratorId(response.locals),
        action: 'CATALOGUE_CLUB_UPDATED',
        targetType: 'Club',
        targetId: clubId,
        before: existing,
        after: input,
      },
    }),
  ])
  response.status(200).json({ id: clubId })
})

router.delete('/clubs/:clubId', async (request, response) => {
  const clubId = request.params.clubId
  if (typeof clubId !== 'string' || !UUID_PATTERN.test(clubId)) {
    response.status(400).json({ error: 'Invalid club ID' })
    return
  }
  try {
    parseCatalogueDeleteConfirmation(request.body)
  } catch (error: unknown) {
    if (sendValidationError(response, error)) return
    throw error
  }

  const existing = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, _count: { select: { members: true, courses: true } } },
  })
  if (!existing) {
    response.status(404).json({ error: 'Club not found' })
    return
  }
  if (existing._count.members > 0 || existing._count.courses > 0) {
    response.status(409).json({ error: 'This club is in use. Remove its home-club links and courses first.' })
    return
  }

  await prisma.$transaction([
    prisma.club.delete({ where: { id: clubId } }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_CLUB_DELETED', targetType: 'Club', targetId: clubId, before: { name: existing.name } } }),
  ])
  response.status(200).json({ id: clubId })
})

router.post('/clubs/:clubId/courses', async (request, response) => {
  const clubId = request.params.clubId
  if (typeof clubId !== 'string' || !UUID_PATTERN.test(clubId)) {
    response.status(400).json({ error: 'Invalid club ID' })
    return
  }
  let input
  try { input = parseAdminCourseInput(request.body) } catch (error: unknown) {
    if (sendValidationError(response, error)) return
    throw error
  }
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } })
  if (!club) { response.status(404).json({ error: 'Club not found' }); return }
  const duplicate = await prisma.course.findFirst({ where: { clubId, name: { equals: input.name, mode: 'insensitive' } }, select: { id: true } })
  if (duplicate) { response.status(409).json({ error: 'This course already exists at the club' }); return }
  const id = randomUUID()
  await prisma.$transaction([
    prisma.course.create({ data: { id, clubId, ...input }, select: { id: true } }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_COURSE_CREATED', targetType: 'Course', targetId: id, after: { clubId, ...input } } }),
  ])
  response.status(201).json({ id })
})

router.patch('/courses/:courseId', async (request, response) => {
  const courseId = request.params.courseId
  if (typeof courseId !== 'string' || !UUID_PATTERN.test(courseId)) { response.status(400).json({ error: 'Invalid course ID' }); return }
  let input
  try { input = parseAdminCourseInput(request.body) } catch (error: unknown) {
    if (sendValidationError(response, error)) return
    throw error
  }
  const existing = await prisma.course.findUnique({ where: { id: courseId } })
  if (!existing) { response.status(404).json({ error: 'Course not found' }); return }
  const duplicate = await prisma.course.findFirst({ where: { id: { not: courseId }, clubId: existing.clubId, name: { equals: input.name, mode: 'insensitive' } }, select: { id: true } })
  if (duplicate) { response.status(409).json({ error: 'This course already exists at the club' }); return }
  await prisma.$transaction([
    prisma.course.update({ where: { id: courseId }, data: input }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_COURSE_UPDATED', targetType: 'Course', targetId: courseId, before: existing, after: input } }),
  ])
  response.status(200).json({ id: courseId })
})

router.delete('/courses/:courseId', async (request, response) => {
  const courseId = request.params.courseId
  if (typeof courseId !== 'string' || !UUID_PATTERN.test(courseId)) { response.status(400).json({ error: 'Invalid course ID' }); return }
  try { parseCatalogueDeleteConfirmation(request.body) } catch (error: unknown) { if (sendValidationError(response, error)) return; throw error }
  const existing = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, name: true, _count: { select: { tees: true } } } })
  if (!existing) { response.status(404).json({ error: 'Course not found' }); return }
  if (existing._count.tees > 0) { response.status(409).json({ error: 'This course is in use. Remove its tees first.' }); return }
  await prisma.$transaction([
    prisma.course.delete({ where: { id: courseId } }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_COURSE_DELETED', targetType: 'Course', targetId: courseId, before: { name: existing.name } } }),
  ])
  response.status(200).json({ id: courseId })
})

router.post('/courses/:courseId/tees', async (request, response) => {
  const courseId = request.params.courseId
  if (typeof courseId !== 'string' || !UUID_PATTERN.test(courseId)) { response.status(400).json({ error: 'Invalid course ID' }); return }
  let input
  try { input = parseAdminTeeInput(request.body) } catch (error: unknown) { if (sendValidationError(response, error)) return; throw error }
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) { response.status(404).json({ error: 'Course not found' }); return }
  const id = randomUUID()
  await prisma.$transaction([
    prisma.tee.create({ data: { id, courseId, source: TeeSource.MANUAL, ...input }, select: { id: true } }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_TEE_CREATED', targetType: 'Tee', targetId: id, after: { courseId, ...input } } }),
  ])
  response.status(201).json({ id })
})

router.patch('/tees/:teeId', async (request, response) => {
  const teeId = request.params.teeId
  if (typeof teeId !== 'string' || !UUID_PATTERN.test(teeId)) { response.status(400).json({ error: 'Invalid tee ID' }); return }
  let input
  try { input = parseAdminTeeInput(request.body) } catch (error: unknown) { if (sendValidationError(response, error)) return; throw error }
  const existing = await prisma.tee.findUnique({ where: { id: teeId }, include: { _count: { select: { rounds: true } } } })
  if (!existing) { response.status(404).json({ error: 'Tee not found' }); return }
  const ratingsChanged = Number(existing.courseRating) !== input.courseRating || existing.slopeRating !== input.slopeRating || existing.par !== input.par
  if (existing._count.rounds > 0 && ratingsChanged) {
    response.status(409).json({ error: 'Ratings and par are locked because rounds already use this tee. Create a corrected tee instead.' })
    return
  }
  await prisma.$transaction([
    prisma.tee.update({ where: { id: teeId }, data: { ...input, source: TeeSource.MANUAL } }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_TEE_UPDATED', targetType: 'Tee', targetId: teeId, before: { teeName: existing.teeName, courseRating: Number(existing.courseRating), slopeRating: existing.slopeRating, par: existing.par }, after: input } }),
  ])
  response.status(200).json({ id: teeId })
})

router.delete('/tees/:teeId', async (request, response) => {
  const teeId = request.params.teeId
  if (typeof teeId !== 'string' || !UUID_PATTERN.test(teeId)) { response.status(400).json({ error: 'Invalid tee ID' }); return }
  try { parseCatalogueDeleteConfirmation(request.body) } catch (error: unknown) { if (sendValidationError(response, error)) return; throw error }
  const existing = await prisma.tee.findUnique({ where: { id: teeId }, select: { id: true, teeName: true, _count: { select: { rounds: true, scorecardReviews: true } } } })
  if (!existing) { response.status(404).json({ error: 'Tee not found' }); return }
  if (existing._count.rounds > 0 || existing._count.scorecardReviews > 0) { response.status(409).json({ error: 'This tee is in use and cannot be removed.' }); return }
  await prisma.$transaction([
    prisma.tee.delete({ where: { id: teeId } }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_TEE_DELETED', targetType: 'Tee', targetId: teeId, before: { teeName: existing.teeName } } }),
  ])
  response.status(200).json({ id: teeId })
})

router.put('/tees/:teeId/scorecard', async (request, response) => {
  const teeId = request.params.teeId
  if (typeof teeId !== 'string' || !UUID_PATTERN.test(teeId)) { response.status(400).json({ error: 'Invalid tee ID' }); return }
  let holes
  try { holes = parseAdminScorecardInput(request.body) } catch (error: unknown) { if (sendValidationError(response, error)) return; throw error }
  const tee = await prisma.tee.findUnique({ where: { id: teeId }, select: { id: true, _count: { select: { rounds: true } } } })
  if (!tee) { response.status(404).json({ error: 'Tee not found' }); return }
  if (tee._count.rounds > 0) { response.status(409).json({ error: 'This scorecard is locked because rounds already use the tee.' }); return }
  const par = holes.reduce((total, hole) => total + hole.par, 0)
  const yardages = holes.map((hole) => hole.yardage)
  const totalYardage = yardages.every((yardage): yardage is number => typeof yardage === 'number') ? yardages.reduce((total, yardage) => total + yardage, 0) : null
  await prisma.$transaction([
    prisma.teeHole.deleteMany({ where: { teeId } }),
    prisma.teeHole.createMany({ data: holes.map((hole) => ({ teeId, ...hole, source: ScorecardSource.ADMIN })) }),
    prisma.tee.update({ where: { id: teeId }, data: { par, ...(totalYardage === null ? {} : { totalYardage }), source: TeeSource.MANUAL } }),
    prisma.adminAuditLog.create({ data: { actorUserId: getAdministratorId(response.locals), action: 'CATALOGUE_SCORECARD_REPLACED', targetType: 'Tee', targetId: teeId, after: { holes: 18, par, totalYardage } } }),
  ])
  response.status(200).json({ teeId, holeCount: 18 })
})

export default router
