import type { PersonalMilestones } from './personalMilestones.js'

export const PLAYER_GOAL_TYPES = [
  'HANDICAP_INDEX',
  'LOWEST_GROSS_SCORE',
  'ROUNDS_PLAYED',
  'BIRDIES',
  'PARS',
] as const

export type PlayerGoalTypeValue = (typeof PLAYER_GOAL_TYPES)[number]

type GoalDirection = 'LOWER' | 'HIGHER'

type GoalDefinition = {
  title: string
  unit: string
  direction: GoalDirection
  minimum: number
  maximum: number
  decimals: number
}

export const PLAYER_GOAL_DEFINITIONS: Record<
  PlayerGoalTypeValue,
  GoalDefinition
> = {
  HANDICAP_INDEX: {
    title: 'Handicap Index',
    unit: 'index',
    direction: 'LOWER',
    minimum: -10,
    maximum: 54,
    decimals: 1,
  },
  LOWEST_GROSS_SCORE: {
    title: 'Lowest gross score',
    unit: 'strokes',
    direction: 'LOWER',
    minimum: 18,
    maximum: 200,
    decimals: 0,
  },
  ROUNDS_PLAYED: {
    title: 'Rounds played',
    unit: 'rounds',
    direction: 'HIGHER',
    minimum: 1,
    maximum: 10000,
    decimals: 0,
  },
  BIRDIES: {
    title: 'Lifetime birdies',
    unit: 'birdies',
    direction: 'HIGHER',
    minimum: 1,
    maximum: 100000,
    decimals: 0,
  },
  PARS: {
    title: 'Lifetime pars',
    unit: 'pars',
    direction: 'HIGHER',
    minimum: 1,
    maximum: 100000,
    decimals: 0,
  },
}

export class PlayerGoalValidationError extends Error {}

export function parsePlayerGoalType(value: unknown): PlayerGoalTypeValue | null {
  return typeof value === 'string' &&
    PLAYER_GOAL_TYPES.includes(value as PlayerGoalTypeValue)
    ? (value as PlayerGoalTypeValue)
    : null
}

function parseTargetDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new PlayerGoalValidationError('Enter a valid target date')
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new PlayerGoalValidationError('Enter a valid target date')
  }
  return date
}

export function parsePlayerGoalInput(
  type: PlayerGoalTypeValue,
  value: unknown,
): { targetValue: number; targetDate: Date | null } {
  if (typeof value !== 'object' || value === null) {
    throw new PlayerGoalValidationError('Goal details are required')
  }

  const input = value as Record<string, unknown>
  const targetValue =
    typeof input.targetValue === 'number'
      ? input.targetValue
      : typeof input.targetValue === 'string' && input.targetValue.trim() !== ''
        ? Number(input.targetValue)
        : Number.NaN
  const definition = PLAYER_GOAL_DEFINITIONS[type]

  if (
    !Number.isFinite(targetValue) ||
    targetValue < definition.minimum ||
    targetValue > definition.maximum ||
    (definition.decimals === 0 && !Number.isInteger(targetValue)) ||
    (definition.decimals === 1 && Math.round(targetValue * 10) !== targetValue * 10)
  ) {
    const range = `${definition.minimum} to ${definition.maximum}`
    throw new PlayerGoalValidationError(
      definition.decimals === 0
        ? `Enter a whole-number target from ${range}`
        : `Enter a target from ${range} with no more than one decimal place`,
    )
  }

  return { targetValue, targetDate: parseTargetDate(input.targetDate) }
}

export type PlayerGoalMetrics = Record<PlayerGoalTypeValue, number | null>

export function buildPlayerGoalMetrics(
  handicapIndex: number | null,
  milestones: PersonalMilestones,
): PlayerGoalMetrics {
  const roundsPlayed =
    milestones.achievements.find(({ id }) => id === 'rounds-1')?.current ?? 0

  return {
    HANDICAP_INDEX: handicapIndex,
    LOWEST_GROSS_SCORE: milestones.personalBests.lowestGrossScore?.value ?? null,
    ROUNDS_PLAYED: roundsPlayed,
    BIRDIES: milestones.totals.birdies,
    PARS: milestones.totals.pars,
  }
}

export function buildPlayerGoalProgress(goal: {
  id: string
  type: PlayerGoalTypeValue
  targetValue: number | { toString(): string }
  targetDate: Date | null
  createdAt: Date
  updatedAt: Date
}, metrics: PlayerGoalMetrics) {
  const definition = PLAYER_GOAL_DEFINITIONS[goal.type]
  const targetValue = Number(goal.targetValue)
  const currentValue = metrics[goal.type]
  const isComplete =
    currentValue !== null &&
    (definition.direction === 'LOWER'
      ? currentValue <= targetValue
      : currentValue >= targetValue)
  const rawProgress =
    currentValue === null
      ? 0
      : definition.direction === 'HIGHER'
        ? (currentValue / targetValue) * 100
        : currentValue <= targetValue
          ? 100
          : (targetValue / currentValue) * 100

  return {
    id: goal.id,
    type: goal.type,
    title: definition.title,
    unit: definition.unit,
    direction: definition.direction,
    targetValue,
    currentValue,
    progressPercent: Math.round(Math.max(0, Math.min(rawProgress, 100))),
    isComplete,
    targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  }
}
