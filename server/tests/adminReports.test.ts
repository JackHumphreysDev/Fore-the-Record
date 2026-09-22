import { describe, expect, it } from 'vitest'
import {
  createCsv,
  parseAdminReportExportType,
  parseAdminReportRange,
} from '../src/adminReports.js'

describe('admin report helpers', () => {
  it('uses an inclusive default 30-day UTC period', () => {
    const range = parseAdminReportRange(undefined, undefined, new Date('2026-09-22T18:00:00Z'))

    expect(range).toMatchObject({ from: '2026-08-24', to: '2026-09-22' })
    expect(range?.toExclusive.toISOString()).toBe('2026-09-23T00:00:00.000Z')
  })

  it('rejects invalid and reversed date ranges', () => {
    expect(parseAdminReportRange('2026-02-30', '2026-03-01')).toBeNull()
    expect(parseAdminReportRange('2026-09-22', '2026-09-01')).toBeNull()
  })

  it('accepts only supported export names', () => {
    expect(parseAdminReportExportType('rounds')).toBe('rounds')
    expect(parseAdminReportExportType('secrets')).toBeNull()
  })

  it('quotes CSV data and protects spreadsheet formula cells', () => {
    const csv = createCsv(['name', 'note', 'rounds'], [{
      name: '=IMPORTXML("https://example.com")',
      note: 'One, two',
      rounds: 4,
    }])

    expect(csv).toContain('"\'=IMPORTXML(""https://example.com"")"')
    expect(csv).toContain('"One, two",4')
  })
})
