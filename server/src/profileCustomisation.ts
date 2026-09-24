export class ProfileCustomisationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProfileCustomisationError'
  }
}

function optionalText(value: unknown, maximum: number, label: string): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new ProfileCustomisationError(`Enter a valid ${label}`)
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  if (normalized.length > maximum) throw new ProfileCustomisationError(`${label.charAt(0).toUpperCase()}${label.slice(1)} must be ${maximum} characters or fewer`)
  return normalized
}

export function parseProfileCustomisation(value: unknown) {
  if (typeof value !== 'object' || value === null) throw new ProfileCustomisationError('Enter valid profile details')
  const record = value as Record<string, unknown>
  if (typeof record.showProfileToFriends !== 'boolean') throw new ProfileCustomisationError('Choose who can see your profile details')
  return {
    bio: optionalText(record.bio, 280, 'bio'),
    location: optionalText(record.location, 100, 'location'),
    showProfileToFriends: record.showProfileToFriends,
  }
}
