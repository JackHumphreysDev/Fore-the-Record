import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import './RoundHistory.css'

type WeatherCondition = 'DRY' | 'MOIST' | 'WET' | 'SUPER_WET'

type RoundHistoryProfile = {
  id: string
  name: string
  handicapIndex: number | null
}

type HistoryRound = {
  id: string
  datePlayed: string
  grossScore: number
  adjustedGrossScore: number
  isCapped: boolean
  weatherCondition: WeatherCondition
  pccAdjustment: number
  scoreDifferential: number
  isAcceptable: boolean
  usedInHandicapCalc: boolean
  tee: {
    id: string
    teeName: string
    courseRating: number
    slopeRating: number
    par: number | null
    course: {
      id: string
      name: string
      club: {
        id: string
        name: string
      }
    }
  }
}

type RoundHistoryProps = {
  profile: RoundHistoryProfile | null
  onGoToProfile: () => void
  onLogRound: () => void
}

const WEATHER_LABELS: Record<WeatherCondition, string> = {
  DRY: 'Dry',
  MOIST: 'Moist',
  WET: 'Wet',
  SUPER_WET: 'Super wet',
}

const WEATHER_CONDITIONS = Object.keys(
  WEATHER_LABELS,
) as WeatherCondition[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isHistoryRound(value: unknown): value is HistoryRound {
  if (!isRecord(value) || !isRecord(value.tee)) {
    return false
  }

  const tee = value.tee

  if (!isRecord(tee.course) || !isRecord(tee.course.club)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.datePlayed === 'string' &&
    isFiniteNumber(value.grossScore) &&
    isFiniteNumber(value.adjustedGrossScore) &&
    typeof value.isCapped === 'boolean' &&
    typeof value.weatherCondition === 'string' &&
    WEATHER_CONDITIONS.includes(value.weatherCondition as WeatherCondition) &&
    isFiniteNumber(value.pccAdjustment) &&
    isFiniteNumber(value.scoreDifferential) &&
    typeof value.isAcceptable === 'boolean' &&
    typeof value.usedInHandicapCalc === 'boolean' &&
    typeof tee.id === 'string' &&
    typeof tee.teeName === 'string' &&
    isFiniteNumber(tee.courseRating) &&
    isFiniteNumber(tee.slopeRating) &&
    (tee.par === null || isFiniteNumber(tee.par)) &&
    typeof tee.course.id === 'string' &&
    typeof tee.course.name === 'string' &&
    typeof tee.course.club.id === 'string' &&
    typeof tee.course.club.name === 'string'
  )
}

async function readApiError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (isRecord(body) && typeof body.error === 'string') {
    return body.error
  }

  return 'We could not load your round history. Please try again.'
}

function formatRoundDate(datePlayed: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(datePlayed))
}

function getRoundStatus(round: HistoryRound): string {
  if (round.usedInHandicapCalc) {
    return 'Counting round'
  }

  return round.isAcceptable ? 'Not counting' : 'Not acceptable'
}

