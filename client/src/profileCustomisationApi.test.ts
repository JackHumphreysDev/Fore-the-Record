import { describe, expect, it } from 'vitest'
import { isProfileCustomisationResponse, validateBio, validateLocation } from './profileCustomisationApi.ts'

describe('profile customisation validation', () => {
  it('accepts optional details within their limits', () => {
    expect(validateBio('Weekend golfer')).toBe('')
    expect(validateLocation('Sheffield')).toBe('')
  })
  it('rejects oversized details', () => {
    expect(validateBio('x'.repeat(281))).not.toBe('')
    expect(validateLocation('x'.repeat(101))).not.toBe('')
  })
  it('accepts complete saved profile details and rejects partial responses', () => {
    const profile = { id: 'profile', name: 'Player', email: 'player@example.com', homeClubId: null, handicapIndex: null, createdAt: '2026-09-24T00:00:00.000Z', homeClub: null, bio: 'Weekend golfer', location: 'Sheffield', showProfileToFriends: true, profileImage: null }
    expect(isProfileCustomisationResponse(profile)).toBe(true)
    expect(isProfileCustomisationResponse({ ...profile, showProfileToFriends: undefined })).toBe(false)
  })
})
