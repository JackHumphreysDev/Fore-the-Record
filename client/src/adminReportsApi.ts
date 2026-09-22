export const ADMIN_EXPORT_OPTIONS = [
  { type: 'users', label: 'Users', detail: 'Registrations and account status' },
  { type: 'rounds', label: 'Rounds', detail: 'Scores and handicap status' },
  { type: 'support', label: 'Support requests', detail: 'Request metadata without private messages' },
  { type: 'catalogue', label: 'Course catalogue', detail: 'All saved clubs, courses, and tees' },
] as const

export type AdminExportType = (typeof ADMIN_EXPORT_OPTIONS)[number]['type']

export type AdminReportsData = {
  period: { from: string; to: string }
  activity: {
    registrations: number
    rounds: number
    casualRounds: number
    competitionRounds: number
    socialRounds: number
    supportRequests: number
  }
  accounts: { active: number; suspended: number }
  workQueue: { openSupportRequests: number; pendingScorecardReviews: number }
  catalogue: { clubs: number; courses: number; tees: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasCounts(value: unknown, keys: readonly string[]): boolean {
  return isRecord(value) && keys.every((key) =>
    Number.isInteger(value[key]) && Number(value[key]) >= 0,
  )
}

export function isAdminReportsData(value: unknown): value is AdminReportsData {
  return isRecord(value) &&
    isRecord(value.period) &&
    typeof value.period.from === 'string' &&
    typeof value.period.to === 'string' &&
    hasCounts(value.activity, ['registrations', 'rounds', 'casualRounds', 'competitionRounds', 'socialRounds', 'supportRequests']) &&
    hasCounts(value.accounts, ['active', 'suspended']) &&
    hasCounts(value.workQueue, ['openSupportRequests', 'pendingScorecardReviews']) &&
    hasCounts(value.catalogue, ['clubs', 'courses', 'tees'])
}

export function buildAdminReportsPath(from: string, to: string): string {
  const query = new URLSearchParams({ from, to })
  return `/api/admin/reports?${query.toString()}`
}

export function buildAdminExportPath(
  type: AdminExportType,
  from: string,
  to: string,
): string {
  const query = new URLSearchParams({ from, to })
  return `/api/admin/reports/export/${type}?${query.toString()}`
}
