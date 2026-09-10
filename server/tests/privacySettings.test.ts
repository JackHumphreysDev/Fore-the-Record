import { describe, expect, it } from 'vitest'
import {
  parsePrivacySettings,
  parseSelfDeleteConfirmation,
} from '../src/privacySettings.js'

describe('privacy settings validation', () => {
  const settings = {
    profileDiscoverable: false,
    friendRequestsEnabled: true,
    showHandicapToFriends: false,
  }

  it('accepts a complete boolean settings object', () => {
    expect(parsePrivacySettings(settings)).toEqual(settings)
  })

  it('rejects missing or non-boolean choices', () => {
    expect(parsePrivacySettings({ ...settings, profileDiscoverable: 'no' })).toBeNull()
    expect(parsePrivacySettings({ profileDiscoverable: true })).toBeNull()
  })

  it('requires the player email for permanent deletion', () => {
    expect(parseSelfDeleteConfirmation(
      { confirmation: '  Player@Example.com ' },
      'player@example.com',
    )).toBe(true)
    expect(parseSelfDeleteConfirmation({ confirmation: 'DELETE' }, 'player@example.com')).toBe(false)
  })
})
