import { authenticatedFetch } from './api.ts'
import type { AccountProfile } from './accountSettingsApi.ts'
import { isScorecardPhoto, isScorecardPhotoUploadTicket, type ScorecardPhoto, type ScorecardPhotoUploadTicket } from './scorecardPhotoApi.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isProfileCustomisationResponse(value: unknown): value is AccountProfile {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' &&
    typeof value.email === 'string' && (value.homeClubId === null || typeof value.homeClubId === 'string') &&
    (value.handicapIndex === null || typeof value.handicapIndex === 'number') && typeof value.createdAt === 'string' &&
    (value.homeClub === null || isRecord(value.homeClub) && typeof value.homeClub.id === 'string' && typeof value.homeClub.name === 'string') &&
    (value.bio === null || typeof value.bio === 'string') && (value.location === null || typeof value.location === 'string') &&
    typeof value.showProfileToFriends === 'boolean' && (value.profileImage === null || isScorecardPhoto(value.profileImage))
}

export function validateBio(value: string): string {
  return value.trim().length > 280 ? 'Your bio must be 280 characters or fewer' : ''
}

export function validateLocation(value: string): string {
  return value.trim().length > 100 ? 'Your location must be 100 characters or fewer' : ''
}

export async function saveProfileCustomisation(input: { bio: string; location: string; showProfileToFriends: boolean }): Promise<AccountProfile> {
  const response = await authenticatedFetch('/api/users/me/settings/customisation', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isProfileCustomisationResponse(body)) throw new Error('We could not save your profile details.')
  return body
}

export async function requestProfileImageUpload(metadata: { fileName: string; mimeType: string; size: number }): Promise<ScorecardPhotoUploadTicket> {
  const response = await authenticatedFetch('/api/users/me/settings/profile-image/upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isScorecardPhotoUploadTicket(body)) throw new Error('We could not start the profile picture upload.')
  return body
}

export async function confirmProfileImage(metadata: { fileName: string; mimeType: string; size: number; path: string }): Promise<ScorecardPhoto> {
  const response = await authenticatedFetch('/api/users/me/settings/profile-image', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata),
  })
  const body: unknown = await response.json().catch(() => null)
  const image = typeof body === 'object' && body !== null && 'profileImage' in body ? body.profileImage : null
  if (!response.ok || !isScorecardPhoto(image)) throw new Error('We could not save your profile picture.')
  return image
}

export async function removeProfileImage(): Promise<void> {
  const response = await authenticatedFetch('/api/users/me/settings/profile-image', { method: 'DELETE' })
  if (!response.ok) throw new Error('We could not remove your profile picture.')
}
