import { describe, expect, it } from 'vitest'
import { golfClubDisplayName, isGolfBagResponse, type GolfClub } from './golfBagApi.ts'

const club: GolfClub = { id: 'club', type: 'DRIVER', brand: 'Ping', model: 'G440', nickname: null, loft: 10.5, shaftFlex: 'Stiff', carryDistanceYards: 245, sortOrder: 0, archivedAt: null, createdAt: '2026-09-24T12:00:00.000Z', updatedAt: '2026-09-24T12:00:00.000Z' }
describe('golf bag API contracts', () => {
  it('accepts a complete private bag', () => expect(isGolfBagResponse({ clubs: [club], activeCount: 1, maximumActive: 14 })).toBe(true))
  it('rejects unsupported club types', () => expect(isGolfBagResponse({ clubs: [{ ...club, type: 'BALL' }], activeCount: 1, maximumActive: 14 })).toBe(false))
  it('prefers nickname, then equipment name, then club type', () => { expect(golfClubDisplayName({ ...club, nickname: 'Big dog' })).toBe('Big dog'); expect(golfClubDisplayName(club)).toBe('Ping G440'); expect(golfClubDisplayName({ ...club, brand: null, model: null })).toBe('Driver') })
})
