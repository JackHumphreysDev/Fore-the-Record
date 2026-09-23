import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildPerformanceAnalysisPath,
  isPerformanceAnalysisData,
  type AnalysisAverage,
  type PerformanceAnalysisData,
  type PerformanceAnalysisFilters,
} from './performanceAnalysisApi.ts'
import './PerformanceAnalysis.css'

type DateRange = '30_DAYS' | '90_DAYS' | '12_MONTHS' | 'ALL_TIME' | 'CUSTOM'

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function presetDates(range: DateRange): Pick<PerformanceAnalysisFilters, 'from' | 'to'> {
  if (range === 'ALL_TIME' || range === 'CUSTOM') return {}
  const end = new Date()
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  if (range === '30_DAYS') start.setUTCDate(start.getUTCDate() - 29)
  if (range === '90_DAYS') start.setUTCDate(start.getUTCDate() - 89)
  if (range === '12_MONTHS') {
    start.setUTCFullYear(start.getUTCFullYear() - 1)
    start.setUTCDate(start.getUTCDate() + 1)
  }
  return { from: isoDate(start), to: isoDate(end) }
}

function formatAverage(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

function formatToPar(value: number | null): string {
  if (value === null) return '—'
  if (value === 0) return 'E'
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
}

function formatPercentage(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

function sampleLabel(value: AnalysisAverage): string {
  return `${value.scoredRounds} scored of ${value.rounds} qualifying ${value.rounds === 1 ? 'round' : 'rounds'}`
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return 'We could not load your performance analysis.'
}

function PerformanceAnalysis({ profileId }: { profileId: string }) {
  const [analysis, setAnalysis] = useState<PerformanceAnalysisData | null>(null)
  const [range, setRange] = useState<DateRange>('ALL_TIME')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [courseId, setCourseId] = useState('')
  const [teeId, setTeeId] = useState('')
  const [category, setCategory] = useState<'' | 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'>('')
  const [holeCount, setHoleCount] = useState<'' | 9 | 18>('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const filters = useMemo<PerformanceAnalysisFilters>(() => ({
    ...(range === 'CUSTOM'
      ? { ...(customFrom ? { from: customFrom } : {}), ...(customTo ? { to: customTo } : {}) }
      : presetDates(range)),
    ...(courseId ? { courseId } : {}),
    ...(teeId ? { teeId } : {}),
    ...(category ? { category } : {}),
    ...(holeCount ? { holeCount } : {}),
  }), [category, courseId, customFrom, customTo, holeCount, range, teeId])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError('')
      try {
        const response = await authenticatedFetch(buildPerformanceAnalysisPath(filters), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(await readError(response))
        const body: unknown = await response.json()
        if (!isPerformanceAnalysisData(body)) throw new Error('The performance analysis returned was incomplete.')
        if (!controller.signal.aborted) setAnalysis(body)
      } catch (loadError: unknown) {
        if (controller.signal.aborted) return
        setError(loadError instanceof Error ? loadError.message : 'We could not load your performance analysis.')
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, filters, profileId])

  const availableTees = analysis?.options.tees.filter((tee) => !courseId || tee.courseId === courseId) ?? []

  return (
    <section className="performance-analysis" aria-labelledby="analysis-title">
      <header className="performance-analysis-heading">
        <div>
          <p className="form-kicker">Read the shape of your game</p>
          <h2 id="analysis-title">Performance analysis.</h2>
        </div>
        <p>Compare scoring averages across the rounds, courses and holes that make up your record.</p>
      </header>

      <div className="performance-analysis-filters" aria-label="Performance filters">
        <label>Date range<select value={range} onChange={(event) => setRange(event.target.value as DateRange)}>
          <option value="30_DAYS">Last 30 days</option><option value="90_DAYS">Last 90 days</option>
          <option value="12_MONTHS">Last 12 months</option><option value="ALL_TIME">All time</option>
          <option value="CUSTOM">Custom dates</option>
        </select></label>
        <label>Course<select value={courseId} onChange={(event) => { setCourseId(event.target.value); setTeeId('') }}>
          <option value="">All courses</option>
          {analysis?.options.courses.map((course) => <option key={course.id} value={course.id}>{course.clubName} — {course.name}</option>)}
        </select></label>
        <label>Tee<select value={teeId} onChange={(event) => setTeeId(event.target.value)}>
          <option value="">All tees</option>
          {availableTees.map((tee) => <option key={tee.id} value={tee.id}>{tee.clubName} — {tee.courseName} — {tee.name}</option>)}
        </select></label>
        <label>Round type<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
          <option value="">All round types</option><option value="CASUAL">Casual only</option>
          <option value="COMPETITION">Competition only</option><option value="SOCIAL_GAME">Games with friends only</option>
        </select></label>
        <label>Round length<select value={holeCount} onChange={(event) => setHoleCount(event.target.value === '' ? '' : Number(event.target.value) as 9 | 18)}><option value="">All lengths</option><option value="9">9 holes</option><option value="18">18 holes</option></select></label>
        {range === 'CUSTOM' ? <>
          <label>From<input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => setCustomFrom(event.target.value)} /></label>
          <label>To<input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => setCustomTo(event.target.value)} /></label>
        </> : null}
      </div>

      {error ? <div className="performance-analysis-state" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : null}
      {!error && !analysis ? <div className="performance-analysis-state" aria-live="polite">Calculating your averages…</div> : null}
      {!error && analysis ? analysis.overall.rounds === 0 ? (
        <div className="performance-analysis-state"><strong>No qualifying rounds found.</strong><p>Adjust the filters or log an individual round to begin your analysis.</p></div>
      ) : <>
        <dl className="performance-analysis-overview">
          <div><dt>Qualifying rounds</dt><dd>{analysis.overall.rounds}</dd><small>Verified individual rounds</small></div>
          <div><dt>Average gross</dt><dd>{formatAverage(analysis.overall.averageGrossScore)}</dd><small>{sampleLabel(analysis.overall)}</small></div>
          <div><dt>Average to par</dt><dd>{formatToPar(analysis.overall.averageToPar)}</dd><small>{analysis.overall.relativeToParRounds} rounds with known par</small></div>
        </dl>

        <section className="detailed-statistics" aria-labelledby="detailed-statistics-title">
          <header><div><p className="form-kicker">Optional playing data</p><h3 id="detailed-statistics-title">Detailed round statistics</h3></div><p>Each figure uses only the holes or complete rounds where that detail was recorded.</p></header>
          <div className="detailed-statistics-grid">
            <article><span>Putts per round</span><strong>{formatAverage(analysis.detailedStatistics.putts.averagePerRound)}</strong><small>{analysis.detailedStatistics.putts.completeRounds} complete {analysis.detailedStatistics.putts.completeRounds === 1 ? 'round' : 'rounds'}</small></article>
            <article><span>Putts per hole</span><strong>{formatAverage(analysis.detailedStatistics.putts.averagePerHole)}</strong><small>{analysis.detailedStatistics.putts.holes} recorded holes</small></article>
            <article><span>Three-putt frequency</span><strong>{formatPercentage(analysis.detailedStatistics.putts.threePuttPercentage)}</strong><small>{analysis.detailedStatistics.putts.threePutts} of {analysis.detailedStatistics.putts.holes} recorded holes</small></article>
            <article><span>Fairways hit</span><strong>{formatPercentage(analysis.detailedStatistics.fairways.hitPercentage)}</strong><small>{analysis.detailedStatistics.fairways.hits} of {analysis.detailedStatistics.fairways.holes} applicable holes</small></article>
            <article><span>Miss tendency</span><strong>{formatPercentage(analysis.detailedStatistics.fairways.missedLeftPercentage)} L · {formatPercentage(analysis.detailedStatistics.fairways.missedRightPercentage)} R</strong><small>{analysis.detailedStatistics.fairways.holes} recorded tee shots</small></article>
            <article><span>Greens in regulation</span><strong>{formatPercentage(analysis.detailedStatistics.greens.percentage)}</strong><small>{analysis.detailedStatistics.greens.hits} of {analysis.detailedStatistics.greens.holes} recorded holes</small></article>
            <article><span>Scrambling</span><strong>{formatPercentage(analysis.detailedStatistics.scrambling.percentage)}</strong><small>{analysis.detailedStatistics.scrambling.successful} of {analysis.detailedStatistics.scrambling.attempts} attempts</small></article>
            <article><span>Penalties per round</span><strong>{formatAverage(analysis.detailedStatistics.penalties.averagePerRound)}</strong><small>{analysis.detailedStatistics.penalties.completeRounds} complete {analysis.detailedStatistics.penalties.completeRounds === 1 ? 'round' : 'rounds'}</small></article>
            <article><span>Bunker visits per round</span><strong>{formatAverage(analysis.detailedStatistics.bunkers.averagePerRound)}</strong><small>{analysis.detailedStatistics.bunkers.completeRounds} complete {analysis.detailedStatistics.bunkers.completeRounds === 1 ? 'round' : 'rounds'}</small></article>
          </div>
        </section>

        <div className="performance-analysis-grid">
          <section><header><h3>By par type</h3><p>Picked-up holes are excluded.</p></header><div className="analysis-card-row">
            {analysis.byParType.map((item) => <article key={item.par}><span>Par {item.par}</span><strong>{formatAverage(item.averageStrokes)}</strong><em>{formatToPar(item.averageToPar)} average</em><small>{item.holes} scored holes</small></article>)}
          </div></section>
          <section><header><h3>Front and back nine</h3><p>Only complete nine-hole scores count.</p></header><div className="analysis-card-row">
            {analysis.byNine.map((item) => <article key={item.segment}><span>{item.segment === 'FRONT_NINE' ? 'Front nine' : 'Back nine'}</span><strong>{formatAverage(item.averageGrossScore)}</strong><em>{formatToPar(item.averageToPar)} average</em><small>{item.nines} complete nines</small></article>)}
          </div></section>
          <section><header><h3>By round type</h3><p>See how the occasion changes your scoring.</p></header><div className="analysis-card-row">
            {analysis.byCategory.map((item) => <article key={item.category}><span>{item.category === 'CASUAL' ? 'Casual rounds' : item.category === 'COMPETITION' ? 'Competitions' : 'Games with friends'}</span><strong>{formatAverage(item.averageGrossScore)}</strong><em>{formatToPar(item.averageToPar)} average</em><small>{sampleLabel(item)}</small></article>)}
          </div></section>
        </div>

        <div className="performance-analysis-tables">
          <section><header><h3>Course averages</h3><p>{analysis.byCourse.length} matching {analysis.byCourse.length === 1 ? 'course' : 'courses'}</p></header><div className="analysis-table-scroll"><table><thead><tr><th>Course</th><th>Rounds</th><th>Average gross</th><th>Average to par</th></tr></thead><tbody>
            {analysis.byCourse.map((item) => <tr key={item.courseId}><th><strong>{item.clubName}</strong><small>{item.courseName}</small></th><td>{item.rounds}</td><td>{formatAverage(item.averageGrossScore)}<small>{item.scoredRounds} scored</small></td><td>{formatToPar(item.averageToPar)}<small>{item.relativeToParRounds} with par</small></td></tr>)}
          </tbody></table></div></section>
          <section><header><h3>Tee averages</h3><p>{analysis.byTee.length} matching {analysis.byTee.length === 1 ? 'tee' : 'tees'}</p></header><div className="analysis-table-scroll"><table><thead><tr><th>Tee</th><th>Rounds</th><th>Average gross</th><th>Average to par</th></tr></thead><tbody>
            {analysis.byTee.map((item) => <tr key={item.teeId}><th><strong>{item.teeName}</strong><small>{item.clubName} · {item.courseName}</small></th><td>{item.rounds}</td><td>{formatAverage(item.averageGrossScore)}<small>{item.scoredRounds} scored</small></td><td>{formatToPar(item.averageToPar)}<small>{item.relativeToParRounds} with par</small></td></tr>)}
          </tbody></table></div></section>
        </div>
        <p className="performance-analysis-note">Team and record-only rounds are excluded. A picked-up hole never contributes an invented stroke score.</p>
      </> : null}
    </section>
  )
}

export default PerformanceAnalysis
