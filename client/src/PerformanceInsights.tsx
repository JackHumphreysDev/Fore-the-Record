import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildPerformanceInsightsPath,
  isPerformanceInsightsData,
  type InsightDirection,
  type InsightHolePoint,
  type InsightTrend,
  type PerformanceInsightsData,
} from './performanceInsightsApi.ts'
import './PerformanceInsights.css'

type PerformanceInsightsProps = {
  profileId: string
  onOpenRound: (roundId: string) => void
}

const WIDTH = 860
const HEIGHT = 310
const PADDING = { top: 28, right: 28, bottom: 54, left: 48 }

function formatNumber(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

function formatToPar(value: number | null): string {
  if (value === null) return '—'
  if (value === 0) return 'E'
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
}

function directionLabel(direction: InsightDirection): string {
  if (direction === 'IMPROVING') return 'Improving'
  if (direction === 'DECLINING') return 'Needs attention'
  if (direction === 'STEADY') return 'Holding steady'
  return 'More rounds needed'
}

function directionClass(direction: InsightDirection): string {
  return direction.toLowerCase().replace('_', '-')
}

function trendText(trend: InsightTrend, suffix: string): string {
  if (trend.previousAverage === null) {
    return `${trend.recentSample} of 5 recent ${trend.recentSample === 1 ? 'round' : 'rounds'} recorded`
  }
  return `${formatNumber(trend.recentAverage)} vs ${formatNumber(trend.previousAverage)} ${suffix}`
}

function roundDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

function scoreLabel(toPar: number | null): string {
  if (toPar === null) return 'Picked up — no score assumed'
  if (toPar <= -2) return toPar === -2 ? 'Eagle' : `${Math.abs(toPar)} under par`
  if (toPar === -1) return 'Birdie'
  if (toPar === 0) return 'Par'
  if (toPar === 1) return 'Bogey'
  if (toPar === 2) return 'Double bogey'
  return `+${toPar} on the hole`
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
    ? body.error
    : 'We could not load your performance insights.'
}

function PerformanceInsights({ profileId, onOpenRound }: PerformanceInsightsProps) {
  const [insights, setInsights] = useState<PerformanceInsightsData | null>(null)
  const [courseId, setCourseId] = useState('')
  const [teeId, setTeeId] = useState('')
  const [hole, setHole] = useState<number | undefined>()
  const [activePoint, setActivePoint] = useState<InsightHolePoint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch(buildPerformanceInsightsPath(teeId || undefined, hole), { signal: controller.signal })
        if (!response.ok) throw new Error(await readError(response))
        const body: unknown = await response.json()
        if (!isPerformanceInsightsData(body)) throw new Error('The performance insights returned were incomplete.')
        if (!controller.signal.aborted) {
          setInsights(body)
          setActivePoint(body.holeExplorer.points.at(-1) ?? null)
        }
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'We could not load your performance insights.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, hole, profileId, teeId])

  const courses = useMemo(() => [...new Map((insights?.holeExplorer.tees ?? []).map((tee) => [tee.courseId, {
    id: tee.courseId,
    name: tee.courseName,
    clubName: tee.clubName,
  }])).values()], [insights])
  const tees = insights?.holeExplorer.tees.filter((tee) => tee.courseId === courseId) ?? []
  const selectedTee = insights?.holeExplorer.tees.find((tee) => tee.id === teeId)
  const rankedPar = (insights?.parPerformance ?? []).filter((item) => item.averageToPar !== null && item.holes > 0)
    .sort((left, right) => left.averageToPar! - right.averageToPar!)
  const front = insights?.ninePerformance.find((item) => item.segment === 'FRONT_NINE')
  const back = insights?.ninePerformance.find((item) => item.segment === 'BACK_NINE')

  const chart = useMemo(() => {
    const definition = insights?.holeExplorer.definition
    const points = insights?.holeExplorer.points ?? []
    if (!definition || points.length === 0) return null
    const scored = points.flatMap((point) => point.strokes === null ? [] : [point.strokes])
    const values = [...scored, definition.par, ...(insights?.holeExplorer.averageStrokes === null ? [] : [insights!.holeExplorer.averageStrokes])]
    let minimum = Math.max(0, Math.floor(Math.min(...values) - 1))
    let maximum = Math.ceil(Math.max(...values) + 1)
    if (maximum - minimum < 4) { minimum = Math.max(0, minimum - 1); maximum += 2 }
    const plotWidth = WIDTH - PADDING.left - PADDING.right
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
    const x = (index: number) => PADDING.left + (points.length === 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1))
    const y = (value: number) => PADDING.top + (maximum - value) * plotHeight / (maximum - minimum)
    const ticks = Array.from({ length: maximum - minimum + 1 }, (_, index) => maximum - index).map((value) => ({ value, y: y(value) }))
    const paths: string[] = []
    let path = ''
    points.forEach((point, index) => {
      if (point.strokes === null) { if (path) paths.push(path); path = ''; return }
      path += `${path ? ' L' : 'M'} ${x(index)} ${y(point.strokes)}`
    })
    if (path) paths.push(path)
    return { x, y, ticks, paths, parY: y(definition.par), averageY: insights?.holeExplorer.averageStrokes === null ? null : y(insights!.holeExplorer.averageStrokes) }
  }, [insights])

  return (
    <section className="performance-insights" aria-labelledby="performance-insights-title">
      <header className="performance-insights-heading">
        <div><p className="form-kicker">Patterns behind the card</p><h2 id="performance-insights-title">Performance insights.</h2></div>
        <p>Private analysis from verified individual rounds. Team rounds and scorecards awaiting review are excluded.</p>
      </header>

      {isLoading && !insights ? <div className="performance-insights-state" role="status">Reading your playing record…</div> : null}
      {error ? <div className="performance-insights-state" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : null}
      {!error && insights ? insights.qualifyingRounds === 0 ? <div className="performance-insights-state"><strong>Your insights begin with a verified individual round.</strong></div> : <>
        <div className="performance-insights-trends">
          {[{ title: 'Stroke play form', trend: insights.strokePlayTrend, suffix: 'gross' }, { title: 'Stableford form', trend: insights.stablefordTrend, suffix: 'points' }].map(({ title, trend, suffix }) => <article key={title}>
            <span>{title}</span><strong className={`insight-direction insight-direction-${directionClass(trend.direction)}`}>{directionLabel(trend.direction)}</strong>
            <p>{trendText(trend, suffix)}</p><small>Latest five complete 18-hole rounds compared with the previous five.</small>
          </article>)}
          <article><span>Stroke-play consistency</span><strong>{insights.consistency.level === 'INSUFFICIENT_DATA' ? 'More rounds needed' : insights.consistency.level.toLowerCase()}</strong>
            <p>{insights.consistency.range ? `${insights.consistency.range.lowest}–${insights.consistency.range.highest} gross` : 'No complete score range yet'}</p>
            <small>{insights.consistency.rounds} complete rounds · {formatNumber(insights.consistency.standardDeviation)} standard deviation</small>
          </article>
        </div>

        <div className="performance-insights-breakdown">
          <article><span>Strongest par type</span><strong>{rankedPar[0] ? `Par ${rankedPar[0].par}` : '—'}</strong><p>{rankedPar[0] ? `${formatToPar(rankedPar[0].averageToPar)} average across ${rankedPar[0].holes} holes` : 'Score more holes to compare'}</p></article>
          <article><span>Weakest par type</span><strong>{rankedPar.at(-1) ? `Par ${rankedPar.at(-1)!.par}` : '—'}</strong><p>{rankedPar.at(-1) ? `${formatToPar(rankedPar.at(-1)!.averageToPar)} average across ${rankedPar.at(-1)!.holes} holes` : 'Score more holes to compare'}</p></article>
          <article><span>Front nine</span><strong>{formatToPar(front?.averageToPar ?? null)}</strong><p>{front?.nines ?? 0} complete nines</p></article>
          <article><span>Back nine</span><strong>{formatToPar(back?.averageToPar ?? null)}</strong><p>{back?.nines ?? 0} complete nines</p></article>
        </div>

        <div className="performance-insights-venues">
          <div><span>Strongest stroke-play course and tee</span>{insights.bestVenues.strokePlay ? <><strong>{insights.bestVenues.strokePlay.clubName}</strong><p>{insights.bestVenues.strokePlay.courseName} · {insights.bestVenues.strokePlay.teeName} · {insights.bestVenues.strokePlay.average.toFixed(1)} average from {insights.bestVenues.strokePlay.rounds} rounds</p></> : <p>At least two complete rounds on the same tee are needed.</p>}</div>
          <div><span>Strongest Stableford course and tee</span>{insights.bestVenues.stableford ? <><strong>{insights.bestVenues.stableford.clubName}</strong><p>{insights.bestVenues.stableford.courseName} · {insights.bestVenues.stableford.teeName} · {insights.bestVenues.stableford.average.toFixed(1)} points from {insights.bestVenues.stableford.rounds} rounds</p></> : <p>At least two complete rounds on the same tee are needed.</p>}</div>
        </div>

        <section className="hole-insights" aria-labelledby="hole-insights-title">
          <header><div><p className="form-kicker">Hole Performance History</p><h3 id="hole-insights-title">See how one hole has changed.</h3></div><p>Choose a course, tee and hole. Each point links back to its complete round in History.</p></header>
          <div className="hole-insights-filters">
            <label>Course<select value={courseId} onChange={(event) => { setCourseId(event.target.value); setTeeId(''); setHole(undefined); setActivePoint(null) }}><option value="">Choose a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.clubName} — {course.name}</option>)}</select></label>
            <label>Tee<select value={teeId} disabled={!courseId} onChange={(event) => { setTeeId(event.target.value); setHole(undefined); setActivePoint(null) }}><option value="">Choose a tee</option>{tees.map((tee) => <option key={tee.id} value={tee.id}>{tee.name}</option>)}</select></label>
            <label>Hole<select value={hole ?? ''} disabled={!teeId} onChange={(event) => setHole(event.target.value ? Number(event.target.value) : undefined)}><option value="">Choose a hole</option>{selectedTee?.holes.map((item) => <option key={item.holeNumber} value={item.holeNumber}>Hole {item.holeNumber} · Par {item.par}</option>)}</select></label>
          </div>

          {!teeId || hole === undefined ? <div className="hole-insights-empty">Select a tee and hole to build its score history.</div> : isLoading ? <div className="hole-insights-empty" role="status">Plotting this hole…</div> : chart && insights.holeExplorer.definition ? <>
            <dl className="hole-insights-summary"><div><dt>Hole</dt><dd>{insights.holeExplorer.definition.holeNumber}</dd></div><div><dt>Par / SI</dt><dd>{insights.holeExplorer.definition.par} / {insights.holeExplorer.definition.strokeIndex}</dd></div><div><dt>Yardage</dt><dd>{insights.holeExplorer.definition.yardage ?? '—'}</dd></div><div><dt>Average</dt><dd>{formatNumber(insights.holeExplorer.averageStrokes)}</dd></div><div><dt>Trend</dt><dd>{directionLabel(insights.holeExplorer.direction)}</dd></div></dl>
            <div className="hole-insights-legend"><span><i className="hole-key hole-key-score" />Recorded strokes</span><span><i className="hole-key hole-key-par" />Par</span><span><i className="hole-key hole-key-average" />Average</span><span><i className="hole-key hole-key-pickup" />Picked up</span></div>
            <div className="hole-insights-chart-scroll"><svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Hole ${hole} score history`}>
              {chart.ticks.map((tick) => <g key={tick.value}><line className="hole-chart-grid" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={tick.y} y2={tick.y} /><text className="hole-chart-axis" x={PADDING.left - 10} y={tick.y + 4} textAnchor="end">{tick.value}</text></g>)}
              <line className="hole-chart-par" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={chart.parY} y2={chart.parY} />
              {chart.averageY === null ? null : <line className="hole-chart-average" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={chart.averageY} y2={chart.averageY} />}
              {chart.paths.map((path, index) => <path className="hole-chart-line" d={path} key={`${path}-${index}`} />)}
              {insights.holeExplorer.points.map((point, index) => <g key={point.roundId}>{point.strokes === null ? <text className="hole-chart-pickup" x={chart.x(index)} y={HEIGHT - PADDING.bottom - 4} textAnchor="middle" tabIndex={0} onFocus={() => setActivePoint(point)} onMouseEnter={() => setActivePoint(point)}>×</text> : <circle className="hole-chart-point" cx={chart.x(index)} cy={chart.y(point.strokes)} r="6" tabIndex={0} onFocus={() => setActivePoint(point)} onMouseEnter={() => setActivePoint(point)} />}<text className="hole-chart-date" x={chart.x(index)} y={HEIGHT - 20} textAnchor="middle">{insights.holeExplorer.points.length <= 9 || index % 2 === 0 || index === insights.holeExplorer.points.length - 1 ? roundDate(point.datePlayed).replace(/ \d{4}$/, '') : ''}</text></g>)}
            </svg></div>
            {activePoint ? <div className="hole-insights-detail" aria-live="polite"><div><small>{roundDate(activePoint.datePlayed)}</small><strong>{activePoint.strokes === null ? 'Picked up' : `${activePoint.strokes} strokes`}</strong><span>{scoreLabel(activePoint.toPar)}</span></div><button type="button" onClick={() => onOpenRound(activePoint.roundId)}>Open round in History →</button></div> : null}
          </> : <div className="hole-insights-empty">No recorded score is available for that hole yet.</div>}
          <p className="hole-insights-note">Picked-up holes are shown as missing and excluded from averages and trends. No stroke score is ever invented.</p>
        </section>
      </> : null}
    </section>
  )
}

export default PerformanceInsights
