import { describe, expect, it } from 'vitest'
import {
  buildFriendshipPairKey,
  normalizeFriendSearch,
} from '../src/friendships.js'

describe('friendship helpers', () => {
  it('creates the same unique pair key in either direction', () => {
    expect(buildFriendshipPairKey('b', 'a')).toBe('a:b')
    expect(buildFriendshipPairKey('a', 'b')).toBe('a:b')
  })

  it('normalizes useful name searches and rejects unsafe lengths', () => {
    expect(normalizeFriendSearch('  Tiger   Woods ')).toBe('Tiger Woods')
    expect(normalizeFriendSearch('T')).toBeNull()
    expect(normalizeFriendSearch('x'.repeat(101))).toBeNull()
    expect(normalizeFriendSearch(null)).toBeNull()
  })
})
