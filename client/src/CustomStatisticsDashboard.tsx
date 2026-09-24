import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import { buildPerformanceAnalysisPath, isPerformanceAnalysisData, type PerformanceAnalysisData, type PerformanceAnalysisFilters } from './performanceAnalysisApi.ts'
import { buildStatisticsDashboardCard, STATISTICS_DASHBOARD_CARD_LABELS } from './statisticsDashboardCards.ts'
import { loadStatisticsDashboard, saveStatisticsDashboard, STATISTICS_DASHBOARD_CARDS, type StatisticsDashboardCard, type StatisticsDashboardConfig } from './statisticsDashboardApi.ts'
import './CustomStatisticsDashboard.css'

function isoDate(date: Date): string { return date.toISOString().slice(0, 10) }
function presetDates(range: StatisticsDashboardConfig['filters']['dateRange']): Pick<PerformanceAnalysisFilters, 'from' | 'to'> {
  if (range === 'ALL_TIME' || range === 'CUSTOM') return {}
  const end = new Date()
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  if (range === '30_DAYS') start.setUTCDate(start.getUTCDate() - 29)
  if (range === '90_DAYS') start.setUTCDate(start.getUTCDate() - 89)
  if (range === '12_MONTHS') { start.setUTCFullYear(start.getUTCFullYear() - 1); start.setUTCDate(start.getUTCDate() + 1) }
  return { from: isoDate(start), to: isoDate(end) }
}

function responseError(body: unknown, fallback: string): string {
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : fallback
}

