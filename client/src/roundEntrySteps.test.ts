import { describe, expect, it } from 'vitest'
import { roundDetailsDateErrors, roundEntryErrorStep } from './roundEntrySteps.ts'

describe('guided round entry', () => {
  it('accepts a complete past date and time', () => {
    expect(Object.values(roundDetailsDateErrors('2026-09-27', '09:30', '2026-09-28')).some(Boolean)).toBe(false)
  })
  it.each(['', '24:00', '09:60', '9:30'])('rejects incomplete or invalid time %s', (time) => {
    expect(roundDetailsDateErrors('2026-09-27', time, '2026-09-28').timePlayed).toBeTruthy()
  })
  it('rejects future or missing dates', () => {
    expect(roundDetailsDateErrors('2026-09-29', '10:00', '2026-09-28').datePlayed).toBeTruthy()
    expect(roundDetailsDateErrors('', '10:00', '2026-09-28').datePlayed).toBeTruthy()
  })
  it.each([
    [{ teeId: 'Choose a tee', grossScore: 'Missing' }, 0],
    [{ datePlayed: 'Missing', scorecard: 'Incomplete' }, 1],
    [{ playingHandicap: 'Invalid' }, 1],
    [{ matchPlay: 'Choose the named friend or guest as your match-play opponent' }, 1],
    [{ matchPlay: 'Complete each played match hole until the match is finished' }, 2],
    [{ teamCompetition: 'Incomplete team card' }, 2],
    [{ grossScore: 'Missing', notes: 'Too long' }, 2],
    [{ notes: 'Too long' }, 3],
  ])('shows the step containing the invalid fields: %j', (errors, step) => {
    expect(roundEntryErrorStep(errors)).toBe(step)
  })
})
