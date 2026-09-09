import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isHandicapProgression,
  type HandicapProgressionPoint,
} from './handicapProgressionApi.ts'
import './HandicapProgressionChart.css'

type HandicapProgressionChartProps = {
  profileId: string
}

const WIDTH = 860
const HEIGHT = 330
const PADDING = { top: 28, right: 26, bottom: 54, left: 52 }

function chartDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function pointDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return isRecord(body) && typeof body.error === 'string'
    ? body.error
    : 'We could not load your Handicap Index journey.'
}

function HandicapProgressionChart({ profileId }: HandicapProgressionChartProps) {
  const [points, setPoints] = useState<HandicapProgressionPoint[]>([])
  const [activePoint, setActivePoint] = useState<HandicapProgressionPoint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProgression() {
      setIsLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch(
          '/api/users/me/handicap-progression',
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error(await readError(response))
        const body: unknown = await response.json()
        if (!isHandicapProgression(body)) {
          throw new Error('The Handicap Index journey returned was incomplete.')
        }
        setPoints(body)
        setActivePoint(body.at(-1) ?? null)
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'We could not load your Handicap Index journey.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void loadProgression()
    return () => controller.abort()
  }, [profileId, attempt])

  const chart = useMemo(() => {
    if (points.length === 0) return null
    const values = points.flatMap((point) => [point.scoreDifferential, point.handicapIndex])
    let minimum = Math.floor(Math.min(...values) - 1)
    let maximum = Math.ceil(Math.max(...values) + 1)
    if (maximum - minimum < 4) {
      minimum -= 2
      maximum += 2
    }
    const plotWidth = WIDTH - PADDING.left - PADDING.right
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
    const x = (index: number) => PADDING.left + (points.length === 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1))
    const y = (value: number) => PADDING.top + (maximum - value) * plotHeight / (maximum - minimum)
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const value = maximum - index * (maximum - minimum) / 4
      return { value, y: y(value) }
    })
    const line = (field: 'scoreDifferential' | 'handicapIndex') =>
      points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[field])}`).join(' ')
    return { x, y, ticks, differentialLine: line('scoreDifferential'), handicapLine: line('handicapIndex') }
  }, [points])

  return (
    <section className="handicap-chart" aria-labelledby="handicap-chart-title">
      <header>
        <div>
          <p className="form-kicker">Your progress</p>
          <h2 id="handicap-chart-title">Handicap Index journey</h2>
        </div>
        <p>Your latest 20 eligible rounds, shown oldest to newest.</p>
      </header>

      {isLoading ? <div className="handicap-chart-state" role="status">Building your chart…</div> : null}
      {!isLoading && error ? <div className="handicap-chart-state" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : null}
      {!isLoading && !error && points.length === 0 ? <div className="handicap-chart-state"><strong>Your journey begins with your first verified individual score.</strong><span>Team rounds and scorecards awaiting review remain in your history but do not appear here.</span></div> : null}

      {!isLoading && !error && chart ? (
        <>
          <div className="handicap-chart-legend" aria-label="Chart legend">
            <span><i className="handicap-chart-key handicap-chart-key-counting" />Counting differential</span>
            <span><i className="handicap-chart-key handicap-chart-key-other" />Other differential</span>
            <span><i className="handicap-chart-key handicap-chart-key-index" />Handicap Index</span>
          </div>
          <div className="handicap-chart-scroll">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Score differential and Handicap Index progression chart">
              {chart.ticks.map((tick) => <g key={tick.value}><line className="handicap-chart-grid" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={tick.y} y2={tick.y} /><text className="handicap-chart-axis" x={PADDING.left - 10} y={tick.y + 4} textAnchor="end">{tick.value.toFixed(1)}</text></g>)}
              <path className="handicap-chart-differential-line" d={chart.differentialLine} />
              <path className="handicap-chart-index-line" d={chart.handicapLine} />
              {points.map((point, index) => <g key={point.roundId}><circle className={point.countedAtTheTime ? 'handicap-chart-point handicap-chart-point-counting' : 'handicap-chart-point handicap-chart-point-other'} cx={chart.x(index)} cy={chart.y(point.scoreDifferential)} r="6" tabIndex={0} aria-label={`${pointDate(point.datePlayed)}, ${point.clubName}, differential ${point.scoreDifferential.toFixed(1)}, ${point.countedAtTheTime ? 'counting' : 'not counting'}`} onMouseEnter={() => setActivePoint(point)} onFocus={() => setActivePoint(point)} /><circle className="handicap-chart-index-point" cx={chart.x(index)} cy={chart.y(point.handicapIndex)} r="4" /><text className="handicap-chart-date" x={chart.x(index)} y={HEIGHT - 20} textAnchor="middle">{points.length <= 10 || index % 2 === 0 || index === points.length - 1 ? chartDate(point.datePlayed) : ''}</text></g>)}
            </svg>
          </div>
          {activePoint ? <div className="handicap-chart-detail" aria-live="polite"><div><small>{pointDate(activePoint.datePlayed)}</small><strong>{activePoint.clubName}</strong><span>{activePoint.courseName} · {activePoint.teeName}</span></div><dl><div><dt>Differential</dt><dd>{activePoint.scoreDifferential.toFixed(1)}</dd></div><div><dt>Index after round</dt><dd>{activePoint.handicapIndex.toFixed(1)}</dd></div><div><dt>Status then</dt><dd>{activePoint.countedAtTheTime ? 'Counting' : 'Not counting'}</dd></div></dl></div> : null}
        </>
      ) : null}
    </section>
  )
}

export default HandicapProgressionChart
