import { describe, expect, it } from 'vitest'
import { buildRoundNotesPath, isRoundNotesResponse } from './roundNotesApi.ts'

describe('round notes API', () => {
  it('encodes the owned round reference', () => {
    expect(buildRoundNotesPath('round/id')).toBe(
      '/api/users/me/rounds/round%2Fid/notes',
    )
  })

  it('accepts saved and cleared note responses', () => {
    expect(isRoundNotesResponse({ roundId: 'round-1', notes: 'Good round' })).toBe(true)
    expect(isRoundNotesResponse({ roundId: 'round-1', notes: null })).toBe(true)
  })

  it('rejects incomplete responses', () => {
    expect(isRoundNotesResponse({ roundId: 'round-1', notes: 42 })).toBe(false)
    expect(isRoundNotesResponse({ notes: 'Good round' })).toBe(false)
  })
})
