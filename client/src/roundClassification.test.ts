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
  scoringFormat: 'STROKE_PLAY',
  holeCount: 18,
  nineHoleSegment: null,
  playingHandicap: null,
  stablefordPoints: null,
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
  scorecardPhoto: null,
  holeScores: [],
}

const tee = {
  id: 'tee-1',
  teeName: 'White',
  courseRating: 72,
  slopeRating: 113,
  frontNineCourseRating: null,
  frontNineSlopeRating: null,
  backNineCourseRating: null,
  backNineSlopeRating: null,
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

  it('accepts a Stableford round containing a picked-up hole', () => {
    expect(
      isHistoryRound({
        ...teamRound,
        category: 'CASUAL',
        participation: 'INDIVIDUAL',
        scoringFormat: 'STABLEFORD',
        playingHandicap: 18,
        stablefordPoints: 34,
        competitionName: null,
        competitionFormat: null,
        numberOfPlayers: null,
        grossScore: null,
        adjustedGrossScore: 92,
        weatherCondition: 'DRY',
        scoreDifferential: 20,
        isAcceptable: true,
        scorecardStatus: 'VERIFIED',
        holeScores: Array.from({ length: 18 }, (_, index) => ({
          holeNumber: index + 1,
          par: 4,
          strokeIndex: index + 1,
          strokesTaken: index === 0 ? 0 : 5,
          pickedUp: index === 0,
        })),
        tee,
      }),
    ).toBe(true)
  })

  it('accepts a non-counting verified front-nine round', () => {
    expect(
      isHistoryRound({
        ...teamRound,
        participation: 'INDIVIDUAL',
        holeCount: 9,
        nineHoleSegment: 'FRONT_NINE',
        grossScore: 44,
        adjustedGrossScore: 43,
        weatherCondition: 'DRY',
        scoreDifferential: null,
        isAcceptable: false,
        scorecardStatus: 'VERIFIED',
        holeScores: Array.from({ length: 9 }, (_, index) => ({
          holeNumber: index + 1,
          par: 4,
          strokeIndex: index + 1,
          strokesTaken: index === 0 ? 4 : 5,
          pickedUp: false,
        })),
        tee,
      }),
    ).toBe(true)
  })
})
