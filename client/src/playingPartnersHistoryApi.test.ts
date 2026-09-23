import { describe, expect, it } from 'vitest'
import { isPlayingPartnersHistoryResponse } from './playingPartnersHistoryApi.ts'

const validResponse = {
  summary: { partners: 1, friends: 1, guests: 0, partnerAppearances: 1 },
  partners: [{
    key: 'friend:player-2', kind: 'FRIEND', playerId: 'player-2', name: 'Tiger Woods',
    homeClub: { id: 'club-home', name: 'Home Club' }, roundsPlayed: 1,
    wins: 1, losses: 0, ties: 0, roundsWithoutResult: 0,
    firstPlayed: '2026-09-20', lastPlayed: '2026-09-20',
    courses: [{ courseId: 'course-1', clubName: 'Example Club', courseName: 'Main', rounds: 1, lastPlayed: '2026-09-20' }],
    formats: [{ name: 'Wolf', rounds: 1 }],
    rounds: [{
      roundId: 'round-1', ownedByPlayer: true, recordedBy: 'Jack', datePlayed: '2026-09-20',
      category: 'SOCIAL_GAME', participation: 'INDIVIDUAL', scoringFormat: 'STROKE_PLAY',
      holeCount: 18, nineHoleSegment: null, format: 'Wolf', result: 'WON', teeName: 'White',
      courseId: 'course-1', courseName: 'Main', clubId: 'club-1', clubName: 'Example Club',
    }],
  }],
}

describe('isPlayingPartnersHistoryResponse', () => {
  it('accepts a complete playing-partner history', () => {
    expect(isPlayingPartnersHistoryResponse(validResponse)).toBe(true)
  })

  it('rejects inconsistent result totals', () => {
    expect(isPlayingPartnersHistoryResponse({
      ...validResponse,
      partners: [{ ...validResponse.partners[0], wins: 0 }],
    })).toBe(false)
  })

  it('rejects unsupported round values', () => {
    expect(isPlayingPartnersHistoryResponse({
      ...validResponse,
      partners: [{
        ...validResponse.partners[0],
        rounds: [{ ...validResponse.partners[0].rounds[0], category: 'PRACTICE' }],
      }],
    })).toBe(false)
  })
})
