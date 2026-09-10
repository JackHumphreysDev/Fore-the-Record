export type PrivacySettingsInput = {
  profileDiscoverable: boolean
  friendRequestsEnabled: boolean
  showHandicapToFriends: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parsePrivacySettings(value: unknown): PrivacySettingsInput | null {
  if (!isRecord(value)) return null

  const {
    profileDiscoverable,
    friendRequestsEnabled,
    showHandicapToFriends,
  } = value

  return typeof profileDiscoverable === 'boolean' &&
    typeof friendRequestsEnabled === 'boolean' &&
    typeof showHandicapToFriends === 'boolean'
    ? {
        profileDiscoverable,
        friendRequestsEnabled,
        showHandicapToFriends,
      }
    : null
}

export function parseSelfDeleteConfirmation(
  value: unknown,
  expectedEmail: string,
): boolean {
  return isRecord(value) &&
    typeof value.confirmation === 'string' &&
    value.confirmation.trim().toLowerCase() === expectedEmail.toLowerCase()
}
