import { describe, expect, it } from 'vitest'
import {
  buildAdminExportPath,
  buildAdminReportsPath,
  isAdminReportsData,
} from './adminReportsApi.ts'

const report = {
  period: { from: '2026-09-01', to: '2026-09-22' },
  activity: { registrations: 2, rounds: 8, casualRounds: 4, competitionRounds: 3, socialRounds: 1, supportRequests: 2 },
  accounts: { active: 12, suspended: 1 },
  workQueue: { openSupportRequests: 3, pendingScorecardReviews: 1 },
  catalogue: { clubs: 20, courses: 23, tees: 80 },
}

describe('admin reports API helpers', () => {
  it('validates a complete reports response', () => {
    expect(isAdminReportsData(report)).toBe(true)
    expect(isAdminReportsData({ ...report, accounts: { active: -1, suspended: 0 } })).toBe(false)
  })

  it('builds report and export paths with one date range', () => {
    expect(buildAdminReportsPath('2026-09-01', '2026-09-22')).toBe(
      '/api/admin/reports?from=2026-09-01&to=2026-09-22',
    )
    expect(buildAdminExportPath('rounds', '2026-09-01', '2026-09-22')).toBe(
      '/api/admin/reports/export/rounds?from=2026-09-01&to=2026-09-22',
    )
  })
})
