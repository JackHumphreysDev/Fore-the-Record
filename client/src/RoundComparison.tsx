import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildRoundComparisonPath,
  isRoundComparisonData,
  type RoundComparisonData,
  type RoundComparisonOption,
  type RoundComparisonSummary,
} from './roundComparisonApi.ts'
import './RoundComparison.css'

type Props = {
  profileId: string
  onOpenRound: (roundId: string) => void
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function formatToPar(value: number | null): string {
  if (value === null) return '—'
  if (value === 0) return 'E'
  return value > 0 ? `+${value}` : String(value)
}

function signed(value: number | null, suffix = ''): string {
  if (value === null) return '—'
  if (value === 0) return `No change${suffix}`
  return `${value > 0 ? '+' : ''}${value}${suffix}`
}

function formatStatistic(value: number | null, unit: 'NUMBER' | 'PERCENTAGE'): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}${unit === 'PERCENTAGE' ? '%' : ''}`
}

function layoutLabel(round: RoundComparisonOption): string {
  if (round.holeCount === 18) return '18 holes'
  return round.nineHoleSegment === 'FRONT_NINE' ? 'Front 9' : 'Back 9'
}

function optionLabel(round: RoundComparisonOption): string {
  return `${dateLabel(round.datePlayed)} — ${round.clubName} — ${round.teeName} — ${layoutLabel(round)}`
}

function isCompatible(left: RoundComparisonOption, right: RoundComparisonOption): boolean {
  return left.id !== right.id && left.courseId === right.courseId &&
    left.holeCount === right.holeCount && left.nineHoleSegment === right.nineHoleSegment
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
    ? body.error
    : 'We could not compare those rounds.'
}

function RoundIdentity({ title, round, onOpen }: {
  title: string
  round: RoundComparisonSummary
  onOpen: () => void
}) {
  return <article className="comparison-round-card">
    <span>{title}</span>
    <strong>{dateLabel(round.datePlayed)}</strong>
    <p>{round.clubName}<small>{round.courseName} · {round.teeName} · {layoutLabel(round)}</small></p>
    <dl>
      <div><dt>Gross</dt><dd>{round.grossScore ?? '—'}</dd></div>
      <div><dt>To par</dt><dd>{formatToPar(round.scoreToPar)}</dd></div>
      <div><dt>Differential</dt><dd>{round.scoreDifferential?.toFixed(1) ?? '—'}</dd></div>
      <div><dt>Index after</dt><dd>{round.handicapIndexAfter?.toFixed(1) ?? '—'}</dd></div>
      <div><dt>Front 9</dt><dd>{round.frontNine ?? '—'}</dd></div>
      <div><dt>Back 9</dt><dd>{round.backNine ?? '—'}</dd></div>
    </dl>
    <small>{round.countedAtTheTime === null ? 'No Handicap Index was available after this round' : round.countedAtTheTime ? 'Counted in the Handicap Index at the time' : 'Did not count in the Handicap Index at the time'}</small>
    <button type="button" onClick={onOpen}>Open complete round in History →</button>
  </article>
}

function RoundComparison({ profileId, onOpenRound }: Props) {
  const [data, setData] = useState<RoundComparisonData | null>(null)
  const [baselineId, setBaselineId] = useState('')
  const [comparedId, setComparedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (Boolean(baselineId) !== Boolean(comparedId)) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch(
          buildRoundComparisonPath(baselineId || undefined, comparedId || undefined),
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error(await readError(response))
        const body: unknown = await response.json()
        if (!isRoundComparisonData(body)) throw new Error('The round comparison returned was incomplete.')
        if (!controller.signal.aborted) {
          setData(body)
          setBaselineId(body.selected.baselineRoundId ?? '')
          setComparedId(body.selected.comparedRoundId ?? '')
        }
      } catch (caught: unknown) {
        if (controller.signal.aborted) return
        setError(caught instanceof Error ? caught.message : 'We could not compare those rounds.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, baselineId, comparedId, profileId])

  const baseline = data?.options.find((round) => round.id === baselineId)
  const comparedOptions = useMemo(() => baseline
    ? data?.options.filter((round) => isCompatible(baseline, round)) ?? []
    : [], [baseline, data])
  const comparison = data?.comparison

  function changeBaseline(nextId: string) {
    const next = data?.options.find((round) => round.id === nextId)
    const compatible = next ? data?.options.filter((round) => isCompatible(next, round)) ?? [] : []
    setBaselineId(nextId)
    setComparedId(compatible.some((round) => round.id === comparedId) ? comparedId : compatible[0]?.id ?? '')
  }

  return <section className="round-comparison" aria-labelledby="round-comparison-title">
    <header className="round-comparison-heading">
      <div><p className="form-kicker">One card against another</p><h2 id="round-comparison-title">Round comparison.</h2></div>
      <p>Choose two verified individual rounds from the same course and see exactly where the result changed.</p>
    </header>

    {error ? <div className="round-comparison-state" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : null}
    {!error && loading && !data ? <div className="round-comparison-state" role="status">Finding comparable rounds…</div> : null}
    {!error && data && data.options.length < 2 ? <div className="round-comparison-state"><strong>Two comparable rounds are needed.</strong><p>Log verified individual rounds on the same course and hole layout to make your first comparison.</p></div> : null}
    {!error && data && data.options.length >= 2 ? <>
      <div className="round-comparison-pickers">
        <label>Baseline round<select value={baselineId} onChange={(event) => changeBaseline(event.target.value)}><option value="">Choose a round</option>{data.options.map((round) => <option key={round.id} value={round.id}>{optionLabel(round)}</option>)}</select></label>
        <span aria-hidden="true">versus</span>
        <label>Compared round<select value={comparedId} disabled={!baselineId} onChange={(event) => setComparedId(event.target.value)}><option value="">Choose a compatible round</option>{comparedOptions.map((round) => <option key={round.id} value={round.id}>{optionLabel(round)}</option>)}</select></label>
      </div>
      {!comparison && !loading ? <div className="round-comparison-state"><strong>No compatible pair selected.</strong><p>Choose two different rounds from the same course and the same 18-hole, Front 9, or Back 9 layout.</p></div> : null}
      {comparison ? <>
        <div className="round-comparison-overview">
          <RoundIdentity title="Baseline" round={comparison.baseline} onOpen={() => onOpenRound(comparison.baseline.id)} />
          <article className="comparison-change-card">
            <span>Compared result</span>
            <strong>{comparison.grossChange === null ? 'Score unavailable' : comparison.grossChange < 0 ? `${Math.abs(comparison.grossChange)} shots better` : comparison.grossChange > 0 ? `${comparison.grossChange} shots higher` : 'Same gross score'}</strong>
            <dl><div><dt>Holes gained</dt><dd>{comparison.gainedHoles}</dd></div><div><dt>Holes lost</dt><dd>{comparison.lostHoles}</dd></div><div><dt>Comparable holes</dt><dd>{comparison.matchedHoles}</dd></div><div><dt>Net hole change</dt><dd>{signed(comparison.netStrokeChange)}</dd></div>{comparison.stablefordChange !== null ? <div><dt>Stableford change</dt><dd>{signed(comparison.stablefordChange, ' pts')}</dd></div> : null}</dl>
          </article>
          <RoundIdentity title="Compared" round={comparison.compared} onOpen={() => onOpenRound(comparison.compared.id)} />
        </div>

        <section className="comparison-statistics" aria-labelledby="comparison-statistics-title"><header><h3 id="comparison-statistics-title">Detailed-stat changes</h3><p>A dash means the statistic was not completely recorded; it is never treated as zero.</p></header><div>
          {comparison.statistics.map((item) => <article key={item.metric}><span>{item.label}</span><div><strong>{formatStatistic(item.baselineValue, item.unit)}</strong><b>→</b><strong>{formatStatistic(item.comparedValue, item.unit)}</strong></div><em>{item.change === null ? 'Not comparable' : item.change === 0 ? 'No change' : `${item.change > 0 ? '+' : ''}${item.change.toFixed(1)}${item.unit === 'PERCENTAGE' ? ' pts' : ''}`}</em><small>{item.baselineObservations} vs {item.comparedObservations} recorded observations</small></article>)}
        </div></section>

        <section className="comparison-holes" aria-labelledby="comparison-holes-title"><header><h3 id="comparison-holes-title">Hole-by-hole change</h3><p>Negative changes mean fewer strokes in the compared round.</p></header><div className="comparison-table-scroll"><table><thead><tr><th>Hole</th><th>Baseline par</th><th>Baseline score</th><th>Compared par</th><th>Compared score</th><th>Change</th><th>Result</th></tr></thead><tbody>
          {comparison.holes.map((hole) => <tr key={hole.holeNumber}><th>{hole.holeNumber}</th><td>{hole.baselinePar}</td><td>{hole.baselinePickedUp ? 'Picked up' : hole.baselineStrokes}</td><td>{hole.comparedPar}</td><td>{hole.comparedPickedUp ? 'Picked up' : hole.comparedStrokes}</td><td>{hole.change === null ? '—' : signed(hole.change)}</td><td><span className={`comparison-result result-${hole.result.toLowerCase()}`}>{hole.result === 'GAINED' ? 'Gained' : hole.result === 'LOST' ? 'Lost' : hole.result === 'SAME' ? 'Same' : 'Unavailable'}</span></td></tr>)}
        </tbody></table></div></section>
        <p className="round-comparison-note">This is a factual comparison of your private record. Pickups and missing details stay unavailable, and no saved score or Handicap Index is changed.</p>
      </> : null}
    </> : null}
  </section>
}

export default RoundComparison
