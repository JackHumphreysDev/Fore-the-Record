import { describe, expect, it } from 'vitest'
import { isTournamentSeriesResponse } from './tournamentSeriesApi.ts'
const player = { id: '1', name: 'Jack', homeClub: null }
const response = { series: [{ id: 's', organizerId: '1', name: 'Summer Tour', description: null, status: 'ACTIVE', isOrganizer: true, organizer: player, members: [{ userId: '1', status: 'ACCEPTED', respondedAt: null, user: player }], events: [], standings: [{ position: 1, user: player, eventsPlayed: 1, wins: 1, podiums: 1, points: 10 }], createdAt: 'now', updatedAt: 'now' }] }
describe('tournament series contract', () => { it('accepts a complete response', () => expect(isTournamentSeriesResponse(response)).toBe(true)); it('rejects invalid points', () => expect(isTournamentSeriesResponse({ series: [{ ...response.series[0], standings: [{ ...response.series[0]!.standings[0], points: '10' }] }] })).toBe(false)) })
