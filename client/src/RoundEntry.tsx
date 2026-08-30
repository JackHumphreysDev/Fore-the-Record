import { useEffect, useState, type FormEvent } from 'react'
import './RoundEntry.css'

type WeatherCondition = 'DRY' | 'MOIST' | 'WET' | 'SUPER_WET'

type RoundEntryProfile = {
  id: string
  name: string
  handicapIndex: number | null
}

type SavedTee = {
  id: string
  teeName: string
  courseRating: number
  slopeRating: number
  par: number | null
}

type SavedCourse = {
  id: string
  name: string
  tees: SavedTee[]
}

type SavedClub = {
  id: string
  name: string
  courses: SavedCourse[]
}

type TeeOption = SavedTee & {
  clubName: string
  courseName: string
}

type RoundForm = {
  teeId: string
  datePlayed: string
  grossScore: string
  weatherCondition: WeatherCondition
}

type RoundFormErrors = Partial<
  Record<'teeId' | 'datePlayed' | 'grossScore', string>
>

type RoundResult = {
  round: {
    id: string
    datePlayed: string
    grossScore: number
    adjustedGrossScore: number
    isCapped: boolean
    scoreDifferential: number
  }
  handicapIndex: number | null
}

type RoundConfirmation = RoundResult & {
  teeLabel: string
}

type RoundEntryProps = {
  profile: RoundEntryProfile | null
  onGoToCourses: () => void
  onGoToProfile: () => void
  onGoToHistory: () => void
  onRoundLogged: (handicapIndex: number | null) => void
}

const WEATHER_OPTIONS: Array<{
  value: WeatherCondition
  label: string
  description: string
}> = [
  { value: 'DRY', label: 'Dry', description: 'Firm and running' },
  { value: 'MOIST', label: 'Moist', description: 'A little give' },
  { value: 'WET', label: 'Wet', description: 'Soft underfoot' },
  {
    value: 'SUPER_WET',
    label: 'Super wet',
    description: 'Heavy conditions',
  },
]

function getToday(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSavedTee(value: unknown): value is SavedTee {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.teeName === 'string' &&
    typeof value.courseRating === 'number' &&
    typeof value.slopeRating === 'number' &&
    (value.par === null || typeof value.par === 'number')
  )
}

function isSavedCourse(value: unknown): value is SavedCourse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.tees) &&
    value.tees.every(isSavedTee)
  )
}

function isSavedClub(value: unknown): value is SavedClub {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.courses) &&
    value.courses.every(isSavedCourse)
  )
}

function isRoundResult(value: unknown): value is RoundResult {
  if (
    !isRecord(value) ||
    !isRecord(value.round) ||
    (value.handicapIndex !== null &&
      typeof value.handicapIndex !== 'number')
  ) {
    return false
  }

  return (
    typeof value.round.id === 'string' &&
    typeof value.round.datePlayed === 'string' &&
    typeof value.round.grossScore === 'number' &&
    typeof value.round.adjustedGrossScore === 'number' &&
    typeof value.round.isCapped === 'boolean' &&
    typeof value.round.scoreDifferential === 'number'
  )
}

function getTeeOptions(clubs: SavedClub[]): TeeOption[] {
  return clubs.flatMap((club) =>
    club.courses.flatMap((course) =>
      course.tees.map((tee) => ({
        ...tee,
        clubName: club.name,
        courseName: course.name,
      })),
    ),
  )
}

async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (isRecord(body) && typeof body.error === 'string') {
    return body.error
  }

  return fallbackMessage
}

function formatRoundDate(datePlayed: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(datePlayed))
}

