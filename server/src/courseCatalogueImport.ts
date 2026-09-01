import { setTimeout as wait } from 'node:timers/promises'
import {
  parseCatalogueClubPage,
  parseCatalogueCourses,
  type CatalogueClient,
  type CatalogueClub,
  type CatalogueCourse,
  type CatalogueStore,
  type CatalogueTeeSet,
} from './courseCatalogue.js'
import { prisma } from './database.js'
import { TeeSource } from './generated/prisma/enums.js'

type RapidApiCatalogueClientOptions = {
  apiKey: string
  apiHost: string
  clubsPath: string
  retries?: number
  retryDelayMs?: number
  fetchImplementation?: typeof fetch
  waitImplementation?: (milliseconds: number) => Promise<unknown>
}

type CatalogueImportCommandOptions = {
  dryRun: boolean
  startPage: number
  perPage: number
  maxClubs?: number
}

function getRetryDelay(
  response: Response,
  attempt: number,
  baseDelayMs: number,
): number {
  const retryAfter = response.headers.get('retry-after')
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN

  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
    ? retryAfterSeconds * 1000
    : baseDelayMs * 2 ** attempt
}

export function createRapidApiCatalogueClient(
  options: RapidApiCatalogueClientOptions,
): CatalogueClient {
  const fetchImplementation = options.fetchImplementation ?? fetch
  const waitImplementation =
    options.waitImplementation ?? ((milliseconds) => wait(milliseconds))
  const retries = options.retries ?? 3
  const retryDelayMs = options.retryDelayMs ?? 750
  const baseUrl = `https://${options.apiHost}`
  const headers = {
    'X-RapidAPI-Key': options.apiKey,
    'X-RapidAPI-Host': options.apiHost,
  }

  async function requestJson(url: URL, label: string): Promise<unknown> {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const response = await fetchImplementation(url, { headers })

      if (response.ok) {
        return response.json()
      }

      const mayRetry = response.status === 429 || response.status >= 500

      if (!mayRetry || attempt === retries) {
        throw new Error(
          `RapidAPI ${label} request failed with status ${response.status}`,
        )
      }

      await waitImplementation(getRetryDelay(response, attempt, retryDelayMs))
    }

    throw new Error(`RapidAPI ${label} request failed`)
  }

  return {
    async listClubs(page, perPage) {
      const url = new URL(options.clubsPath, baseUrl)

      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', String(perPage))

      return parseCatalogueClubPage(await requestJson(url, 'clubs'))
    },

    async listCourses(clubExternalId) {
      const url = new URL(
        `/clubs/${encodeURIComponent(clubExternalId)}/courses`,
        baseUrl,
      )

      return parseCatalogueCourses(await requestJson(url, 'courses'))
    },
  }
}

function getClubData(club: CatalogueClub) {
  return {
    externalId: club.externalId,
    name: club.name,
    city: club.city,
    county: club.county,
    postcode: club.postcode,
    countryCode: club.countryCode,
    latitude: club.latitude,
    longitude: club.longitude,
    googleRating: club.googleRating,
    clubType: club.clubType,
    courseType: club.courseType,
  }
}

function getCourseData(course: CatalogueCourse) {
  return {
    externalId: course.externalId,
    name: course.name,
    holes: course.holes,
    par: course.par,
    designedBy: course.designedBy,
    yearOpened: course.yearOpened,
  }
}

function getTeeData(tee: CatalogueTeeSet) {
  return {
    externalId: tee.externalId,
    teeName: tee.name,
    colour: tee.colour,
    gender: tee.gender,
    totalYardage: tee.totalYardage,
    totalMetres: tee.totalMetres,
    par: tee.par,
    courseRating: tee.courseRating,
    slopeRating: tee.slopeRating,
    source: TeeSource.API,
  }
}

