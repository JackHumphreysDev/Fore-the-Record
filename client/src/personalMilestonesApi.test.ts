import { describe, expect, it } from 'vitest'
import { isPersonalMilestonesData } from './personalMilestonesApi.ts'

const response = {
  totals: {
    holesPlayed: 18,
    totalShots: 82,
    yardsCovered: 6200,
    eagles: 0,
    birdies: 2,
    pars: 8,
    bogeys: 6,
  },
  personalBests: {
    lowestGrossScore: { value: 82, achievedAt: '2026-09-09T00:00:00.000Z' },
    lowestDifferential: { value: 12.4, achievedAt: '2026-09-09T00:00:00.000Z' },
    lowestHandicapIndex: null,
  },
  achievements: [
    {
      id: 'rounds-1',
      title: 'First round recorded',
      description: 'Your playing record has begun.',
      achievedAt: '2026-09-09T00:00:00.000Z',
      current: 1,
      target: 1,
    },
  ],
}

describe('personal milestone validation', () => {
  it('accepts a complete lifetime milestone response', () => {
    expect(isPersonalMilestonesData(response)).toBe(true)
  })

  it('rejects invalid totals and achievement dates', () => {
    expect(
      isPersonalMilestonesData({
        ...response,
        totals: { ...response.totals, totalShots: -1 },
      }),
    ).toBe(false)
    expect(
      isPersonalMilestonesData({
        ...response,
        achievements: [{ ...response.achievements[0], achievedAt: 'soon' }],
      }),
    ).toBe(false)
  })
})
