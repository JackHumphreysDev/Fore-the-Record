import { describe, expect, it } from 'vitest'
import {
  isHistoryRound,
  isRoundResult,
} from './roundRecordValidation.ts'

const teamRound = {
  id: 'round-1',
  datePlayed: '2026-09-02T00:00:00.000Z',
  timePlayed: '13:30',
  category: 'COMPETITION',
  participation: 'TEAM',
  competitionName: 'Invitation Day',
  competitionFormat: 'Texas Scramble',
  numberOfPlayers: 64,
  grossScore: null,
  adjustedGrossScore: null,
  isCapped: false,
  weatherCondition: null,
  pccAdjustment: 0,
  scoreDifferential: null,
  isAcceptable: false,
  usedInHandicapCalc: false,
  scorecardStatus: 'NOT_REQUIRED',
}

const tee = {
  id: 'tee-1',
  teeName: 'White',
  courseRating: 72,
  slopeRating: 113,
  par: 72,
  course: {
    id: 'course-1',
    name: 'Main Course',
    club: { id: 'club-1', name: 'Example Golf Club' },
  },
}

describe('round classification response validation', () => {
  it('accepts a scoreless team confirmation', () => {
    expect(
      isRoundResult({ round: teamRound, handicapIndex: 11.7 }),
    ).toBe(true)
  })

  it('rejects a team confirmation carrying a score differential', () => {
    expect(
      isRoundResult({
        round: { ...teamRound, scoreDifferential: 4.2 },
        handicapIndex: 11.7,
      }),
    ).toBe(false)
  })

  it('rejects a competition response without its required details', () => {
    expect(
      isRoundResult({
        round: { ...teamRound, competitionName: null },
        handicapIndex: 11.7,
      }),
    ).toBe(false)
  })

  it('accepts a record-only team entry in round history', () => {
    expect(isHistoryRound({ ...teamRound, tee })).toBe(true)
  })

  it('rejects a team history entry marked as a counting round', () => {
    expect(
      isHistoryRound({
        ...teamRound,
        usedInHandicapCalc: true,
        tee,
      }),
    ).toBe(false)
  })

  it('accepts a scored individual competition', () => {
    expect(
      isHistoryRound({
        ...teamRound,
        participation: 'INDIVIDUAL',
        grossScore: 82,
        adjustedGrossScore: 80,
        weatherCondition: 'DRY',
        scoreDifferential: 7.1,
        isAcceptable: true,
        scorecardStatus: 'VERIFIED',
        tee,
      }),
    ).toBe(true)
  })
})
