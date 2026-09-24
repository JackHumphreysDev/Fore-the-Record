export const STATISTICS_DASHBOARD_CARDS = [
  'ROUNDS_PLAYED',
  'AVERAGE_GROSS',
  'AVERAGE_TO_PAR',
  'CURRENT_HANDICAP',
  'PUTTS_PER_ROUND',
  'THREE_PUTT_PERCENTAGE',
  'FAIRWAYS_HIT',
  'GREENS_IN_REGULATION',
  'SCRAMBLING',
  'PENALTIES_PER_ROUND',
  'BUNKER_VISITS_PER_ROUND',
] as const

export type StatisticsDashboardCard = typeof STATISTICS_DASHBOARD_CARDS[number]
export type StatisticsDashboardDateRange = '30_DAYS' | '90_DAYS' | '12_MONTHS' | 'ALL_TIME' | 'CUSTOM'

export type StatisticsDashboardConfig = {
  cards: StatisticsDashboardCard[]
  filters: {
    dateRange: StatisticsDashboardDateRange
    customFrom: string | null
    customTo: string | null
    courseId: string | null
    teeId: string | null
    category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME' | null
    holeCount: 9 | 18 | null
  }
}

export class StatisticsDashboardValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StatisticsDashboardValidationError'
  }
}

export const DEFAULT_STATISTICS_DASHBOARD: StatisticsDashboardConfig = {
  cards: ['ROUNDS_PLAYED', 'AVERAGE_GROSS', 'AVERAGE_TO_PAR', 'CURRENT_HANDICAP', 'PUTTS_PER_ROUND', 'FAIRWAYS_HIT'],
  filters: { dateRange: 'ALL_TIME', customFrom: null, customTo: null, courseId: null, teeId: null, category: null, holeCount: null },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalUuid(value: unknown, label: string): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new StatisticsDashboardValidationError(`Choose a valid ${label}`)
  }
  return value
}

function optionalDate(value: unknown, label: string): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new StatisticsDashboardValidationError(`Choose a valid ${label}`)
  }
  return value
}

export function parseStatisticsDashboardConfig(value: unknown): StatisticsDashboardConfig {
  if (!isRecord(value) || !Array.isArray(value.cards) || !isRecord(value.filters)) {
    throw new StatisticsDashboardValidationError('Choose a valid statistics dashboard')
  }
  const cards = value.cards
  if (cards.length < 1 || cards.length > STATISTICS_DASHBOARD_CARDS.length || cards.some((card) => typeof card !== 'string' || !STATISTICS_DASHBOARD_CARDS.includes(card as StatisticsDashboardCard)) || new Set(cards).size !== cards.length) {
    throw new StatisticsDashboardValidationError('Choose between 1 and 11 different statistic cards')
  }
  const filters = value.filters
  const dateRange = filters.dateRange
  if (dateRange !== '30_DAYS' && dateRange !== '90_DAYS' && dateRange !== '12_MONTHS' && dateRange !== 'ALL_TIME' && dateRange !== 'CUSTOM') {
    throw new StatisticsDashboardValidationError('Choose a valid dashboard date range')
  }
  const customFrom = optionalDate(filters.customFrom, 'start date')
  const customTo = optionalDate(filters.customTo, 'end date')
  if (customFrom && customTo && customFrom > customTo) throw new StatisticsDashboardValidationError('The start date must not be after the end date')
  if (dateRange === 'CUSTOM' && !customFrom && !customTo) throw new StatisticsDashboardValidationError('Choose at least one custom date')
  const category = filters.category
  if (category !== null && category !== 'CASUAL' && category !== 'COMPETITION' && category !== 'SOCIAL_GAME') {
    throw new StatisticsDashboardValidationError('Choose a valid round type')
  }
  const holeCount = filters.holeCount
  if (holeCount !== null && holeCount !== 9 && holeCount !== 18) throw new StatisticsDashboardValidationError('Choose a valid round length')
  return {
    cards: cards as StatisticsDashboardCard[],
    filters: {
      dateRange,
      customFrom,
      customTo,
      courseId: optionalUuid(filters.courseId, 'course'),
      teeId: optionalUuid(filters.teeId, 'tee'),
      category,
      holeCount,
    },
  }
}

export function readStatisticsDashboardConfig(value: unknown): StatisticsDashboardConfig {
  try {
    return parseStatisticsDashboardConfig(value)
  } catch {
    return DEFAULT_STATISTICS_DASHBOARD
  }
}
