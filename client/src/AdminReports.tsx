import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  ADMIN_EXPORT_OPTIONS,
  buildAdminExportPath,
  buildAdminReportsPath,
  isAdminReportsData,
  type AdminExportType,
  type AdminReportsData,
} from './adminReportsApi.ts'

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function defaultDates(): { from: string; to: string } {
  const today = new Date()
  const from = new Date(today)
  from.setUTCDate(from.getUTCDate() - 29)
  return { from: isoDate(from), to: isoDate(today) }
}

async function responseError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
    ? body.error
    : fallback
}

function downloadName(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="([^"]+)"/)
  return match?.[1] ?? fallback
}

export default function AdminReports() {
  const initial = defaultDates()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [applied, setApplied] = useState(initial)
  const [reports, setReports] = useState<AdminReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<AdminExportType | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadReports() {
      setLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch(buildAdminReportsPath(applied.from, applied.to), { signal: controller.signal })
        if (!response.ok) throw new Error(await responseError(response, 'We could not load reports.'))
        const body: unknown = await response.json()
        if (!isAdminReportsData(body)) throw new Error('The report returned was incomplete.')
        setReports(body)
      } catch (value: unknown) {
        if (value instanceof DOMException && value.name === 'AbortError') return
        setError(value instanceof Error ? value.message : 'We could not load reports.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadReports()
    return () => controller.abort()
  }, [applied])

  function applyDates(event: FormEvent) {
    event.preventDefault()
    if (!from || !to || from > to) {
      setError('Choose a valid start and end date.')
      return
    }
    setApplied({ from, to })
  }

  async function download(type: AdminExportType) {
    setDownloading(type)
    setError('')
    try {
      const response = await authenticatedFetch(buildAdminExportPath(type, applied.from, applied.to))
      if (!response.ok) throw new Error(await responseError(response, 'We could not prepare that export.'))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadName(response, `fore-the-record-${type}.csv`)
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : 'We could not prepare that export.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <section className="admin-panel admin-reports" aria-labelledby="admin-reports-title">
      <div className="admin-panel-heading admin-reports-heading">
        <div>
          <p>Reporting</p>
          <h2 id="admin-reports-title">Site reports and exports</h2>
        </div>
        <span>Administrator only</span>
      </div>

      <form className="admin-report-dates" onSubmit={applyDates}>
        <label>From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
        <button type="submit" disabled={loading}>Update report</button>
      </form>

      {loading ? <div className="admin-state" role="status">Preparing reports…</div> : null}
      {error ? <div className="admin-state admin-state-error" role="alert">{error}</div> : null}

      {!loading && reports ? (
        <>
          <p className="admin-report-period">Activity from <strong>{reports.period.from}</strong> to <strong>{reports.period.to}</strong>. Account, queue, and catalogue totals show the current position.</p>
          <div className="admin-report-groups">
            <article><h3>Period activity</h3><dl><div><dt>New users</dt><dd>{reports.activity.registrations}</dd></div><div><dt>Rounds</dt><dd>{reports.activity.rounds}</dd></div><div><dt>Casual</dt><dd>{reports.activity.casualRounds}</dd></div><div><dt>Competitions</dt><dd>{reports.activity.competitionRounds}</dd></div><div><dt>Social games</dt><dd>{reports.activity.socialRounds}</dd></div><div><dt>Support requests</dt><dd>{reports.activity.supportRequests}</dd></div></dl></article>
            <article><h3>Accounts and work</h3><dl><div><dt>Active users</dt><dd>{reports.accounts.active}</dd></div><div><dt>Suspended users</dt><dd>{reports.accounts.suspended}</dd></div><div><dt>Open requests</dt><dd>{reports.workQueue.openSupportRequests}</dd></div><div><dt>Scorecards to review</dt><dd>{reports.workQueue.pendingScorecardReviews}</dd></div></dl></article>
            <article><h3>Course catalogue</h3><dl><div><dt>Clubs</dt><dd>{reports.catalogue.clubs}</dd></div><div><dt>Courses</dt><dd>{reports.catalogue.courses}</dd></div><div><dt>Tees</dt><dd>{reports.catalogue.tees}</dd></div></dl></article>
          </div>

          <div className="admin-export-list" aria-label="CSV exports">
            {ADMIN_EXPORT_OPTIONS.map((option) => (
              <article key={option.type}>
                <div><strong>{option.label}</strong><span>{option.type === 'catalogue' ? `${option.detail}; date filter does not apply` : option.detail}</span></div>
                <button type="button" disabled={downloading !== null} onClick={() => void download(option.type)}>{downloading === option.type ? 'Preparing…' : 'Download CSV'}</button>
              </article>
            ))}
          </div>
          <p className="admin-export-note">Exports exclude passwords, authentication identifiers, tokens, private messages, notes, and scorecard-photo locations. Every download is recorded in the administrator audit log.</p>
        </>
      ) : null}
    </section>
  )
}
