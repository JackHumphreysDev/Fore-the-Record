import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isHistoryRound,
  type HistoryRound,
  type WeatherCondition,
} from './roundRecordValidation.ts'
import './RoundHistory.css'
import { calculateRoundScoreTotals } from './roundScorecardTotals.ts'
import {
  EMPTY_ROUND_HISTORY_FILTERS,
  filterRoundHistory,
  hasRoundHistoryFilters,
  type RoundHistoryFilters,
} from './roundHistoryFilters.ts'

type RoundHistoryProfile = {
  id: string
  name: string
  handicapIndex: number | null
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
  if (round.participation === 'TEAM') {
    return 'Record only'
  }

  if (round.scorecardStatus === 'PENDING_REVIEW') {
    return 'Scorecard review pending'
  }

  if (round.scorecardStatus === 'REJECTED') {
    return 'Scorecard rejected'
  }

  if (round.usedInHandicapCalc) {
    return 'Counting round'
  }

  return round.isAcceptable ? 'Not counting' : 'Not acceptable'
}

function getRoundTypeLabel(round: HistoryRound): string {
  if (round.participation === 'TEAM') {
    return 'Team competition'
  }

  return round.category === 'COMPETITION'
    ? 'Individual competition'
    : 'Casual round'
}

function scoreToPar(strokes: number, par: number): string {
  const difference = strokes - par
  if (difference === 0) return 'E'
  return difference > 0 ? `+${difference}` : String(difference)
}