export default function CustomStatisticsDashboard({ profileId, handicapIndex }: { profileId: string; handicapIndex: number | null }) {
  const [config, setConfig] = useState<StatisticsDashboardConfig | null>(null)
  const [analysis, setAnalysis] = useState<PerformanceAnalysisData | null>(null)
  const [newCard, setNewCard] = useState<StatisticsDashboardCard | ''>('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void loadStatisticsDashboard(controller.signal).then((saved) => { if (!controller.signal.aborted) { setError(''); setConfig(saved) } }).catch((value: unknown) => { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : 'We could not load your statistics dashboard.') })
    return () => controller.abort()
  }, [profileId])

  const filters = useMemo<PerformanceAnalysisFilters>(() => {
    if (!config) return {}
    const saved = config.filters
    return {
      ...(saved.dateRange === 'CUSTOM' ? { ...(saved.customFrom ? { from: saved.customFrom } : {}), ...(saved.customTo ? { to: saved.customTo } : {}) } : presetDates(saved.dateRange)),
      ...(saved.courseId ? { courseId: saved.courseId } : {}),
      ...(saved.teeId ? { teeId: saved.teeId } : {}),
      ...(saved.category ? { category: saved.category } : {}),
      ...(saved.holeCount ? { holeCount: saved.holeCount } : {}),
    }
  }, [config])

  useEffect(() => {
    if (!config) return
    const controller = new AbortController()
    void authenticatedFetch(buildPerformanceAnalysisPath(filters), { signal: controller.signal }).then(async (response) => {
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(responseError(body, 'We could not calculate your dashboard.'))
      if (!isPerformanceAnalysisData(body)) throw new Error('The statistics dashboard returned incomplete results.')
      if (!controller.signal.aborted) { setError(''); setAnalysis(body) }
    }).catch((value: unknown) => { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : 'We could not calculate your dashboard.') })
    return () => controller.abort()
  }, [attempt, config, filters])

  function updateFilters(patch: Partial<StatisticsDashboardConfig['filters']>) {
    setConfig((current) => current ? { ...current, filters: { ...current.filters, ...patch } } : current)
    setError('')
    setMessage('')
  }

  function moveCard(index: number, direction: -1 | 1) {
    setConfig((current) => {
      if (!current) return current
      const destination = index + direction
      if (destination < 0 || destination >= current.cards.length) return current
      const cards = [...current.cards]
      const [card] = cards.splice(index, 1)
      cards.splice(destination, 0, card!)
      return { ...current, cards }
    })
    setMessage('')
  }

  function removeCard(card: StatisticsDashboardCard) {
    setConfig((current) => !current || current.cards.length === 1 ? current : { ...current, cards: current.cards.filter((item) => item !== card) })
    setMessage('')
  }

  function addCard() {
    if (!newCard) return
    setConfig((current) => !current || current.cards.includes(newCard) ? current : { ...current, cards: [...current.cards, newCard] })
    setNewCard(''); setMessage('')
  }

  async function save() {
    if (!config) return
    setSaving(true); setError(''); setMessage('')
    try { setConfig(await saveStatisticsDashboard(config)); setMessage('Dashboard saved to your account.') }
    catch (value: unknown) { setError(value instanceof Error ? value.message : 'We could not save your statistics dashboard.') }
    finally { setSaving(false) }
  }

  const availableCards = STATISTICS_DASHBOARD_CARDS.filter((card) => !config?.cards.includes(card))
  const availableTees = analysis?.options.tees.filter((tee) => !config?.filters.courseId || tee.courseId === config.filters.courseId) ?? []

  return <section className="custom-statistics-dashboard" aria-labelledby="custom-statistics-title">
    <header><div><p className="form-kicker">Your numbers, your order</p><h2 id="custom-statistics-title">Statistics dashboard.</h2></div><p>Choose the figures that matter to you, arrange them, filter the sample, and save the same view across devices.</p></header>
    {config ? <>
      <div className="custom-statistics-filters" aria-label="Dashboard filters">
        <label>Date range<select value={config.filters.dateRange} onChange={(event) => updateFilters({ dateRange: event.target.value as StatisticsDashboardConfig['filters']['dateRange'] })}><option value="30_DAYS">Last 30 days</option><option value="90_DAYS">Last 90 days</option><option value="12_MONTHS">Last 12 months</option><option value="ALL_TIME">All time</option><option value="CUSTOM">Custom dates</option></select></label>
        <label>Course<select value={config.filters.courseId ?? ''} onChange={(event) => updateFilters({ courseId: event.target.value || null, teeId: null })}><option value="">All courses</option>{analysis?.options.courses.map((course) => <option key={course.id} value={course.id}>{course.clubName} — {course.name}</option>)}</select></label>
        <label>Tee<select value={config.filters.teeId ?? ''} onChange={(event) => updateFilters({ teeId: event.target.value || null })}><option value="">All tees</option>{availableTees.map((tee) => <option key={tee.id} value={tee.id}>{tee.clubName} — {tee.courseName} — {tee.name}</option>)}</select></label>
        <label>Round type<select value={config.filters.category ?? ''} onChange={(event) => updateFilters({ category: event.target.value ? event.target.value as NonNullable<StatisticsDashboardConfig['filters']['category']> : null })}><option value="">All round types</option><option value="CASUAL">Casual only</option><option value="COMPETITION">Competition only</option><option value="SOCIAL_GAME">Games with friends only</option></select></label>
        <label>Round length<select value={config.filters.holeCount ?? ''} onChange={(event) => updateFilters({ holeCount: event.target.value ? Number(event.target.value) as 9 | 18 : null })}><option value="">All lengths</option><option value="9">9 holes</option><option value="18">18 holes</option></select></label>
        {config.filters.dateRange === 'CUSTOM' ? <><label>From<input type="date" value={config.filters.customFrom ?? ''} max={config.filters.customTo ?? undefined} onChange={(event) => updateFilters({ customFrom: event.target.value || null })} /></label><label>To<input type="date" value={config.filters.customTo ?? ''} min={config.filters.customFrom ?? undefined} onChange={(event) => updateFilters({ customTo: event.target.value || null })} /></label></> : null}
      </div>
      {error ? <div className="custom-statistics-state" role="alert"><p>{error}</p><button type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : null}
      {!error && !analysis ? <div className="custom-statistics-state" aria-live="polite">Calculating your dashboard…</div> : null}
      {analysis ? <div className="custom-statistics-grid">{config.cards.map((card, index) => { const view = buildStatisticsDashboardCard(card, analysis, handicapIndex); return <article key={card}><div className="custom-statistics-card-controls"><button type="button" aria-label={`Move ${view.label} earlier`} disabled={index === 0} onClick={() => moveCard(index, -1)}>←</button><button type="button" aria-label={`Move ${view.label} later`} disabled={index === config.cards.length - 1} onClick={() => moveCard(index, 1)}>→</button><button type="button" aria-label={`Remove ${view.label}`} disabled={config.cards.length === 1} onClick={() => removeCard(card)}>×</button></div><span>{view.area}</span><h3>{view.label}</h3><strong>{view.value}</strong><small>{view.sample}</small></article> })}</div> : null}
      <div className="custom-statistics-editor"><label>Add statistic<select value={newCard} onChange={(event) => setNewCard(event.target.value as StatisticsDashboardCard | '')}><option value="">Choose a statistic</option>{availableCards.map((card) => <option key={card} value={card}>{STATISTICS_DASHBOARD_CARD_LABELS[card]}</option>)}</select></label><button type="button" className="is-secondary" disabled={!newCard} onClick={addCard}>Add card</button><button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save dashboard'}</button></div>
      {message ? <p className="custom-statistics-message" role="status">{message}</p> : null}
      <p className="custom-statistics-note">Samples include verified individual rounds only. Team rounds and pending or rejected cards are excluded. Missing optional statistics stay unavailable rather than being treated as zero.</p>
    </> : !error ? <div className="custom-statistics-state" aria-live="polite">Loading your saved dashboard…</div> : <div className="custom-statistics-state" role="alert"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
  </section>
}
