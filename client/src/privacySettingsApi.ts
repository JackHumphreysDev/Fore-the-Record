import { authenticatedFetch } from './api.ts'

export type PrivacySettings = {
  profileDiscoverable: boolean
  friendRequestsEnabled: boolean
  showHandicapToFriends: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isPrivacySettings(value: unknown): value is PrivacySettings {
  return (
    isRecord(value) &&
    typeof value.profileDiscoverable === 'boolean' &&
    typeof value.friendRequestsEnabled === 'boolean' &&
    typeof value.showHandicapToFriends === 'boolean'
  )
}

async function getError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return isRecord(body) && typeof body.error === 'string' ? body.error : fallback
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const response = await authenticatedFetch('/api/users/me/settings/privacy')
  if (!response.ok) {
    throw new Error(
      await getError(response, 'We could not load your privacy settings.'),
    )
  }
  const body: unknown = await response.json()
  if (!isPrivacySettings(body)) {
    throw new Error('Your privacy settings were incomplete.')
  }
  return body
}

export async function savePrivacySettings(
  settings: PrivacySettings,
): Promise<PrivacySettings> {
  const response = await authenticatedFetch('/api/users/me/settings/privacy', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.ok) {
    throw new Error(
      await getError(response, 'We could not save your privacy settings.'),
    )
  }
  const body: unknown = await response.json()
  if (!isPrivacySettings(body)) {
    throw new Error('Your saved privacy settings were incomplete.')
  }
  return body
}

export async function getPersonalDataExport(): Promise<unknown> {
  const response = await authenticatedFetch('/api/users/me/settings/export')
  if (!response.ok) {
    throw new Error(
      await getError(response, 'We could not prepare your data export.'),
    )
  }
  return response.json()
}

export async function deleteOwnAccount(confirmation: string): Promise<void> {
  const response = await authenticatedFetch('/api/users/me/settings/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation }),
  })
  if (!response.ok) {
    throw new Error(await getError(response, 'We could not delete your account.'))
  }
}
