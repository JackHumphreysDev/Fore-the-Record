export const PLAYER_GOAL_OPTIONS = [
  {
    type: 'HANDICAP_INDEX',
    label: 'Handicap Index',
    minimum: -10,
    maximum: 54,
    step: 0.1,
  },
  {
    type: 'LOWEST_GROSS_SCORE',
    label: 'Lowest gross score',
    minimum: 18,
    maximum: 200,
    step: 1,
  },
  {
    type: 'ROUNDS_PLAYED',
    label: 'Rounds played',
    minimum: 1,
    maximum: 10000,
    step: 1,
  },
  {
    type: 'BIRDIES',
    label: 'Lifetime birdies',
    minimum: 1,
    maximum: 100000,
    step: 1,
  },
  {
    type: 'PARS',
    label: 'Lifetime pars',
    minimum: 1,
    maximum: 100000,
    step: 1,
  },
] as const

export type PlayerGoalType = (typeof PLAYER_GOAL_OPTIONS)[number]['type']

export type PlayerGoal = {
  id: string
  type: PlayerGoalType
  title: string
  unit: string
  direction: 'LOWER' | 'HIGHER'
  targetValue: number
  currentValue: number | null
  progressPercent: number
  isComplete: boolean
  targetDate: string | null
  createdAt: string
  updatedAt: string
}

export type PlayerGoalsResponse = { goals: PlayerGoal[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isGoalType(value: unknown): value is PlayerGoalType {
  return PLAYER_GOAL_OPTIONS.some(({ type }) => type === value)
}

function isGoal(value: unknown): value is PlayerGoal {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isGoalType(value.type) &&
    typeof value.title === 'string' &&
    typeof value.unit === 'string' &&
    (value.direction === 'LOWER' || value.direction === 'HIGHER') &&
    typeof value.targetValue === 'number' &&
    Number.isFinite(value.targetValue) &&
    (value.currentValue === null ||
      (typeof value.currentValue === 'number' &&
        Number.isFinite(value.currentValue))) &&
    typeof value.progressPercent === 'number' &&
    value.progressPercent >= 0 &&
    value.progressPercent <= 100 &&
    typeof value.isComplete === 'boolean' &&
    (value.targetDate === null || isDate(value.targetDate)) &&
    isDate(value.createdAt) &&
    isDate(value.updatedAt)
  )
}

export function isPlayerGoalsResponse(
  value: unknown,
): value is PlayerGoalsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.goals) &&
    value.goals.every(isGoal)
  )
}
