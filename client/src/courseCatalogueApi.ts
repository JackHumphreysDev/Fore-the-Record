export type CatalogueClub = {
  id: string
  name: string
  city: string | null
  county: string | null
  postcode: string | null
  countryCode: string | null
  courseCount: number
}

export type CatalogueTee = {
  id: string
  teeName: string
  colour: string | null
  gender: string | null
  totalYardage: number | null
  totalMetres: number | null
  par: number | null
  courseRating: number
  slopeRating: number
}

export type CatalogueCourse = {
  id: string
  name: string
  holes: number | null
  par: number | null
  designedBy: string | null
  yearOpened: string | null
  club: {
    id: string
    name: string
    city: string | null
    county: string | null
  }
  tees: CatalogueTee[]
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type CatalogueClubsResponse = {
  clubs: CatalogueClub[]
  pagination: Pagination
}

export type CatalogueCoursesResponse = {
  courses: CatalogueCourse[]
  pagination: Pagination
}

export type ProviderCourseSource = 'api' | 'fallback_scrape' | 'manual'

export type ProviderClubCandidate = {
  id: string
  name: string
  city?: string
  county?: string
  postcode?: string
  countryCode?: string
}

export type ProviderClubSearchResponse = {
  clubs: ProviderClubCandidate[]
}

export type ProviderCourseTee = {
  courseExternalId?: string
  teeExternalId?: string
  courseName?: string
  teeName: string
  courseRating: number
  slopeRating: number
  par?: number
  isSaved: boolean
}

export type ProviderCourseSearchResult = {
  clubExternalId?: string
  clubName: string
  source: ProviderCourseSource
  tees: ProviderCourseTee[]
}

export type ProviderCourseImportBody = {
  clubExternalId?: string
  clubName: string
  source: ProviderCourseSource
  tees: Array<{
    courseExternalId?: string
    teeExternalId?: string
    courseName: string
    teeName: string
    courseRating: number
    slopeRating: number
    par?: number
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isPagination(value: unknown): value is Pagination {
  return (
    isRecord(value) &&
    Number.isInteger(value.page) &&
    Number(value.page) > 0 &&
    Number.isInteger(value.pageSize) &&
    Number(value.pageSize) > 0 &&
    Number.isInteger(value.total) &&
    Number(value.total) >= 0 &&
    Number.isInteger(value.totalPages) &&
    Number(value.totalPages) >= 0
  )
}

function isCatalogueClub(value: unknown): value is CatalogueClub {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isNullableString(value.city) &&
    isNullableString(value.county) &&
    isNullableString(value.postcode) &&
    isNullableString(value.countryCode) &&
    Number.isInteger(value.courseCount) &&
    Number(value.courseCount) >= 0
  )
}

function isCatalogueTee(value: unknown): value is CatalogueTee {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.teeName === 'string' &&
    isNullableString(value.colour) &&
    isNullableString(value.gender) &&
    isNullableNumber(value.totalYardage) &&
    isNullableNumber(value.totalMetres) &&
    isNullableNumber(value.par) &&
    typeof value.courseRating === 'number' &&
    typeof value.slopeRating === 'number'
  )
}

function isCatalogueCourse(value: unknown): value is CatalogueCourse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isNullableNumber(value.holes) &&
    isNullableNumber(value.par) &&
    isNullableString(value.designedBy) &&
    isNullableString(value.yearOpened) &&
    isRecord(value.club) &&
    typeof value.club.id === 'string' &&
    typeof value.club.name === 'string' &&
    isNullableString(value.club.city) &&
    isNullableString(value.club.county) &&
    Array.isArray(value.tees) &&
    value.tees.every(isCatalogueTee)
  )
}

function isProviderCourseSource(
  value: unknown,
): value is ProviderCourseSource {
  return value === 'api' || value === 'fallback_scrape' || value === 'manual'
}

function isProviderClubCandidate(
  value: unknown,
): value is ProviderClubCandidate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.city === undefined || typeof value.city === 'string') &&
    (value.county === undefined || typeof value.county === 'string') &&
    (value.postcode === undefined || typeof value.postcode === 'string') &&
    (value.countryCode === undefined || typeof value.countryCode === 'string')
  )
}

