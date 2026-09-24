import { describe, expect, it } from 'vitest'
import { parseProfileCustomisation, ProfileCustomisationError } from '../src/profileCustomisation.js'

describe('profile customisation', () => {
  it('normalizes optional details and visibility', () => {
    expect(parseProfileCustomisation({ bio: '  Weekend   golfer ', location: ' Sheffield ', showProfileToFriends: true })).toEqual({
      bio: 'Weekend golfer', location: 'Sheffield', showProfileToFriends: true,
    })
  })

  it('clears blank optional details', () => {
    expect(parseProfileCustomisation({ bio: ' ', location: '', showProfileToFriends: false })).toEqual({
      bio: null, location: null, showProfileToFriends: false,
    })
  })

  it('rejects oversized details', () => {
    expect(() => parseProfileCustomisation({ bio: 'x'.repeat(281), location: '', showProfileToFriends: true })).toThrow(ProfileCustomisationError)
  })
})
