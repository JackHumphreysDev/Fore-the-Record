export type CatalogueClub = {
  externalId: string
  name: string
  city: string | null
  county: string | null
  postcode: string | null
  countryCode: string | null
  latitude: number | null
  longitude: number | null
  googleRating: number | null
  clubType: string | null
  courseType: string | null
}

export type CatalogueTeeSet = {
  externalId: string
  name: string
  colour: string | null
  gender: string | null
  totalYardage: number | null
  totalMetres: number | null
  par: number | null
  courseRating: number
  slopeRating: number
}

export type CatalogueCourse = {
  externalId: string
  name: string
  holes: number | null
  par: number | null
  designedBy: string | null
  yearOpened: string | null
  tees: CatalogueTeeSet[]
}

export type CatalogueClubPage = {
  total: number
  page: number
  perPage: number
  totalPages: number
  clubs: CatalogueClub[]
}

export type CatalogueClient = {
  listClubs(page: number, perPage: number): Promise<CatalogueClubPage>
  listCourses(clubExternalId: string): Promise<CatalogueCourse[]>
}

export type CatalogueStore = {
  saveClub(
    club: CatalogueClub,
    courses: CatalogueCourse[],
  ): Promise<void>
}

export type CatalogueImportOptions = {
  startPage: number
  perPage: number
  maxClubs?: number
  dryRun: boolean
  onClubProcessed?: (
    club: CatalogueClub,
    progress: { clubs: number; courses: number; teeSets: number },
  ) => void
}

export type CatalogueImportResult = {
  availableClubs: number
  processedClubs: number
  processedCourses: number
  processedTeeSets: number
  pagesRead: number
  dryRun: boolean
}

export class CatalogueValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CatalogueValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function requiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized || null
}

function optionalString(value: unknown): string | null {
  return requiredString(value)
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function optionalInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function parseClub(value: unknown): CatalogueClub {
  if (!isRecord(value)) {
    throw new CatalogueValidationError('RapidAPI returned an invalid club')
  }

  const externalId = requiredString(value.id)
  const name = requiredString(value.name)

  if (!externalId || !name) {
    throw new CatalogueValidationError('RapidAPI returned an invalid club')
  }

  return {
    externalId,
    name,
    city: optionalString(value.city),
    county: optionalString(value.county),
    postcode: optionalString(value.postcode),
    countryCode: optionalString(value.country_code),
    latitude: optionalNumber(value.latitude),
    longitude: optionalNumber(value.longitude),
    googleRating: optionalNumber(value.google_rating),
    clubType: optionalString(value.club_type),
    courseType: optionalString(value.course_type),
  }
}

function parseTeeSet(value: unknown): CatalogueTeeSet {
  if (!isRecord(value)) {
    throw new CatalogueValidationError(
      'RapidAPI returned an invalid tee set',
    )
  }

  const externalId = requiredString(value.id)
  const name = requiredString(value.name)
  const courseRating = optionalNumber(value.course_rating)
  const slopeRating = optionalInteger(value.slope_rating)

  if (!externalId || !name || courseRating === null || slopeRating === null) {
    throw new CatalogueValidationError(
      'RapidAPI returned an invalid tee set',
    )
  }

  return {
    externalId,
    name,
    colour: optionalString(value.colour),
    gender: optionalString(value.gender),
    totalYardage: optionalInteger(value.total_yardage),
    totalMetres: optionalInteger(value.total_metres),
    par: optionalInteger(value.par),
    courseRating,
    slopeRating,
  }
}

function parseCourse(value: unknown): CatalogueCourse {
  if (!isRecord(value) || !Array.isArray(value.tee_sets)) {
    throw new CatalogueValidationError('RapidAPI returned an invalid course')
  }

  const externalId = requiredString(value.id)
  const name = requiredString(value.name)

  if (!externalId || !name) {
    throw new CatalogueValidationError('RapidAPI returned an invalid course')
  }

  const yearOpened =
    typeof value.year_opened === 'number' &&
    Number.isFinite(value.year_opened)
      ? String(value.year_opened)
      : optionalString(value.year_opened)

  return {
    externalId,
    name,
    holes: optionalInteger(value.holes),
    par: optionalInteger(value.par),
    designedBy: optionalString(value.designed_by),
    yearOpened,
    tees: value.tee_sets.map(parseTeeSet),
  }
}

export function parseCatalogueClubPage(value: unknown): CatalogueClubPage {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.total) ||
    !isNonNegativeInteger(value.page) ||
    value.page < 1 ||
    !isNonNegativeInteger(value.per_page) ||
    value.per_page < 1 ||
    !isNonNegativeInteger(value.total_pages) ||
    !Array.isArray(value.clubs)
  ) {
    throw new CatalogueValidationError(
      'RapidAPI returned an invalid paginated clubs response',
    )
  }

  return {
    total: value.total,
    page: value.page,
    perPage: value.per_page,
    totalPages: value.total_pages,
    clubs: value.clubs.map(parseClub),
  }
}

export function parseCatalogueCourses(value: unknown): CatalogueCourse[] {
  if (!Array.isArray(value)) {
    throw new CatalogueValidationError(
      'RapidAPI returned an invalid courses response',
    )
  }

  return value.map(parseCourse)
}

export async function runCourseCatalogueImport(
  client: CatalogueClient,
  store: CatalogueStore,
  options: CatalogueImportOptions,
): Promise<CatalogueImportResult> {
  if (
    !Number.isInteger(options.startPage) ||
    options.startPage < 1 ||
    !Number.isInteger(options.perPage) ||
    options.perPage < 1 ||
    (options.maxClubs !== undefined &&
      (!Number.isInteger(options.maxClubs) || options.maxClubs < 1))
  ) {
    throw new Error('Invalid catalogue import options')
  }

  let currentPage = options.startPage
  let availableClubs = 0
  let processedClubs = 0
  let processedCourses = 0
  let processedTeeSets = 0
  let pagesRead = 0
  let reachedLimit = false

  while (!reachedLimit) {
    const clubPage = await client.listClubs(currentPage, options.perPage)

    availableClubs = clubPage.total
    pagesRead += 1

    for (const club of clubPage.clubs) {
      if (
        options.maxClubs !== undefined &&
        processedClubs >= options.maxClubs
      ) {
        reachedLimit = true
        break
      }

      const courses = await client.listCourses(club.externalId)
      const teeSetCount = courses.reduce(
        (total, item) => total + item.tees.length,
        0,
      )

      if (!options.dryRun) {
        await store.saveClub(club, courses)
      }

      processedClubs += 1
      processedCourses += courses.length
      processedTeeSets += teeSetCount
      options.onClubProcessed?.(club, {
        clubs: processedClubs,
        courses: processedCourses,
        teeSets: processedTeeSets,
      })
    }

    if (reachedLimit || currentPage >= clubPage.totalPages) {
      break
    }

    currentPage += 1
  }

  return {
    availableClubs,
    processedClubs,
    processedCourses,
    processedTeeSets,
    pagesRead,
    dryRun: options.dryRun,
  }
}
