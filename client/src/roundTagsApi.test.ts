import { describe, expect, it } from 'vitest'
import { buildRoundTagPath, isRoundTagsResponse } from './roundTagsApi.ts'

describe('round tag API contracts', () => {
  const tag = {
    roundId: 'round-id',
    createdAt: '2026-09-17T10:00:00.000Z',
    datePlayed: '2026-09-17T00:00:00.000Z',
    category: 'SOCIAL_GAME',
    competitionFormat: null,
    gameFormat: 'Wolf',
    gameResult: 'WON',
    result: 'LOST',
    player: { id: 'player-id', name: 'Tiger Woods' },
    tee: { teeName: 'White', course: { name: 'Main', club: { name: 'Example Golf Club' } } },
  }

  it('accepts safe round tag metadata', () => {
    expect(isRoundTagsResponse({ tags: [tag] })).toBe(true)
  })

  it('rejects unsupported result values', () => {
    expect(isRoundTagsResponse({ tags: [{ ...tag, gameResult: 'SECOND' }] })).toBe(false)
  })

  it('builds an encoded removal path', () => {
    expect(buildRoundTagPath('round/id')).toBe('/api/users/me/round-tags/round%2Fid')
  })
})