export function createPrismaCatalogueStore(): CatalogueStore {
  return {
    async saveClub(club, courses) {
      await prisma.$transaction(async (transaction) => {
        const clubByExternalId = await transaction.club.findUnique({
          where: { externalId: club.externalId },
          select: { id: true },
        })
        const legacyClub = clubByExternalId
          ? null
          : await transaction.club.findFirst({
              where: {
                externalId: null,
                name: { equals: club.name, mode: 'insensitive' },
              },
              select: { id: true },
            })
        const existingClub = clubByExternalId ?? legacyClub

        if (!existingClub) {
          await transaction.club.create({
            data: {
              ...getClubData(club),
              courses: {
                create: courses.map((course) => ({
                  ...getCourseData(course),
                  tees: {
                    create: course.tees.map(getTeeData),
                  },
                })),
              },
            },
            select: { id: true },
          })
          return
        }

        await transaction.club.update({
          where: { id: existingClub.id },
          data: getClubData(club),
          select: { id: true },
        })

        for (const course of courses) {
          const courseByExternalId = await transaction.course.findUnique({
            where: { externalId: course.externalId },
            select: { id: true },
          })
          const legacyCourse = courseByExternalId
            ? null
            : await transaction.course.findFirst({
                where: {
                  clubId: existingClub.id,
                  externalId: null,
                  name: { equals: course.name, mode: 'insensitive' },
                },
                select: { id: true },
              })
          const existingCourse = courseByExternalId ?? legacyCourse
          const persistedCourse = existingCourse
            ? await transaction.course.update({
                where: { id: existingCourse.id },
                data: {
                  ...getCourseData(course),
                  clubId: existingClub.id,
                },
                select: { id: true },
              })
            : await transaction.course.create({
                data: {
                  ...getCourseData(course),
                  clubId: existingClub.id,
                },
                select: { id: true },
              })

          for (const tee of course.tees) {
            const teeByExternalId = await transaction.tee.findUnique({
              where: { externalId: tee.externalId },
              select: { id: true },
            })
            const legacyTee = teeByExternalId
              ? null
              : await transaction.tee.findFirst({
                  where: {
                    courseId: persistedCourse.id,
                    externalId: null,
                    teeName: { equals: tee.name, mode: 'insensitive' },
                    courseRating: tee.courseRating,
                    slopeRating: tee.slopeRating,
                  },
                  select: { id: true },
                })
            const existingTee = teeByExternalId ?? legacyTee

            if (existingTee) {
              await transaction.tee.update({
                where: { id: existingTee.id },
                data: {
                  ...getTeeData(tee),
                  courseId: persistedCourse.id,
                },
                select: { id: true },
              })
            } else {
              await transaction.tee.create({
                data: {
                  ...getTeeData(tee),
                  courseId: persistedCourse.id,
                },
                select: { id: true },
              })
            }
          }
        }
      })
    },
  }
}

function parsePositiveInteger(value: string, optionName: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${optionName} must be a positive whole number`)
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive whole number`)
  }

  return parsed
}

export function parseCatalogueImportCommandOptions(
  argumentsToParse: string[],
): CatalogueImportCommandOptions {
  let dryRun = true
  let startPage = 1
  let perPage = 20
  let maxClubs: number | undefined

  for (const argument of argumentsToParse) {
    if (argument === '--dry-run') {
      dryRun = true
      continue
    }

    if (argument === '--write') {
      dryRun = false
      continue
    }

    if (argument.startsWith('--start-page=')) {
      startPage = parsePositiveInteger(
        argument.slice('--start-page='.length),
        '--start-page',
      )
      continue
    }

    if (argument.startsWith('--per-page=')) {
      perPage = parsePositiveInteger(
        argument.slice('--per-page='.length),
        '--per-page',
      )
      continue
    }

    if (argument.startsWith('--max-clubs=')) {
      maxClubs = parsePositiveInteger(
        argument.slice('--max-clubs='.length),
        '--max-clubs',
      )
      continue
    }

    throw new Error(`Unknown catalogue import option: ${argument}`)
  }

  return {
    dryRun,
    startPage,
    perPage,
    ...(maxClubs === undefined ? {} : { maxClubs }),
  }
}
