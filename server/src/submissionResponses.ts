import {
  SubmissionStatus,
  type SubmissionStatus as SubmissionStatusValue,
} from './generated/prisma/enums.js'

export class SubmissionResponseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubmissionResponseValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseSubmissionMessageInput(body: unknown): { body: string } {
  const message =
    isRecord(body) && typeof body.message === 'string'
      ? body.message.trim()
      : ''

  if (message.length < 2 || message.length > 2000) {
    throw new SubmissionResponseValidationError(
      'Reply must be between 2 and 2000 characters',
    )
  }

  return { body: message }
}

export function parseSubmissionStatusInput(body: unknown): {
  status: SubmissionStatusValue
} {
  const status = isRecord(body) ? body.status : undefined

  if (
    typeof status !== 'string' ||
    !Object.values(SubmissionStatus).includes(
      status as SubmissionStatusValue,
    )
  ) {
    throw new SubmissionResponseValidationError('Choose a valid status')
  }

  return { status: status as SubmissionStatusValue }
}
