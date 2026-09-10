const PROFILE_NAME_PATTERN = /^[\p{L}\p{M} .'-]+$/u

export function normalizeProfileName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function parseProfileName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Enter your full name')
  }

  const name = normalizeProfileName(value)

  if (name.length < 2) {
    throw new Error('Enter your full name')
  }

  if (name.length > 100) {
    throw new Error('Your full name must be 100 characters or fewer')
  }

  if (!PROFILE_NAME_PATTERN.test(name)) {
    throw new Error(
      'Use letters, spaces, apostrophes, hyphens, or full stops only',
    )
  }

  return name
}

export function normalizeAccountEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
    ? email
    : null
}
