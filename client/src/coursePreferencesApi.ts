import type { CatalogueCourse } from './courseCatalogueApi.ts'

export type CoursePreference = {
  id: string
  defaultTeeId: string | null
  createdAt: string
  updatedAt: string
  course: CatalogueCourse
}

export type CoursePreferencesResponse = {
  favourites: CoursePreference[]
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

function isTee(value: unknown): boolean {
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
    Number.isInteger(value.slopeRating)
  )
}

function isCourse(value: unknown): value is CatalogueCourse {
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
    value.tees.every(isTee)
  )
}

export function isCoursePreference(value: unknown): value is CoursePreference {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNullableString(value.defaultTeeId) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isCourse(value.course)
  )
}

export function isCoursePreferencesResponse(
  value: unknown,
): value is CoursePreferencesResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.favourites) &&
    value.favourites.every(isCoursePreference)
  )
}

export function buildCoursePreferencePath(courseId?: string): string {
  const base = '/api/users/me/course-preferences'
  return courseId ? `${base}/${encodeURIComponent(courseId)}` : base
}
