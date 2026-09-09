import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isPerformanceSummaryData,
  type PerformanceSummaryData,
} from './performanceApi.ts'
import './PerformanceSummary.css'

type PerformanceSummaryProps = {
  profileId: string
  handicapIndex: number | null
}

function formatDifferential(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error
  }

  return 'We could not load your performance summary.'
}

function PerformanceSummary({
  profileId,
  handicapIndex,
}: PerformanceSummaryProps) {
  const [summary, setSummary] = useState<PerformanceSummaryData | null>(null)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSummary() {
      setError('')

      try {
        const response = await authenticatedFetch(
          '/api/users/me/performance-summary',
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(await readError(response))
        }

        const body: unknown = await response.json()

        if (!isPerformanceSummaryData(body)) {
          throw new Error('The performance summary returned was incomplete.')
        }

        if (!controller.signal.aborted) {
          setSummary(body)
        }
      } catch (loadError: unknown) {
        if (controller.signal.aborted) {
          return
        }

        setSummary(null)
        setError(
          loadError instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : loadError instanceof Error
              ? loadError.message
              : 'We could not load your performance summary.',
        )
      }
    }

    void loadSummary()
    return () => controller.abort()
  }, [loadAttempt, profileId])

  if (error) {
    return (
      <section className="performance-summary performance-summary-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
          Try again
        </button>
      </section>
    )
  }

  if (!summary) {
    return (
      <section className="performance-summary performance-summary-loading" aria-live="polite">
        Reading your playing record…
      </section>
    )
  }

  return (
    <section className="performance-summary" aria-labelledby="performance-title">
      <div className="performance-heading">
        <div>
          <p className="form-kicker">Game at a glance</p>
          <h3 id="performance-title">Your performance</h3>
        </div>
        <span>{summary.roundsLogged} total</span>
      </div>

      <dl className="performance-metrics">
        <div>
          <dt>Handicap</dt>
          <dd>{formatDifferential(handicapIndex)}</dd>
        </div>
        <div>
          <dt>Counting</dt>
          <dd>{summary.countingRounds}</dd>
        </div>
        <div>
          <dt>Best differential</dt>
          <dd>{formatDifferential(summary.bestDifferential)}</dd>
        </div>
        <div>
          <dt>Average differential</dt>
          <dd>{formatDifferential(summary.averageDifferential)}</dd>
        </div>
      </dl>

      <div className="performance-round-types" aria-label="Round types">
        <span><strong>{summary.casualRounds}</strong> casual</span>
        <span><strong>{summary.individualCompetitionRounds}</strong> individual comps</span>
        <span><strong>{summary.teamCompetitionRounds}</strong> team comps</span>
      </div>

      {summary.recentDifferentials.length > 0 ? (
        <div className="performance-trend">
          <div>
            <strong>Recent differentials</strong>
            <small>{summary.scoredRounds} verified scored rounds</small>
          </div>
          <ol aria-label="Five most recent verified score differentials">
            {summary.recentDifferentials.map((round) => (
              <li
                key={round.roundId}
                className={round.usedInHandicapCalc ? 'is-counting' : undefined}
              >
                <strong>{round.scoreDifferential.toFixed(1)}</strong>
                <small>{formatShortDate(round.datePlayed)}</small>
              </li>
            ))}
          </ol>
          <p>Outlined scores are currently counting towards your Handicap Index.</p>
        </div>
      ) : (
        <p className="performance-empty">
          Verified score differentials will appear after you log an eligible round.
        </p>
      )}
    </section>
  )
}

export default PerformanceSummary
