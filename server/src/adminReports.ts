export const ADMIN_REPORT_EXPORT_TYPES = [
  'users',
  'rounds',
  'support',
  'catalogue',
] as const

export type AdminReportExportType =
  (typeof ADMIN_REPORT_EXPORT_TYPES)[number]

export type AdminReportRange = {
  from: string
  to: string
  fromDate: Date
  toExclusive: Date
}

type CsvValue = string | number | boolean | null | undefined

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function parseAdminReportRange(
  fromValue: unknown,
  toValue: unknown,
  now = new Date(),
): AdminReportRange | null {
  const today = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ))
  const defaultFrom = new Date(today)
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29)

  const fromDate = fromValue === undefined ? defaultFrom : parseDate(fromValue)
  const toDate = toValue === undefined ? today : parseDate(toValue)

  if (!fromDate || !toDate || fromDate > toDate) return null

  const toExclusive = new Date(toDate)
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1)

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate),
    fromDate,
    toExclusive,
  }
}

export function parseAdminReportExportType(
  value: unknown,
): AdminReportExportType | null {
  return typeof value === 'string' &&
    ADMIN_REPORT_EXPORT_TYPES.includes(value as AdminReportExportType)
    ? value as AdminReportExportType
    : null
}

function protectSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return ''

  const text = typeof value === 'string'
    ? protectSpreadsheetCell(value)
    : String(value)

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function createCsv(
  columns: readonly string[],
  rows: ReadonlyArray<Record<string, CsvValue>>,
): string {
  return `\uFEFF${[
    columns.map(escapeCsvValue).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(',')),
  ].join('\r\n')}\r\n`
}