function RoundEntry({
  profile,
  onGoToCourses,
  onGoToProfile,
  onGoToHistory,
  onRoundLogged,
}: RoundEntryProps) {
  const [clubs, setClubs] = useState<SavedClub[]>([])
  const [form, setForm] = useState<RoundForm>({
    teeId: '',
    datePlayed: getToday(),
    grossScore: '',
    weatherCondition: 'DRY',
  })
  const [errors, setErrors] = useState<RoundFormErrors>({})
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(profile))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [confirmation, setConfirmation] =
    useState<RoundConfirmation | null>(null)
  const profileId = profile?.id

  useEffect(() => {
    if (!profileId) {
      return
    }

    const controller = new AbortController()

    async function loadSavedCourses() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await fetch('/api/courses', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(
            await readApiError(
              response,
              'We could not load your saved tees. Please try again.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!Array.isArray(body) || !body.every(isSavedClub)) {
          throw new Error('The saved course data returned was incomplete.')
        }

        const nextOptions = getTeeOptions(body)

        setClubs(body)
        setForm((current) => ({
          ...current,
          teeId: nextOptions.some((option) => option.id === current.teeId)
            ? current.teeId
            : (nextOptions[0]?.id ?? ''),
        }))
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setLoadError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load your saved tees. Please try again.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadSavedCourses()

    return () => controller.abort()
  }, [profileId, loadAttempt])

  const teeOptions = getTeeOptions(clubs)
  const selectedTee = teeOptions.find((option) => option.id === form.teeId)

  function updateField<Field extends keyof RoundForm>(
    field: Field,
    value: RoundForm[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profile) {
      return
    }

    const nextErrors: RoundFormErrors = {}
    const grossScore = Number(form.grossScore)

    if (!selectedTee) {
      nextErrors.teeId = 'Choose a saved tee'
    }

    if (form.datePlayed === '') {
      nextErrors.datePlayed = 'Choose the date played'
    } else if (form.datePlayed > getToday()) {
      nextErrors.datePlayed = 'The round date cannot be in the future'
    }

    if (
      form.grossScore.trim() === '' ||
      !Number.isInteger(grossScore) ||
      grossScore <= 0
    ) {
      nextErrors.grossScore = 'Enter a whole-number total score'
    }

    if (Object.keys(nextErrors).length > 0 || !selectedTee) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profile.id,
          teeId: selectedTee.id,
          datePlayed: form.datePlayed,
          grossScore,
          weatherCondition: form.weatherCondition,
        }),
      })

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not save this round. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isRoundResult(body)) {
        throw new Error('The saved round data returned was incomplete.')
      }

      setConfirmation({
        ...body,
        teeLabel: `${selectedTee.clubName} · ${selectedTee.courseName} · ${selectedTee.teeName}`,
      })
      onRoundLogged(body.handicapIndex)
    } catch (error: unknown) {
      setSubmitError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not save this round. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!profile) {
    return (
      <section className="rounds-page" id="rounds">
        <div className="round-state-card">
          <span className="round-state-number" aria-hidden="true">
            01
          </span>
          <p className="form-kicker">Player required</p>
          <h1>Create your profile before logging a round.</h1>
          <p>
            A round belongs to a player and updates that player’s Handicap
            Index.
          </p>
          <button type="button" onClick={onGoToProfile}>
            Go to profile
          </button>
        </div>
      </section>
    )
  }

  if (confirmation) {
    return (
      <section className="rounds-page" id="rounds">
        <div className="round-confirmation" aria-live="polite">
          <div className="round-confirmation-mark" aria-hidden="true">
            ✓
          </div>
          <p className="form-kicker">Round recorded</p>
          <h1>That one counts.</h1>
          <p className="round-confirmation-course">{confirmation.teeLabel}</p>

          <div className="round-confirmation-grid">
            <div>
              <small>Date played</small>
              <strong>{formatRoundDate(confirmation.round.datePlayed)}</strong>
            </div>
            <div>
              <small>Gross score</small>
              <strong>{confirmation.round.grossScore}</strong>
            </div>
            <div>
              <small>Adjusted</small>
              <strong>{confirmation.round.adjustedGrossScore}</strong>
            </div>
            <div>
              <small>Differential</small>
              <strong>{confirmation.round.scoreDifferential.toFixed(1)}</strong>
            </div>
            <div className="round-confirmation-handicap">
              <small>New Handicap Index</small>
              <strong>
                {confirmation.handicapIndex === null
                  ? '—'
                  : confirmation.handicapIndex.toFixed(1)}
              </strong>
            </div>
          </div>

          <p className="round-capping-note">
            {confirmation.round.isCapped
              ? 'Net Double Bogey adjustments were applied.'
              : 'No hole-by-hole card was supplied, so gross score was used as adjusted gross score.'}
          </p>

          <div className="round-confirmation-actions">
            <button
              className="round-secondary-button"
              type="button"
              onClick={onGoToHistory}
            >
              View round history
            </button>
            <button
              className="round-primary-button"
              type="button"
              onClick={() => {
                setConfirmation(null)
                setForm((current) => ({ ...current, grossScore: '' }))
              }}
            >
              Log another round
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounds-page" id="rounds">
      <header className="rounds-hero">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" /> Round entry
          </p>
          <h1>
            Put the round.
            <span>On the record.</span>
          </h1>
        </div>
        <p>
          Choose a saved tee, add your total score and conditions, and we’ll
          calculate the differential.
        </p>
      </header>

      {isLoading ? (
        <div className="round-state-card" aria-live="polite">
          <div className="round-loading" aria-label="Loading saved tees">
            <span />
            <span />
            <span />
          </div>
          <h2>Reading the course library…</h2>
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="round-state-card" role="alert">
          <span className="round-state-number" aria-hidden="true">
            !
          </span>
          <h2>We couldn’t load your tees.</h2>
          <p>{loadError}</p>
          <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError && teeOptions.length === 0 ? (
        <div className="round-state-card">
          <span className="round-state-number" aria-hidden="true">
            00
          </span>
          <p className="form-kicker">No tees saved</p>
          <h2>Add a course before logging a round.</h2>
          <p>
            Search the Courses tab and save at least one rated tee first.
          </p>
          <button type="button" onClick={onGoToCourses}>
            Find a course
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError && teeOptions.length > 0 ? (
        <div className="round-entry-layout">
          <form className="round-entry-form" onSubmit={handleSubmit} noValidate>
            <div className="round-form-heading">
              <div>
                <p className="form-kicker">Score details</p>
                <h2>How did you play?</h2>
              </div>
              <span>{profile.name}</span>
            </div>

            <div className="round-field">
              <label htmlFor="round-tee">Course and tee</label>
              <select
                id="round-tee"
                value={form.teeId}
                aria-invalid={Boolean(errors.teeId)}
                aria-describedby={errors.teeId ? 'round-tee-error' : undefined}
                onChange={(event) => updateField('teeId', event.target.value)}
              >
                {teeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.clubName} — {option.courseName} — {option.teeName}
                  </option>
                ))}
              </select>
              {errors.teeId ? (
                <span className="round-field-error" id="round-tee-error">
                  {errors.teeId}
                </span>
              ) : null}
            </div>

            <div className="round-field-row">
              <div className="round-field">
                <label htmlFor="round-date">Date played</label>
                <input
                  id="round-date"
                  type="date"
                  max={getToday()}
                  value={form.datePlayed}
                  aria-invalid={Boolean(errors.datePlayed)}
                  aria-describedby={
                    errors.datePlayed ? 'round-date-error' : undefined
                  }
                  onChange={(event) =>
                    updateField('datePlayed', event.target.value)
                  }
                />
                {errors.datePlayed ? (
                  <span className="round-field-error" id="round-date-error">
                    {errors.datePlayed}
                  </span>
                ) : null}
              </div>

              <div className="round-field">
                <label htmlFor="round-score">Total gross score</label>
                <input
                  id="round-score"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. 84"
                  value={form.grossScore}
                  aria-invalid={Boolean(errors.grossScore)}
                  aria-describedby={
                    errors.grossScore ? 'round-score-error' : 'round-score-note'
                  }
                  onChange={(event) =>
                    updateField('grossScore', event.target.value)
                  }
                />
                {errors.grossScore ? (
                  <span className="round-field-error" id="round-score-error">
                    {errors.grossScore}
                  </span>
                ) : (
                  <small id="round-score-note">
                    Enter the signed total from your card.
                  </small>
                )}
              </div>
            </div>

            <fieldset className="weather-fieldset">
              <legend>Playing conditions</legend>
              <div className="weather-options">
                {WEATHER_OPTIONS.map((weather) => (
                  <label
                    className={
                      form.weatherCondition === weather.value
                        ? 'weather-option weather-option-selected'
                        : 'weather-option'
                    }
                    key={weather.value}
                  >
                    <input
                      type="radio"
                      name="weather-condition"
                      value={weather.value}
                      checked={form.weatherCondition === weather.value}
                      onChange={() =>
                        updateField('weatherCondition', weather.value)
                      }
                    />
                    <span>
                      <strong>{weather.label}</strong>
                      <small>{weather.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {submitError ? (
              <div className="round-submit-error" role="alert">
                <span aria-hidden="true">!</span>
                {submitError}
              </div>
            ) : null}

            <button
              className="round-primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Saving round…' : 'Record this round'}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </button>
          </form>

          <aside className="round-summary" aria-live="polite">
            <p className="round-summary-label">Selected tee</p>
            <h2>{selectedTee?.clubName}</h2>
            <p className="round-summary-course">
              {selectedTee?.courseName} · {selectedTee?.teeName}
            </p>

            <dl className="round-rating-grid">
              <div>
                <dt>Course rating</dt>
                <dd>{selectedTee?.courseRating.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Slope</dt>
                <dd>{selectedTee?.slopeRating}</dd>
              </div>
              <div>
                <dt>Par</dt>
                <dd>{selectedTee?.par ?? '—'}</dd>
              </div>
            </dl>

            <div className="round-handicap-preview">
              <small>Current Handicap Index</small>
              <strong>
                {profile.handicapIndex === null
                  ? '—'
                  : profile.handicapIndex.toFixed(1)}
              </strong>
              <span>Recalculated when this round is saved</span>
            </div>

            <p className="round-summary-note">
              Total-score entry does not include hole-by-hole Net Double Bogey
              capping. PCC defaults to 0 for this round.
            </p>
          </aside>
        </div>
      ) : null}
    </section>
  )
}

export default RoundEntry
