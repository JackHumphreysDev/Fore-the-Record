import { authenticatedFetch } from './api.ts'

export type AccountProfile = {
  id: string
  name: string
  email: string
  homeClubId: string | null
  handicapIndex: number | null
  createdAt: string
  homeClub: { id: string; name: string } | null
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function validateName(value: string): string {
  const name = normalizeName(value)
  if (name.length < 2) return 'Enter your full name'
  if (name.length > 100) return 'Your full name must be 100 characters or fewer'
  if (!/^[\p{L}\p{M} .'-]+$/u.test(name)) {
    return 'Use letters, spaces, apostrophes, hyphens, or full stops only'
  }
  return ''
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function validateEmail(value: string): string {
  const email = normalizeEmail(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
    ? ''
    : 'Enter a valid email address'
}

async function getError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body &&
    typeof body.error === 'string'
    ? body.error
    : fallback
}

export async function updateProfileName(name: string): Promise<AccountProfile> {
  const response = await authenticatedFetch('/api/users/me/settings/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: normalizeName(name) }),
  })

  if (!response.ok) {
    throw new Error(await getError(response, 'We could not update your name.'))
  }

  return (await response.json()) as AccountProfile
}

export async function checkEmailAvailability(email: string): Promise<void> {
  const response = await authenticatedFetch(
    '/api/users/me/settings/email-availability',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    },
  )

  if (!response.ok) {
    throw new Error(
      await getError(response, 'We could not check that email address.'),
    )
  }
}
