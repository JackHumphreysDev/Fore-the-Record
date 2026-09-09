export type ProgressMilestone = {
  id: string
  title: string
  description: string
  achievedAt: string | null
  current: number
  target: number
}

export type PersonalBest = {
  value: number
  achievedAt: string
}

export type PersonalMilestonesData = {
  totals: {
    holesPlayed: number
    totalShots: number
    yardsCovered: number
    eagles: number
    birdies: number
    pars: number
    bogeys: number
  }
  personalBests: {
    lowestGrossScore: PersonalBest | null
    lowestDifferential: PersonalBest | null
    lowestHandicapIndex: PersonalBest | null
  }
  achievements: ProgressMilestone[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isPersonalBest(value: unknown): value is PersonalBest {
  return (
    isRecord(value) &&
    typeof value.value === 'number' &&
    Number.isFinite(value.value) &&
    isDate(value.achievedAt)
  )
}

function isMilestone(value: unknown): value is ProgressMilestone {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    (value.achievedAt === null || isDate(value.achievedAt)) &&
    isNonNegativeInteger(value.current) &&
    Number.isInteger(value.target) &&
    Number(value.target) > 0
  )
}

export function isPersonalMilestonesData(
  value: unknown,
): value is PersonalMilestonesData {
  if (
    !isRecord(value) ||
    !isRecord(value.totals) ||
    !isRecord(value.personalBests) ||
    !Array.isArray(value.achievements)
  ) {
    return false
  }

  return (
    isNonNegativeInteger(value.totals.holesPlayed) &&
    isNonNegativeInteger(value.totals.totalShots) &&
    isNonNegativeInteger(value.totals.yardsCovered) &&
    isNonNegativeInteger(value.totals.eagles) &&
    isNonNegativeInteger(value.totals.birdies) &&
    isNonNegativeInteger(value.totals.pars) &&
    isNonNegativeInteger(value.totals.bogeys) &&
    (value.personalBests.lowestGrossScore === null ||
      isPersonalBest(value.personalBests.lowestGrossScore)) &&
    (value.personalBests.lowestDifferential === null ||
      isPersonalBest(value.personalBests.lowestDifferential)) &&
    (value.personalBests.lowestHandicapIndex === null ||
      isPersonalBest(value.personalBests.lowestHandicapIndex)) &&
    value.achievements.every(isMilestone)
  )
}
