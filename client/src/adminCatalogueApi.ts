export type CatalogueHole = {
  holeNumber: number
  par: number
  strokeIndex: number
  yardage: number | null
  source: string
}

export type CatalogueTee = {
  id: string
  externalId: string | null
  teeName: string
  colour: string | null
  gender: string | null
  totalYardage: number | null
  totalMetres: number | null
  par: number | null
  courseRating: number
  slopeRating: number
  source: string
  holes: CatalogueHole[]
  canDelete: boolean
  isUsed: boolean
}

export type CatalogueCourse = {
  id: string
  externalId: string | null
  name: string
  holes: number | null
  par: number | null
  designedBy: string | null
  yearOpened: string | null
  tees: CatalogueTee[]
  canDelete: boolean
}

export type CatalogueClub = {
  id: string
  externalId: string | null
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
  courses: CatalogueCourse[]
  canDelete: boolean
}

export type AdminCatalogueResponse = {
  clubs: CatalogueClub[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isHole(value: unknown): value is CatalogueHole {
  return (
    isRecord(value) &&
    Number.isInteger(value.holeNumber) &&
    Number.isInteger(value.par) &&
    Number.isInteger(value.strokeIndex) &&
    (value.yardage === null || Number.isInteger(value.yardage)) &&
    typeof value.source === 'string'
  )
}

function isTee(value: unknown): value is CatalogueTee {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNullableString(value.externalId) &&
    typeof value.teeName === 'string' &&
    isNullableString(value.colour) &&
    isNullableString(value.gender) &&
    isNullableNumber(value.totalYardage) &&
    isNullableNumber(value.totalMetres) &&
    isNullableNumber(value.par) &&
    typeof value.courseRating === 'number' &&
    Number.isInteger(value.slopeRating) &&
    typeof value.source === 'string' &&
    Array.isArray(value.holes) &&
    value.holes.every(isHole) &&
    typeof value.canDelete === 'boolean' &&
    typeof value.isUsed === 'boolean'
  )
}

function isCourse(value: unknown): value is CatalogueCourse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNullableString(value.externalId) &&
    typeof value.name === 'string' &&
    isNullableNumber(value.holes) &&
    isNullableNumber(value.par) &&
    isNullableString(value.designedBy) &&
    isNullableString(value.yearOpened) &&
    Array.isArray(value.tees) &&
    value.tees.every(isTee) &&
    typeof value.canDelete === 'boolean'
  )
}

function isClub(value: unknown): value is CatalogueClub {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNullableString(value.externalId) &&
    typeof value.name === 'string' &&
    isNullableString(value.city) &&
    isNullableString(value.county) &&
    isNullableString(value.postcode) &&
    isNullableString(value.countryCode) &&
    isNullableNumber(value.latitude) &&
    isNullableNumber(value.longitude) &&
    isNullableNumber(value.googleRating) &&
    isNullableString(value.clubType) &&
    isNullableString(value.courseType) &&
    Array.isArray(value.courses) &&
    value.courses.every(isCourse) &&
    typeof value.canDelete === 'boolean'
  )
}

export function isAdminCatalogueResponse(
  value: unknown,
): value is AdminCatalogueResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.clubs) &&
    value.clubs.every(isClub) &&
    isRecord(value.pagination) &&
    Number.isInteger(value.pagination.page) &&
    Number.isInteger(value.pagination.pageSize) &&
    Number.isInteger(value.pagination.total) &&
    Number.isInteger(value.pagination.totalPages)
  )
}

export function adminCataloguePath(search: string, page = 1): string {
  const parameters = new URLSearchParams({
    page: String(page),
    pageSize: '10',
  })
  if (search.trim()) parameters.set('search', search.trim())
  return `/api/admin/catalogue?${parameters.toString()}`
}
