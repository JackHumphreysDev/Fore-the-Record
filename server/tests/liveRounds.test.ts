import { describe, expect, it } from 'vitest'
import { isLiveRoundDraftState } from '../../client/src/liveRoundApi.ts'
import { parseLiveRoundDraftState } from '../src/liveRounds.js'

const teeId = '22222222-2222-4222-8222-222222222222'
const state = {
  version: 1,
  currentHoleIndex: 0,
  tee: {
    id: teeId, courseId: 'course', clubName: 'Club', courseName: 'Course', teeName: 'White',
    colour: null, gender: null, totalYardage: 6500, totalMetres: null, par: 72,
    courseRating: 72, slopeRating: 113, frontNineCourseRating: null,
    frontNineSlopeRating: null, backNineCourseRating: null, backNineSlopeRating: null,
    isFavourite: false,
  },
  form: {
    teeId, datePlayed: '2026-10-02', timePlayed: '10:00', category: 'CASUAL',
    participation: 'INDIVIDUAL', scoringFormat: 'STROKE_PLAY', playingHandicap: '',
    holeCount: 9, nineHoleSegment: 'FRONT_NINE', competitionName: '',
    competitionFormat: '', competitionFormatOther: '', gameFormat: '',
    gameFormatOther: '', gameResult: '', matchPlayOpponentName: '',
    playingPartnerIds: [], playingPartnerResults: {}, guestPlayerNames: '',
    guestPlayerResults: {}, numberOfPlayers: '', grossScore: '',
    weatherCondition: 'DRY', notes: '',
  },
  scorecardStatus: 'available',
  scorecardSource: 'saved',
  holeEntries: Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: '4',
    strokeIndex: String(index + 1),
    yardage: '400',
    strokesTaken: '',
    pickedUp: false,
    putts: '',
    fairwayResult: '',
    greenInRegulation: '',
    penaltyStrokes: '',
    bunkerVisits: '',
    upAndDownResult: '',
  })),
  matchPlayDraft: {},
}

describe('live round drafts', () => {
  it('accepts a bounded individual round draft', () => {
    expect(parseLiveRoundDraftState(state)).toEqual(state)
  })

  it('adds blank optional statistics to an existing draft', () => {
    const legacyHoles = state.holeEntries.map((hole) => {
      const {
        putts: _putts,
        fairwayResult: _fairwayResult,
        greenInRegulation: _greenInRegulation,
        penaltyStrokes: _penaltyStrokes,
        bunkerVisits: _bunkerVisits,
        upAndDownResult: _upAndDownResult,
        ...existing
      } = hole
      return existing
    })

    expect(parseLiveRoundDraftState({ ...state, holeEntries: legacyHoles })?.holeEntries[0]).toMatchObject({
      putts: '',
      fairwayResult: '',
      greenInRegulation: '',
      penaltyStrokes: '',
      bunkerVisits: '',
      upAndDownResult: '',
    })
  })

  it('restores nullable tee fields omitted by an iPhone draft', () => {
    const mobileTee = {
      id: state.tee.id,
      courseId: state.tee.courseId,
      clubName: state.tee.clubName,
      courseName: state.tee.courseName,
      teeName: state.tee.teeName,
      totalYardage: state.tee.totalYardage,
      par: state.tee.par,
      courseRating: state.tee.courseRating,
      slopeRating: state.tee.slopeRating,
      isFavourite: state.tee.isFavourite,
    }
    const mobileState = { ...state, tee: mobileTee, scorecardSource: undefined }

    const normalized = parseLiveRoundDraftState(mobileState)
    expect(normalized).toEqual({
      ...state,
      scorecardSource: null,
    })
    expect(isLiveRoundDraftState(normalized)).toBe(true)
  })

  it('rejects team, duplicate-hole, and out-of-range draft state', () => {
    expect(parseLiveRoundDraftState({ ...state, form: { ...state.form, participation: 'TEAM' } })).toBeNull()
    expect(parseLiveRoundDraftState({ ...state, holeEntries: state.holeEntries.map((hole) => ({ ...hole, holeNumber: 1 })) })).toBeNull()
    expect(parseLiveRoundDraftState({ ...state, currentHoleIndex: 9 })).toBeNull()
  })
})
