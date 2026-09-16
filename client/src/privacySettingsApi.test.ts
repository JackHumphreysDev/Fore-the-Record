import { describe, expect, it } from 'vitest'
import { isPrivacySettings } from './privacySettingsApi.ts'

describe('privacy settings response validation', () => {
  it('accepts four explicit privacy choices', () => {
    expect(isPrivacySettings({
      profileDiscoverable: true,
      friendRequestsEnabled: false,
      showHandicapToFriends: true,
      shareRoundActivity: false,
    })).toBe(true)
  })

  it('rejects missing and non-boolean choices', () => {
    expect(isPrivacySettings({ profileDiscoverable: true })).toBe(false)
    expect(isPrivacySettings({
      profileDiscoverable: true,
      friendRequestsEnabled: 'yes',
      showHandicapToFriends: true,
      shareRoundActivity: true,
    })).toBe(false)
  })
})
