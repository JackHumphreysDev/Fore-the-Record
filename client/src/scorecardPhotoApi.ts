export const SCORECARD_PHOTO_BUCKET = 'scorecard-photos'
export const SCORECARD_PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const SCORECARD_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type ScorecardPhoto = {
  name: string
  mimeType: string
  size: number
  uploadedAt: string
}

export type ScorecardPhotoUploadTicket = {
  path: string
  token: string
  expiresInSeconds: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isScorecardPhoto(value: unknown): value is ScorecardPhoto {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    SCORECARD_PHOTO_TYPES.includes(value.mimeType as typeof SCORECARD_PHOTO_TYPES[number]) &&
    Number.isInteger(value.size) &&
    Number(value.size) > 0 &&
    Number(value.size) <= SCORECARD_PHOTO_MAX_BYTES &&
    typeof value.uploadedAt === 'string' &&
    !Number.isNaN(Date.parse(value.uploadedAt))
  )
}

export function isScorecardPhotoUploadTicket(
  value: unknown,
): value is ScorecardPhotoUploadTicket {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.token === 'string' &&
    Number.isInteger(value.expiresInSeconds) &&
    Number(value.expiresInSeconds) > 0
  )
}

export function readConfirmedScorecardPhoto(value: unknown): ScorecardPhoto | null {
  return isRecord(value) && isScorecardPhoto(value.scorecardPhoto)
    ? value.scorecardPhoto
    : null
}

export function readScorecardPhotoUrl(value: unknown): string | null {
  if (!isRecord(value) || typeof value.url !== 'string') return null
  try {
    const url = new URL(value.url)
    return url.protocol === 'https:' ? value.url : null
  } catch {
    return null
  }
}

export function buildScorecardPhotoPath(roundId: string, admin = false): string {
  const encoded = encodeURIComponent(roundId)
  return admin
    ? `/api/admin/rounds/${encoded}/photo`
    : `/api/users/me/rounds/${encoded}/photo`
}

export function buildScorecardPhotoUploadPath(roundId: string): string {
  return `${buildScorecardPhotoPath(roundId)}/upload`
}
