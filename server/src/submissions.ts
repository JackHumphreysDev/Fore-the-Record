export const SUBMISSION_TYPES = [
  'IDEA',
  'ISSUE',
  'DATA_CORRECTION',
  'MISSING_COURSE',
] as const

export type SubmissionType = (typeof SUBMISSION_TYPES)[number]

export type SubmissionInput = {
  type: SubmissionType
  subject: string
  message: string
  clubName: string | null
  townCounty: string | null
  websiteUrl: string | null
  courseName: string | null
  teeDetails: string | null
}

export class SubmissionValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubmissionValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSubmissionType(value: unknown): value is SubmissionType {
  return (
    typeof value === 'string' &&
    SUBMISSION_TYPES.includes(value as SubmissionType)
  )
}

function parseRequiredText(
  value: unknown,
  fieldName: string,
  minimum: number,
  maximum: number,
): string {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  if (
    normalizedValue.length < minimum ||
    normalizedValue.length > maximum
  ) {
    throw new SubmissionValidationError(
      `${fieldName} must be between ${minimum} and ${maximum} characters`,
    )
  }

  return normalizedValue
}

function parseOptionalText(
  value: unknown,
  fieldName: string,
  maximum: number,
): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    throw new SubmissionValidationError(
      `${fieldName} must be ${maximum} characters or fewer`,
    )
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.length > maximum) {
    throw new SubmissionValidationError(
      `${fieldName} must be ${maximum} characters or fewer`,
    )
  }

  return normalizedValue
}

function parseWebsiteUrl(value: unknown): string | null {
  const websiteUrl = parseOptionalText(value, 'Website', 500)

  if (!websiteUrl) {
    return null
  }

  try {
    const parsedUrl = new URL(websiteUrl)

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Unsupported protocol')
    }
  } catch {
    throw new SubmissionValidationError(
      'Website must be a valid http or https URL',
    )
  }

  return websiteUrl
}

export function parseSubmissionInput(body: unknown): SubmissionInput {
  if (!isRecord(body) || !isSubmissionType(body.type)) {
    throw new SubmissionValidationError('Choose a valid submission type')
  }

  const subject = parseRequiredText(body.subject, 'Subject', 5, 120)
  const message = parseRequiredText(body.message, 'Details', 10, 2000)

  if (body.type !== 'MISSING_COURSE') {
    return {
      type: body.type,
      subject,
      message,
      clubName: null,
      townCounty: null,
      websiteUrl: null,
      courseName: null,
      teeDetails: null,
    }
  }

  return {
    type: body.type,
    subject,
    message,
    clubName: parseRequiredText(body.clubName, 'Club name', 2, 160),
    townCounty: parseRequiredText(
      body.townCounty,
      'Town or county',
      2,
      160,
    ),
    websiteUrl: parseWebsiteUrl(body.websiteUrl),
    courseName: parseOptionalText(body.courseName, 'Course name', 160),
    teeDetails: parseOptionalText(body.teeDetails, 'Tee details', 1000),
  }
}
