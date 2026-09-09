import {
  parseScorecardReviewDecision,
  ScorecardReviewValidationError,
} from './scorecardReviews.js'

const COUNTRY_CODES = ['ENG', 'SCO', 'WAL', 'NIR'] as const

export class AdminCatalogueValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminCatalogueValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredText(
  value: unknown,
  label: string,
  maximum: number,
): string {
  if (typeof value !== 'string') {
    throw new AdminCatalogueValidationError(`Enter ${label}`)
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length < 2 || normalized.length > maximum) {
    throw new AdminCatalogueValidationError(
      `${label} must be between 2 and ${maximum} characters`,
    )
  }

  return normalized
}

function optionalText(
  value: unknown,
  label: string,
  maximum: number,
): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    throw new AdminCatalogueValidationError(`Enter a valid ${label}`)
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length > maximum) {
    throw new AdminCatalogueValidationError(
      `${label} must be ${maximum} characters or fewer`,
    )
  }

  return normalized || null
}

function optionalNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new AdminCatalogueValidationError(
      `${label} must be between ${minimum} and ${maximum}`,
    )
  }

  return value
}

function optionalInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = optionalNumber(value, label, minimum, maximum)

  if (parsed !== null && !Number.isInteger(parsed)) {
    throw new AdminCatalogueValidationError(`${label} must be a whole number`)
  }

  return parsed
}

export function parseAdminClubInput(body: unknown) {
  if (!isRecord(body)) {
    throw new AdminCatalogueValidationError('Club details are required')
  }

  const countryCode = optionalText(body.countryCode, 'country code', 3)
  if (
    countryCode !== null &&
    !COUNTRY_CODES.includes(countryCode.toUpperCase() as (typeof COUNTRY_CODES)[number])
  ) {
    throw new AdminCatalogueValidationError(
      'Country code must be ENG, SCO, WAL, or NIR',
    )
  }

  return {
    name: requiredText(body.name, 'club name', 160),
    city: optionalText(body.city, 'city', 160),
    county: optionalText(body.county, 'county', 160),
    postcode: optionalText(body.postcode, 'postcode', 16),
    countryCode: countryCode?.toUpperCase() ?? null,
    latitude: optionalNumber(body.latitude, 'latitude', -90, 90),
    longitude: optionalNumber(body.longitude, 'longitude', -180, 180),
    googleRating: optionalNumber(body.googleRating, 'Google rating', 0, 5),
    clubType: optionalText(body.clubType, 'club type', 80),
    courseType: optionalText(body.courseType, 'course type', 80),
  }
}

export function parseAdminCourseInput(body: unknown) {
  if (!isRecord(body)) {
    throw new AdminCatalogueValidationError('Course details are required')
  }

  return {
    name: requiredText(body.name, 'course name', 160),
    holes: optionalInteger(body.holes, 'number of holes', 1, 36),
    par: optionalInteger(body.par, 'course par', 18, 180),
    designedBy: optionalText(body.designedBy, 'designer', 200),
    yearOpened: optionalText(body.yearOpened, 'year opened', 20),
  }
}

export function parseAdminTeeInput(body: unknown) {
  if (!isRecord(body)) {
    throw new AdminCatalogueValidationError('Tee details are required')
  }

  const courseRating = optionalNumber(
    body.courseRating,
    'course rating',
    20,
    100,
  )
  const slopeRating = optionalInteger(body.slopeRating, 'slope rating', 55, 155)

  if (courseRating === null || slopeRating === null) {
    throw new AdminCatalogueValidationError(
      'Course rating and slope rating are required',
    )
  }

  return {
    teeName: requiredText(body.teeName, 'tee name', 160),
    colour: optionalText(body.colour, 'tee colour', 80),
    gender: optionalText(body.gender, 'tee gender', 40),
    totalYardage: optionalInteger(body.totalYardage, 'total yardage', 1, 20000),
    totalMetres: optionalInteger(body.totalMetres, 'total metres', 1, 20000),
    par: optionalInteger(body.par, 'tee par', 18, 180),
    courseRating,
    slopeRating,
  }
}

export function parseAdminScorecardInput(body: unknown) {
  try {
    const decision = parseScorecardReviewDecision({
      action: 'APPROVE',
      holes: isRecord(body) ? body.holes : undefined,
    })

    if (decision.action !== 'APPROVE') {
      throw new AdminCatalogueValidationError(
        'A complete 18-hole scorecard is required',
      )
    }

    return decision.holes
  } catch (error: unknown) {
    if (error instanceof ScorecardReviewValidationError) {
      throw new AdminCatalogueValidationError(error.message)
    }
    throw error
  }
}

export function parseCatalogueDeleteConfirmation(body: unknown): void {
  const confirmation = isRecord(body) ? body.confirmation : undefined
  if (confirmation !== 'DELETE') {
    throw new AdminCatalogueValidationError(
      'Type DELETE to confirm permanent removal',
    )
  }
}
