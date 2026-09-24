import { authenticatedFetch } from './api.ts'

export const STATISTICS_DASHBOARD_CARDS = [
  'ROUNDS_PLAYED', 'AVERAGE_GROSS', 'AVERAGE_TO_PAR', 'CURRENT_HANDICAP',
  'PUTTS_PER_ROUND', 'THREE_PUTT_PERCENTAGE', 'FAIRWAYS_HIT',
  'GREENS_IN_REGULATION', 'SCRAMBLING', 'PENALTIES_PER_ROUND',
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

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function nullableString(value: unknown): boolean { return value === null || typeof value === 'string' }

export function isStatisticsDashboardConfig(value: unknown): value is StatisticsDashboardConfig {
  if (!isRecord(value) || !Array.isArray(value.cards) || !isRecord(value.filters)) return false
  const cards = value.cards
  const filters = value.filters
  return cards.length >= 1 && cards.length <= STATISTICS_DASHBOARD_CARDS.length &&
    cards.every((card) => typeof card === 'string' && STATISTICS_DASHBOARD_CARDS.includes(card as StatisticsDashboardCard)) &&
    new Set(cards).size === cards.length &&
    ['30_DAYS', '90_DAYS', '12_MONTHS', 'ALL_TIME', 'CUSTOM'].includes(String(filters.dateRange)) &&
    nullableString(filters.customFrom) && nullableString(filters.customTo) &&
    nullableString(filters.courseId) && nullableString(filters.teeId) &&
    (filters.category === null || filters.category === 'CASUAL' || filters.category === 'COMPETITION' || filters.category === 'SOCIAL_GAME') &&
    (filters.holeCount === null || filters.holeCount === 9 || filters.holeCount === 18)
}

function readError(body: unknown, fallback: string): string {
  return isRecord(body) && typeof body.error === 'string' ? body.error : fallback
}

export async function loadStatisticsDashboard(signal?: AbortSignal): Promise<StatisticsDashboardConfig> {
  const response = await authenticatedFetch('/api/users/me/statistics-dashboard', { signal })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isStatisticsDashboardConfig(body)) throw new Error(readError(body, 'We could not load your statistics dashboard.'))
  return body
}

export async function saveStatisticsDashboard(config: StatisticsDashboardConfig): Promise<StatisticsDashboardConfig> {
  const response = await authenticatedFetch('/api/users/me/statistics-dashboard', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isStatisticsDashboardConfig(body)) throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'We could not save your statistics dashboard.')
  return body
}
