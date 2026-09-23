import { describe, expect, it } from 'vitest'
import { parseLiveRoundDraftState } from '../src/liveRounds.js'

const teeId = '22222222-2222-4222-8222-222222222222'
const state = {
  version: 1,
  currentHoleIndex: 0,
  tee: { id: teeId, teeName: 'White' },
  form: { teeId, participation: 'INDIVIDUAL', holeCount: 9 },
  scorecardStatus: 'available',
  scorecardSource: 'saved',
  holeEntries: Array.from({ length: 9 }, (_, index) => ({
    holeNumber: index + 1,
    par: '4',
    strokeIndex: String(index + 1),
    yardage: '400',
    strokesTaken: '',
    pickedUp: false,
  })),
  matchPlayDraft: {},
}

describe('live round drafts', () => {
  it('accepts a bounded individual round draft', () => {
    expect(parseLiveRoundDraftState(state)).toEqual(state)
  })

  it('rejects team, duplicate-hole, and out-of-range draft state', () => {
    expect(parseLiveRoundDraftState({ ...state, form: { ...state.form, participation: 'TEAM' } })).toBeNull()
    expect(parseLiveRoundDraftState({ ...state, holeEntries: state.holeEntries.map((hole) => ({ ...hole, holeNumber: 1 })) })).toBeNull()
    expect(parseLiveRoundDraftState({ ...state, currentHoleIndex: 9 })).toBeNull()
  })
})
