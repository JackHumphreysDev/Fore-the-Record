import { describe, expect, it } from 'vitest'
import { isLiveRoundDraftState, isLiveRoundResponse } from './liveRoundApi.ts'

const teeId = '22222222-2222-4222-8222-222222222222'
const state = {
  version: 1,
  currentHoleIndex: 0,
  tee: { id: teeId, courseId: 'course', clubName: 'Club', courseName: 'Course', teeName: 'White', colour: null, gender: null, totalYardage: 6500, totalMetres: null, par: 72, courseRating: 72, slopeRating: 113, frontNineCourseRating: null, frontNineSlopeRating: null, backNineCourseRating: null, backNineSlopeRating: null, isFavourite: false },
  form: { teeId, datePlayed: '2026-09-23', timePlayed: '10:00', category: 'CASUAL', participation: 'INDIVIDUAL', scoringFormat: 'STROKE_PLAY', playingHandicap: '', holeCount: 9, nineHoleSegment: 'FRONT_NINE', competitionName: '', competitionFormat: '', competitionFormatOther: '', gameFormat: '', gameFormatOther: '', gameResult: '', matchPlayOpponentName: '', playingPartnerIds: [], playingPartnerResults: {}, guestPlayerNames: '', guestPlayerResults: {}, numberOfPlayers: '', grossScore: '', weatherCondition: 'DRY', notes: '' },
  scorecardStatus: 'available',
  scorecardSource: 'saved',
  holeEntries: Array.from({ length: 9 }, (_, index) => ({ holeNumber: index + 1, par: '4', strokeIndex: String(index + 1), yardage: '400', strokesTaken: '', pickedUp: false, putts: '', fairwayResult: '', greenInRegulation: '', penaltyStrokes: '', bunkerVisits: '', upAndDownResult: '' })),
  matchPlayDraft: {},
} as const

describe('live round API validation', () => {
  it('accepts a resumable draft response', () => {
    expect(isLiveRoundDraftState(state)).toBe(true)
    expect(isLiveRoundResponse({ draft: { id: 'draft', teeId, state, createdAt: '2026-09-23T10:00:00.000Z', updatedAt: '2026-09-23T10:00:00.000Z' } })).toBe(true)
  })
  it('accepts no active draft and rejects team drafts', () => {
    expect(isLiveRoundResponse({ draft: null })).toBe(true)
    expect(isLiveRoundDraftState({ ...state, form: { ...state.form, participation: 'TEAM' } })).toBe(false)
  })
})
