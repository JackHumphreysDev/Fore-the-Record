import {
  UserStatus,
  type UserStatus as UserStatusValue,
} from './generated/prisma/enums.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class AdminUserValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminUserValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AdminUserValidationError('Enter the player’s full name')
  }

  const name = value.trim().replace(/\s+/g, ' ')

  if (name.length < 2 || name.length > 120) {
    throw new AdminUserValidationError(
      'Player name must be between 2 and 120 characters',
    )
  }

  return name
}

function parseEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AdminUserValidationError('Enter a valid player email address')
  }

  const email = value.trim().toLowerCase()

  if (email.length > 320 || !EMAIL_PATTERN.test(email)) {
    throw new AdminUserValidationError('Enter a valid player email address')
  }

  return email
}

export function parseAdminUserDetails(body: unknown): {
  name: string
  email: string
} {
  if (!isRecord(body)) {
    throw new AdminUserValidationError('Player details are required')
  }

  return {
    name: parseName(body.name),
    email: parseEmail(body.email),
  }
}

export function parseAdminUserStatus(body: unknown): {
  status: UserStatusValue
} {
  const status = isRecord(body) ? body.status : undefined

  if (status !== UserStatus.ACTIVE && status !== UserStatus.SUSPENDED) {
    throw new AdminUserValidationError('Choose a valid account status')
  }

  return { status }
}

export function parseDeleteConfirmation(body: unknown): string {
  const confirmation = isRecord(body) ? body.confirmation : undefined

  if (typeof confirmation !== 'string' || confirmation.trim() === '') {
    throw new AdminUserValidationError(
      'Type the player email address to confirm permanent deletion',
    )
  }

  return confirmation.trim().toLowerCase()
}