function RoundScorecard({ round }: { round: HistoryRound }) {
  if (round.holeScores.length !== 18) {
    return (
      <div className="history-scorecard-empty">
        No individual hole-by-hole scorecard is available for this round.
      </div>
    )
  }

  const frontNine = round.holeScores.slice(0, 9)
  const backNine = round.holeScores.slice(9)
  const totals = calculateRoundScoreTotals(round.holeScores)
  const parTotal = (holes: typeof round.holeScores) =>
    holes.reduce((sum, hole) => sum + hole.par, 0)

  return (
    <div className="history-scorecard">
      <div className="history-scorecard-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Hole</th>
              <th scope="col">Par</th>
              <th scope="col">SI</th>
              <th scope="col">Score</th>
              <th scope="col">To par</th>
            </tr>
          </thead>
          <tbody>
            {round.holeScores.map((hole) => (
              <tr key={hole.holeNumber}>
                <th scope="row">{hole.holeNumber}</th>
                <td>{hole.par}</td>
                <td>{hole.strokeIndex}</td>
                <td>{hole.strokesTaken}</td>
                <td>{scoreToPar(hole.strokesTaken, hole.par)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="history-nine-totals">
        <div><dt>Front 9</dt><dd>{totals.frontNine} <small>Par {parTotal(frontNine)}</small></dd></div>
        <div><dt>Back 9</dt><dd>{totals.backNine} <small>Par {parTotal(backNine)}</small></dd></div>
        <div><dt>Total</dt><dd>{totals.total} <small>Par {parTotal(round.holeScores)}</small></dd></div>
      </dl>
    </div>
  )
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
  const [expandedRoundId, setExpandedRoundId] = useState('')
  const [filters, setFilters] = useState<RoundHistoryFilters>({
    ...EMPTY_ROUND_HISTORY_FILTERS,
  })
  const profileId = profile?.id
  const filteredRounds = useMemo(
    () => filterRoundHistory(rounds, filters),
    [filters, rounds],
  )
  const filtersActive = hasRoundHistoryFilters(filters)

  function updateFilter<Key extends keyof RoundHistoryFilters>(
    key: Key,
    value: RoundHistoryFilters[Key],
  ) {
    setExpandedRoundId('')
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    setExpandedRoundId('')
    setFilters({ ...EMPTY_ROUND_HISTORY_FILTERS })
  }

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

          <section className="history-filters" aria-labelledby="history-filters-title">
            <header>
              <div>
                <p className="form-kicker">Narrow your record</p>
                <h3 id="history-filters-title">Filter rounds</h3>
              </div>
              <div className="history-filter-summary" aria-live="polite">
                <span>
                  {filteredRounds.length} of {rounds.length} rounds
                </span>
                <button type="button" disabled={!filtersActive} onClick={clearFilters}>
                  Clear all
                </button>
              </div>
            </header>

            <div className="history-filter-grid">
              <label className="history-filter-search">
                Club, course, tee, or competition
                <input
                  type="search"
                  value={filters.search}
                  placeholder="e.g. Hallamshire"
                  onChange={(event) => updateFilter('search', event.target.value)}
                />
              </label>
              <label>
                Round type
                <select
                  value={filters.roundType}
                  onChange={(event) =>
                    updateFilter(
                      'roundType',
                      event.target.value as RoundHistoryFilters['roundType'],
                    )
                  }
                >
                  <option value="ALL">All round types</option>
                  <option value="CASUAL">Casual rounds</option>
                  <option value="INDIVIDUAL_COMPETITION">Individual competitions</option>
                  <option value="TEAM_COMPETITION">Team competitions</option>
                </select>
              </label>
              <label>
                Handicap status
                <select
                  value={filters.handicapStatus}
                  onChange={(event) =>
                    updateFilter(
                      'handicapStatus',
                      event.target.value as RoundHistoryFilters['handicapStatus'],
                    )
                  }
                >
                  <option value="ALL">All handicap statuses</option>
                  <option value="COUNTING">Counting rounds</option>
                  <option value="NOT_COUNTING">Not counting</option>
                </select>
              </label>
              <label>
                Scorecard status
                <select
                  value={filters.scorecardStatus}
                  onChange={(event) =>
                    updateFilter(
                      'scorecardStatus',
                      event.target.value as RoundHistoryFilters['scorecardStatus'],
                    )
                  }
                >
                  <option value="ALL">All scorecard statuses</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING_REVIEW">Awaiting review</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="NOT_REQUIRED">Record only</option>
                </select>
              </label>
              <label>
                From
                <input
                  type="date"
                  value={filters.dateFrom}
                  max={filters.dateTo || undefined}
                  onChange={(event) => updateFilter('dateFrom', event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  onChange={(event) => updateFilter('dateTo', event.target.value)}
                />
              </label>
            </div>
          </section>

          {filteredRounds.length === 0 ? (
            <div className="history-filter-empty">
              <p>No rounds match those filters.</p>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
          <ol className="history-list" aria-label={`${profile.name}'s filtered rounds`}>
            {filteredRounds.map((round) => (
              <li key={round.id}>
                <article className="history-round-card">
                  <div className="history-round-number" aria-hidden="true">
                    <span>Round</span>
                    <strong>
                      {String(
                        rounds.length - rounds.findIndex(({ id }) => id === round.id),
                      ).padStart(2, '0')}
                    </strong>
                  </div>

                  <div className="history-round-details">
                    <header className="history-round-header">
                      <time dateTime={round.datePlayed.slice(0, 10)}>
                        {formatRoundDate(round.datePlayed)}
                        {round.timePlayed ? ` · ${round.timePlayed}` : ''}
                      </time>
                      <div className="history-badges">
                        <span className="history-type-badge">
                          {getRoundTypeLabel(round)}
                        </span>
                        {round.isCapped ? (
                          <span className="history-capped-badge">Adjusted</span>
                        ) : null}
                        <span
                          className={
                            round.usedInHandicapCalc
                              ? 'history-status-badge history-status-counting'
                              : round.participation === 'TEAM'
                                ? 'history-status-badge history-status-record-only'
                              : round.scorecardStatus === 'PENDING_REVIEW'
                                ? 'history-status-badge history-status-pending'
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
                    {round.competitionName ? (
                      <p className="history-competition-name">
                        {round.competitionName}
                      </p>
                    ) : null}

                    <dl className="history-round-metrics">
                      {round.participation === 'TEAM' ? (
                        <>
                          <div>
                            <dt>Format</dt>
                            <dd>{round.competitionFormat}</dd>
                          </div>
                          <div>
                            <dt>Players</dt>
                            <dd>{round.numberOfPlayers}</dd>
                          </div>
                          <div className="history-differential">
                            <dt>Score</dt>
                            <dd>Record only</dd>
                          </div>
                          <div>
                            <dt>Handicap</dt>
                            <dd>No effect</dd>
                          </div>
                        </>
                      ) : (
                        <>
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
                            <dd>{round.scoreDifferential?.toFixed(1)}</dd>
                          </div>
                          <div>
                            <dt>Conditions</dt>
                            <dd>
                              {round.weatherCondition
                                ? WEATHER_LABELS[round.weatherCondition]
                                : '—'}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>

                    <p className="history-rating-line">
                      {round.participation === 'TEAM'
                        ? 'Course and tee retained for your playing record. No score differential was created.'
                        : `Course rating ${round.tee.courseRating.toFixed(1)} · Slope ${round.tee.slopeRating} · Par ${round.tee.par ?? '—'} · PCC ${round.pccAdjustment.toFixed(1)}${round.competitionFormat ? ` · ${round.competitionFormat} · ${round.numberOfPlayers} players` : ''}`}
                    </p>

                    <button
                      className="history-scorecard-toggle"
                      type="button"
                      aria-expanded={expandedRoundId === round.id}
                      aria-controls={`history-scorecard-${round.id}`}
                      onClick={() => setExpandedRoundId(
                        expandedRoundId === round.id ? '' : round.id,
                      )}
                    >
                      {expandedRoundId === round.id
                        ? 'Hide scorecard'
                        : 'View scorecard'}
                    </button>
                    {expandedRoundId === round.id ? (
                      <div id={`history-scorecard-${round.id}`}>
                        <RoundScorecard round={round} />
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ol>
          )}
        </>
      ) : null}
    </section>
  )
}

export default RoundHistory
