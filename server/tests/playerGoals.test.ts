import { describe, expect, it } from 'vitest'
import {
  buildPlayerGoalMetrics,
  buildPlayerGoalProgress,
  parsePlayerGoalInput,
  parsePlayerGoalType,
  PlayerGoalValidationError,
} from '../src/playerGoals.js'

const milestones = {
  totals: {
    holesPlayed: 180,
    totalShots: 900,
    yardsCovered: 60000,
    eagles: 1,
    birdies: 12,
    pars: 52,
    bogeys: 70,
  },
  personalBests: {
    lowestGrossScore: { value: 88, achievedAt: '2026-09-01T00:00:00.000Z' },
    lowestDifferential: null,
    lowestHandicapIndex: null,
  },
  achievements: [
    {
      id: 'rounds-1',
      title: 'First round',
      description: 'Test',
      achievedAt: '2026-01-01T00:00:00.000Z',
      current: 10,
      target: 1,
    },
  ],
}

describe('player goals', () => {
  it('accepts supported types and bounded targets', () => {
    expect(parsePlayerGoalType('HANDICAP_INDEX')).toBe('HANDICAP_INDEX')
    expect(parsePlayerGoalType('UNKNOWN')).toBeNull()
    expect(
      parsePlayerGoalInput('HANDICAP_INDEX', {
        targetValue: '12.4',
        targetDate: '2026-12-31',
      }),
    ).toEqual({
      targetValue: 12.4,
      targetDate: new Date('2026-12-31T00:00:00.000Z'),
    })
  })

  it('rejects fractional count targets and invalid dates', () => {
    expect(() =>
      parsePlayerGoalInput('ROUNDS_PLAYED', { targetValue: 2.5 }),
    ).toThrow(PlayerGoalValidationError)
    expect(() =>
      parsePlayerGoalInput('PARS', {
        targetValue: 100,
        targetDate: '2026-02-30',
      }),
    ).toThrow('Enter a valid target date')
  })

  it('derives private goal metrics from milestone data', () => {
    expect(buildPlayerGoalMetrics(18.2, milestones)).toEqual({
      HANDICAP_INDEX: 18.2,
      LOWEST_GROSS_SCORE: 88,
      ROUNDS_PLAYED: 10,
      BIRDIES: 12,
      PARS: 52,
    })
  })

  it('calculates progress for higher and lower targets', () => {
    const metrics = buildPlayerGoalMetrics(18, milestones)
    const dates = {
      targetDate: null,
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
      updatedAt: new Date('2026-09-10T10:00:00.000Z'),
    }

    expect(
      buildPlayerGoalProgress(
        {
          id: 'goal-1',
          type: 'ROUNDS_PLAYED',
          targetValue: 20,
          ...dates,
        },
        metrics,
      ),
    ).toMatchObject({ currentValue: 10, progressPercent: 50, isComplete: false })
    expect(
      buildPlayerGoalProgress(
        {
          id: 'goal-2',
          type: 'LOWEST_GROSS_SCORE',
          targetValue: 90,
          ...dates,
        },
        metrics,
      ),
    ).toMatchObject({ currentValue: 88, progressPercent: 100, isComplete: true })
  })
})
