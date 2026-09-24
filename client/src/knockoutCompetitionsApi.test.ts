import { describe, expect, it } from 'vitest'
import { isKnockoutCompetitionsResponse, knockoutRoundLabel } from './knockoutCompetitionsApi.ts'

const player = { id: 'player', name: 'Player One', homeClub: null }
const competition = { id: 'cup', name: 'Summer Cup', status: 'ACTIVE', organizerId: 'player', championId: null, isOrganizer: true, createdAt: '2026-09-24T12:00:00.000Z', updatedAt: '2026-09-24T12:00:00.000Z', organizer: player, champion: null, participants: [{ userId: 'player', status: 'ACCEPTED', seed: 1, respondedAt: '2026-09-24T12:00:00.000Z', user: player }], matches: [{ id: 'match', roundNumber: 1, position: 1, status: 'WAITING', playerOneId: 'player', playerTwoId: null, winnerId: null, winningMargin: null, holesRemaining: null, resultLabel: null, completedAt: null, playerOne: player, playerTwo: null, winner: null }] }

describe('knockout competition API contracts', () => {
  it('accepts complete private bracket data', () => expect(isKnockoutCompetitionsResponse({ competitions: [competition] })).toBe(true))
  it('rejects an unsupported competition state', () => expect(isKnockoutCompetitionsResponse({ competitions: [{ ...competition, status: 'PUBLIC' }] })).toBe(false))
  it('names the closing rounds', () => expect([1, 2, 3].map((round) => knockoutRoundLabel(round, 3))).toEqual(['Quarter-finals', 'Semi-finals', 'Final']))
})
