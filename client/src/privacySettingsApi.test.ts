import { describe, expect, it } from 'vitest'
import { isPrivacySettings } from './privacySettingsApi.ts'

describe('privacy settings response validation', () => {
  it('accepts three explicit privacy choices', () => {
    expect(isPrivacySettings({
      profileDiscoverable: true,
      friendRequestsEnabled: false,
      showHandicapToFriends: true,
    })).toBe(true)
  })

  it('rejects missing and non-boolean choices', () => {
    expect(isPrivacySettings({ profileDiscoverable: true })).toBe(false)
    expect(isPrivacySettings({
      profileDiscoverable: true,
      friendRequestsEnabled: 'yes',
      showHandicapToFriends: true,
    })).toBe(false)
  })
})
