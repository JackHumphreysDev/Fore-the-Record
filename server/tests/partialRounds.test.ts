import { describe, expect, it } from 'vitest'
import { recordedHoles } from '../src/partialRounds.js'
import type { LiveRoundDraftState } from '../src/liveRounds.js'

function entry(holeNumber: number, strokesTaken = '', pickedUp = false) {
  return {
    holeNumber, par: '4', strokeIndex: String(holeNumber), yardage: '300',
    strokesTaken, pickedUp, putts: '', fairwayResult: '' as const,
    greenInRegulation: '' as const, penaltyStrokes: '', bunkerVisits: '',
    upAndDownResult: '' as const,
  }
}

describe('record-only live cards', () => {
  it('keeps scored and picked-up holes while leaving unplayed holes empty', () => {
    const state = { holeEntries: [entry(1, '5'), entry(2, '', true), entry(3)] } as LiveRoundDraftState
    expect(recordedHoles(state)).toMatchObject([
      { holeNumber: 1, strokesTaken: 5, pickedUp: false },
      { holeNumber: 2, strokesTaken: 0, pickedUp: true },
    ])
  })

  it('rejects a score outside the accepted range', () => {
    expect(() => recordedHoles({ holeEntries: [entry(1, '31')] } as LiveRoundDraftState)).toThrow()
  })
})