function isProviderCourseTee(value: unknown): value is ProviderCourseTee {
  return (
    isRecord(value) &&
    (value.courseExternalId === undefined ||
      typeof value.courseExternalId === 'string') &&
    (value.teeExternalId === undefined ||
      typeof value.teeExternalId === 'string') &&
    (value.courseName === undefined || typeof value.courseName === 'string') &&
    typeof value.teeName === 'string' &&
    typeof value.courseRating === 'number' &&
    Number.isFinite(value.courseRating) &&
    Number.isInteger(value.slopeRating) &&
    (value.par === undefined || Number.isInteger(value.par)) &&
    typeof value.isSaved === 'boolean'
  )
}

export function isCatalogueClubsResponse(
  value: unknown,
): value is CatalogueClubsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.clubs) &&
    value.clubs.every(isCatalogueClub) &&
    isPagination(value.pagination)
  )
}

export function isCatalogueCoursesResponse(
  value: unknown,
): value is CatalogueCoursesResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.courses) &&
    value.courses.every(isCatalogueCourse) &&
    isPagination(value.pagination)
  )
}

export function isProviderCourseSearchResult(
  value: unknown,
): value is ProviderCourseSearchResult {
  return (
    isRecord(value) &&
    (value.clubExternalId === undefined ||
      typeof value.clubExternalId === 'string') &&
    typeof value.clubName === 'string' &&
    value.clubName.trim() !== '' &&
    isProviderCourseSource(value.source) &&
    Array.isArray(value.tees) &&
    value.tees.length > 0 &&
    value.tees.every(isProviderCourseTee)
  )
}

export function isProviderClubSearchResponse(
  value: unknown,
): value is ProviderClubSearchResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.clubs) &&
    value.clubs.every(isProviderClubCandidate)
  )
}

export function buildCatalogueClubsPath(
  search: string,
  page: number,
  pageSize: number,
): string {
  const parameters = new URLSearchParams({
    search: search.trim(),
    page: String(page),
    pageSize: String(pageSize),
  })

  return `/api/catalogue/clubs?${parameters.toString()}`
}

export function buildCatalogueCoursesPath(filters: {
  club: string
  course: string
  page: number
  pageSize: number
}): string {
  const parameters = new URLSearchParams()
  const club = filters.club.trim()
  const course = filters.course.trim()

  if (club) {
    parameters.set('club', club)
  }

  if (course) {
    parameters.set('course', course)
  }

  parameters.set('page', String(filters.page))
  parameters.set('pageSize', String(filters.pageSize))

  return `/api/catalogue/courses?${parameters.toString()}`
}

export function buildProviderCourseSearchPath(club: string): string {
  const parameters = new URLSearchParams({ q: club.trim() })

  return `/api/courses/search?${parameters.toString()}`
}

export function buildProviderClubsSearchPath(search: string): string {
  const parameters = new URLSearchParams({ q: search.trim() })

  return `/api/courses/provider/clubs?${parameters.toString()}`
}

export function buildProviderClubCoursesPath(
  club: Pick<ProviderClubCandidate, 'id' | 'name'>,
): string {
  const parameters = new URLSearchParams({ name: club.name })

  return `/api/courses/provider/clubs/${encodeURIComponent(club.id)}/courses?${parameters.toString()}`
}

export function getProviderCourseSearchQuery(filters: {
  club: string
  course: string
}): string {
  return filters.club.trim() || filters.course.trim()
}

export function buildProviderCourseImportBody(
  result: ProviderCourseSearchResult,
): ProviderCourseImportBody {
  return {
    ...(result.clubExternalId
      ? { clubExternalId: result.clubExternalId }
      : {}),
    clubName: result.clubName,
    source: result.source,
    tees: result.tees
      .map((tee) => ({
        ...(tee.courseExternalId
          ? { courseExternalId: tee.courseExternalId }
          : {}),
        ...(tee.teeExternalId ? { teeExternalId: tee.teeExternalId } : {}),
        courseName: tee.courseName?.trim() || result.clubName,
        teeName: tee.teeName,
        courseRating: tee.courseRating,
        slopeRating: tee.slopeRating,
        ...(tee.par === undefined ? {} : { par: tee.par }),
      })),
  }
}
