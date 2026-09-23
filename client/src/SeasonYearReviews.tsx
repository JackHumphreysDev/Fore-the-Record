import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildSeasonYearReviewsPath,
  isSeasonYearReviewsResponse,
  type NotableReviewRound,
  type ReviewSeason,
  type SeasonYearReviewsResponse,
} from './seasonYearReviewsApi.ts'
import './SeasonYearReviews.css'

type Props = { profileId: string; onOpenRound: (roundId: string) => void }

function signed(value: number): string {
  if (value === 0) return 'No change'
  return `${value > 0 ? '+' : ''}${value.toLocaleString('en-GB')}`
}

function date(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`))
}

function index(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

async function errorMessage(response: Response) {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
    ? body.error : 'We could not build your season review.'
}

function NotableCard({ title, round, suffix, onOpen }: {
  title: string
  round: NotableReviewRound | null
  suffix?: string
  onOpen: (roundId: string) => void
}) {
  return <article>
    <span>{title}</span>
    {round ? <><strong>{round.value.toFixed(title === 'Best differential' ? 1 : 0)}{suffix ?? ''}</strong><small>{round.clubName} · {round.courseName}<br />{round.teeName} tee · {date(round.datePlayed)}</small><button type="button" onClick={() => onOpen(round.roundId)}>Open round →</button></> : <><strong>—</strong><small>No matching round in this period</small></>}
  </article>
}

export default function SeasonYearReviews({ profileId, onOpenRound }: Props) {
  const [data, setData] = useState<SeasonYearReviewsResponse | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [season, setSeason] = useState<ReviewSeason>('ALL')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError('')
      try {
        const response = await authenticatedFetch(buildSeasonYearReviewsPath(selectedYear, season), { signal: controller.signal })
        if (!response.ok) throw new Error(await errorMessage(response))
        const body: unknown = await response.json()
        if (!isSeasonYearReviewsResponse(body)) throw new Error('The season review returned was incomplete.')
        if (!controller.signal.aborted) {
          setData(body)
          if (selectedYear === null) setSelectedYear(body.selected.year)
        }
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'We could not build your season review.')
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, profileId, season, selectedYear])

  const metrics = useMemo(() => data ? [
    ['Rounds', data.review.roundsPlayed, data.previous.roundsPlayed],
    ['Holes', data.review.holesPlayed, data.previous.holesPlayed],
    ['Shots', data.review.totalShots, data.previous.totalShots],
    ['Recorded yards', data.review.yardsCovered, data.previous.yardsCovered],
    ['Eagles', data.review.eagles, data.previous.eagles],
    ['Birdies', data.review.birdies, data.previous.birdies],
    ['Pars', data.review.pars, data.previous.pars],
    ['Bogeys', data.review.bogeys, data.previous.bogeys],
  ] as const : [], [data])
  const selectedSeason = data?.options.seasons.find(({ id }) => id === season)
  const yearOptions = data && data.options.years.length > 0 ? data.options.years : selectedYear === null ? [] : [selectedYear]

  return <section className="season-reviews" aria-labelledby="season-reviews-title">
    <header className="season-reviews-heading">
      <div><p className="form-kicker">Your year in golf</p><h2 id="season-reviews-title">Season and year reviews.</h2></div>
      <p>Choose any recorded year and review the full year or one season against the same period a year earlier.</p>
    </header>
    <div className="season-review-filters">
      <label>Year<select value={selectedYear ?? ''} onChange={(event) => setSelectedYear(Number(event.target.value))} disabled={yearOptions.length === 0}>{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      <label>Season<select value={season} onChange={(event) => setSeason(event.target.value as ReviewSeason)}>{data?.options.seasons.map((option) => <option key={option.id} value={option.id}>{option.name}</option>) ?? <option value="ALL">Full year</option>}</select></label>
      <p>{selectedSeason?.months ?? 'January to December'} · compared with {data?.previous.year ?? 'the previous year'}</p>
    </div>
    {error ? <div className="season-review-state" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : null}
    {!error && !data ? <div className="season-review-state" aria-live="polite">Building your review…</div> : null}
    {!error && data ? data.review.roundsPlayed === 0 ? <div className="season-review-state"><strong>No verified individual rounds in this period.</strong><p>Choose another year or season to revisit your playing record.</p></div> : <>
      <div className="season-review-title"><div><span>{data.review.year}</span><strong>{selectedSeason?.name ?? 'Full year'} review</strong></div><p>Compared with {data.previous.year} {selectedSeason?.name.toLocaleLowerCase() ?? 'full year'}</p></div>
      <div className="season-review-metrics">{metrics.map(([label, current, previous]) => <article key={label}><span>{label}</span><strong>{current.toLocaleString('en-GB')}</strong><small>{signed(current - previous)} from {data.previous.year}</small></article>)}</div>
      <div className="season-review-highlights">
        <article><span>Handicap Index journey</span><strong>{index(data.review.handicap.startingIndex)} → {index(data.review.handicap.endingIndex)}</strong><small>{data.review.handicap.change === null ? 'No Handicap Index outcome in this period' : `${signed(data.review.handicap.change)} during this period`}</small></article>
        <article><span>Most-played course</span><strong>{data.review.mostPlayedCourse?.clubName ?? '—'}</strong><small>{data.review.mostPlayedCourse ? `${data.review.mostPlayedCourse.courseName} · ${data.review.mostPlayedCourse.rounds} rounds` : 'No course available'}</small></article>
      </div>
      <section className="season-review-notables" aria-labelledby="season-notables-title"><header><h3 id="season-notables-title">Notable rounds</h3><p>Open the complete cards in your private History.</p></header><div>
        <NotableCard title="Lowest gross" round={data.review.notableRounds.lowestGross} onOpen={onOpenRound} />
        <NotableCard title="Highest Stableford" round={data.review.notableRounds.highestStableford} suffix=" pts" onOpen={onOpenRound} />
        <NotableCard title="Best differential" round={data.review.notableRounds.bestDifferential} onOpen={onOpenRound} />
      </div></section>
      <p className="season-review-note">Only verified individual rounds are included. Picked-up holes never receive invented strokes, and yardage uses recorded distances only. These reviews do not change any score or Handicap Index.</p>
    </> : null}
  </section>
}