function RoundHistory({
  profile,
  onGoToProfile,
  onLogRound,
}: RoundHistoryProps) {
  const [rounds, setRounds] = useState<HistoryRound[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(profile))
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const profileId = profile?.id

  useEffect(() => {
    if (!profileId) {
      return
    }

    const controller = new AbortController()
    async function loadRoundHistory() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await authenticatedFetch(
          '/api/users/me/rounds',
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(await readApiError(response))
        }

        const body: unknown = await response.json()

        if (!Array.isArray(body) || !body.every(isHistoryRound)) {
          throw new Error('The round history returned was incomplete.')
        }

        setRounds(body)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setLoadError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load your round history. Please try again.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadRoundHistory()

    return () => controller.abort()
  }, [profileId, loadAttempt])

  if (!profile) {
    return (
      <section className="history-page" id="history">
        <div className="history-state-card">
          <span className="history-state-number" aria-hidden="true">
            01
          </span>
          <p className="form-kicker">Player required</p>
          <h1>Create your profile to see your round history.</h1>
          <p>
            Every score is linked to a player so the right rounds can shape
            that player’s Handicap Index.
          </p>
          <button type="button" onClick={onGoToProfile}>
            Go to profile
          </button>
        </div>
      </section>
    )
  }

  const countingRounds = rounds.filter(
    (round) => round.usedInHandicapCalc,
  ).length

  return (
    <section className="history-page" id="history">
      <header className="history-hero">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" /> Round history
          </p>
          <h1>
            Every score.
            <span>In perspective.</span>
          </h1>
        </div>
        <p>
          Follow every round from newest to oldest and see which scores are
          shaping your current Handicap Index.
        </p>
      </header>

      {isLoading ? (
        <div className="history-state-card" aria-live="polite" aria-busy="true">
          <div className="history-loading" aria-label="Loading round history">
            <span />
            <span />
            <span />
          </div>
          <h2>Reading your scorecards…</h2>
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="history-state-card" role="alert">
          <span className="history-state-number" aria-hidden="true">
            !
          </span>
          <h2>We couldn’t load your rounds.</h2>
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => setLoadAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError && rounds.length === 0 ? (
        <div className="history-state-card">
          <span className="history-state-number" aria-hidden="true">
            00
          </span>
          <p className="form-kicker">No rounds yet</p>
          <h2>Your first scorecard starts the story.</h2>
          <p>
            Log a round and its score, playing conditions and differential
            will appear here.
          </p>
          <button type="button" onClick={onLogRound}>
            Log your first round
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError && rounds.length > 0 ? (
        <>
          <section className="history-overview" aria-label="History overview">
            <div className="history-player">
              <p className="form-kicker">Player record</p>
              <h2>{profile.name}</h2>
              <p>Newest rounds appear first.</p>
            </div>
            <dl className="history-totals">
              <div>
                <dt>Rounds logged</dt>
                <dd>{rounds.length}</dd>
              </div>
              <div>
                <dt>Counting rounds</dt>
                <dd>{countingRounds}</dd>
              </div>
              <div className="history-handicap-total">
                <dt>Handicap Index</dt>
                <dd>
                  {profile.handicapIndex === null
                    ? '—'
                    : profile.handicapIndex.toFixed(1)}
                </dd>
              </div>
            </dl>
          </section>

          <div className="history-list-heading">
            <div>
              <p className="form-kicker">Scorecards</p>
              <h2>Your rounds</h2>
            </div>
            <button type="button" onClick={onLogRound}>
              Log another round
            </button>
          </div>

          <ol className="history-list" aria-label={`${profile.name}'s rounds`}>
            {rounds.map((round, index) => (
              <li key={round.id}>
                <article className="history-round-card">
                  <div className="history-round-number" aria-hidden="true">
                    <span>Round</span>
                    <strong>
                      {String(rounds.length - index).padStart(2, '0')}
                    </strong>
                  </div>

                  <div className="history-round-details">
                    <header className="history-round-header">
                      <time dateTime={round.datePlayed.slice(0, 10)}>
                        {formatRoundDate(round.datePlayed)}
                      </time>
                      <div className="history-badges">
                        {round.isCapped ? (
                          <span className="history-capped-badge">Adjusted</span>
                        ) : null}
                        <span
                          className={
                            round.usedInHandicapCalc
                              ? 'history-status-badge history-status-counting'
                              : 'history-status-badge'
                          }
                        >
                          {getRoundStatus(round)}
                        </span>
                      </div>
                    </header>

                    <h3>{round.tee.course.club.name}</h3>
                    <p className="history-course-line">
                      {round.tee.course.name} · {round.tee.teeName}
                    </p>

                    <dl className="history-round-metrics">
                      <div>
                        <dt>Gross</dt>
                        <dd>{round.grossScore}</dd>
                      </div>
                      <div>
                        <dt>Adjusted</dt>
                        <dd>{round.adjustedGrossScore}</dd>
                      </div>
                      <div className="history-differential">
                        <dt>Differential</dt>
                        <dd>{round.scoreDifferential.toFixed(1)}</dd>
                      </div>
                      <div>
                        <dt>Conditions</dt>
                        <dd>{WEATHER_LABELS[round.weatherCondition]}</dd>
                      </div>
                    </dl>

                    <p className="history-rating-line">
                      Course rating {round.tee.courseRating.toFixed(1)} · Slope{' '}
                      {round.tee.slopeRating} · Par {round.tee.par ?? '—'} · PCC{' '}
                      {round.pccAdjustment.toFixed(1)}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  )
}

export default RoundHistory
