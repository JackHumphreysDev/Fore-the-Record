import { describe, expect, it } from 'vitest'
import {
  isPlayerGoalsResponse,
  PLAYER_GOAL_OPTIONS,
} from './playerGoalsApi.ts'

const goal = {
  id: 'goal-id',
  type: 'HANDICAP_INDEX',
  title: 'Handicap Index',
  unit: 'index',
  direction: 'LOWER',
  targetValue: 15,
  currentValue: 18.2,
  progressPercent: 82,
  isComplete: false,
  targetDate: '2026-12-31',
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
}

describe('player goal response validation', () => {
  it('accepts complete goal data', () => {
    expect(isPlayerGoalsResponse({ goals: [goal] })).toBe(true)
  })

  it('rejects unsupported goal types and invalid progress', () => {
    expect(
      isPlayerGoalsResponse({ goals: [{ ...goal, type: 'PRIVATE_NOTE' }] }),
    ).toBe(false)
    expect(
      isPlayerGoalsResponse({ goals: [{ ...goal, progressPercent: 101 }] }),
    ).toBe(false)
  })

  it('offers each supported target once', () => {
    expect(new Set(PLAYER_GOAL_OPTIONS.map(({ type }) => type)).size).toBe(
      PLAYER_GOAL_OPTIONS.length,
    )
  })
})
