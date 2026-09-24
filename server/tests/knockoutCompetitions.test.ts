import { describe, expect, it } from 'vitest'
import { buildKnockoutBracket, parseKnockoutInvitees, parseKnockoutName, parseKnockoutResult } from '../src/knockoutCompetitions.js'

const players = Array.from({ length: 5 }, (_, index) => `${index + 1}0000000-0000-4000-8000-000000000000`)

describe('knockout competitions', () => {
  it('builds every round and advances first-round byes', () => {
    const bracket = buildKnockoutBracket(players)
    expect(bracket).toHaveLength(7)
    expect(bracket.filter((match) => match.roundNumber === 1)).toHaveLength(4)
    expect(bracket.filter((match) => match.resultLabel === 'Bye')).toHaveLength(3)
    expect(bracket.filter((match) => match.roundNumber === 2 && match.status === 'READY')).toHaveLength(1)
    expect(bracket.at(-1)).toMatchObject({ roundNumber: 3, position: 1, status: 'WAITING' })
  })

  it('normalizes names and validates unique invitees', () => {
    expect(parseKnockoutName('  Summer   Cup ')).toBe('Summer Cup')
    expect(parseKnockoutInvitees(players.slice(0, 2))).toEqual(players.slice(0, 2))
    expect(() => parseKnockoutInvitees([players[0], players[0]])).toThrow('without duplicates')
  })

  it('formats decisive Match Play results', () => {
    expect(parseKnockoutResult({ winnerId: players[0], winningMargin: 3, holesRemaining: 2 })).toEqual({ winnerId: players[0], winningMargin: 3, holesRemaining: 2, resultLabel: '3 & 2' })
    expect(parseKnockoutResult({ winnerId: players[0], winningMargin: 1, holesRemaining: 0 }).resultLabel).toBe('1 up')
    expect(parseKnockoutResult({ winnerId: players[0], winningMargin: 2, holesRemaining: 0 }).resultLabel).toBe('2 up')
    expect(() => parseKnockoutResult({ winnerId: players[0], winningMargin: 2, holesRemaining: 2 })).toThrow('valid Match Play result')
  })
})
