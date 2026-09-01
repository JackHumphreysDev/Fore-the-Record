import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildCatalogueCoursesPath,
  isCatalogueCoursesResponse,
  type CatalogueCoursesResponse,
  type CatalogueTee,
} from './courseCatalogueApi.ts'
import {
  isRoundResult,
  type RoundCategory,
  type RoundParticipation,
  type RoundResult,
  type WeatherCondition,
} from './roundRecordValidation.ts'
import './RoundEntry.css'

type RoundEntryProfile = {
  id: string
  name: string
  handicapIndex: number | null
}

type TeeOption = CatalogueTee & {
  clubName: string
  courseName: string
}

type RoundForm = {
  teeId: string
  datePlayed: string
  timePlayed: string
  category: RoundCategory
  participation: RoundParticipation
  competitionName: string
  competitionFormat: string
  numberOfPlayers: string
  grossScore: string
  weatherCondition: WeatherCondition
}

type RoundFormErrors = Partial<
  Record<
    | 'teeId'
    | 'datePlayed'
    | 'timePlayed'
    | 'competitionName'
    | 'competitionFormat'
    | 'numberOfPlayers'
    | 'grossScore'
    | 'scorecard',
    string
  >
>

type ScorecardStatus = 'idle' | 'loading' | 'available' | 'manual_required'

type ScorecardHole = {
  holeNumber: number
  par: number
  strokeIndex: number
  yardage: number | null
}

type HoleEntry = {
  holeNumber: number
  par: string
  strokeIndex: string
  yardage: string
  strokesTaken: string
}

type ScorecardResponse =
  | {
      status: 'available'
      source: 'saved' | 'provider'
      holes: ScorecardHole[]
    }
  | { status: 'manual_required'; holes: [] }

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

function getCurrentTime(): string {
  const now = new Date()

  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScorecardHole(value: unknown): value is ScorecardHole {
  return (
    isRecord(value) &&
    Number.isInteger(value.holeNumber) &&
    Number(value.holeNumber) >= 1 &&
    Number(value.holeNumber) <= 18 &&
    Number.isInteger(value.par) &&
    Number.isInteger(value.strokeIndex) &&
    (value.yardage === null || Number.isInteger(value.yardage))
  )
}

function isScorecardResponse(value: unknown): value is ScorecardResponse {
  if (!isRecord(value) || !Array.isArray(value.holes)) {
    return false
  }

  if (value.status === 'manual_required') {
    return value.holes.length === 0
  }

  return (
    value.status === 'available' &&
    (value.source === 'saved' || value.source === 'provider') &&
    value.holes.length === 18 &&
    value.holes.every(isScorecardHole)
  )
}

function getEmptyManualCard(): HoleEntry[] {
  return Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: '',
    strokeIndex: '',
    yardage: '',
    strokesTaken: '',
  }))
}

function getHoleEntries(holes: ScorecardHole[]): HoleEntry[] {
  return holes.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: String(hole.par),
    strokeIndex: String(hole.strokeIndex),
    yardage: hole.yardage === null ? '' : String(hole.yardage),
    strokesTaken: '',
  }))
}

function getTeeOptions(response: CatalogueCoursesResponse | null): TeeOption[] {
  return (response?.courses ?? []).flatMap((course) =>
    course.tees.map((tee) => ({
      ...tee,
      clubName: course.club.name,
      courseName: course.name,
    })),
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
  const [clubQuery, setClubQuery] = useState('')
  const [courseQuery, setCourseQuery] = useState('')
  const [catalogueResponse, setCatalogueResponse] =
    useState<CatalogueCoursesResponse | null>(null)
  const [form, setForm] = useState<RoundForm>({
    teeId: '',
    datePlayed: getToday(),
    timePlayed: getCurrentTime(),
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    competitionName: '',
    competitionFormat: '',
    numberOfPlayers: '',
    grossScore: '',
    weatherCondition: 'DRY',
  })
  const [errors, setErrors] = useState<RoundFormErrors>({})
  const [courseSearchError, setCourseSearchError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmation, setConfirmation] =
    useState<RoundConfirmation | null>(null)
  const [scorecardStatus, setScorecardStatus] =
    useState<ScorecardStatus>('idle')
  const [scorecardSource, setScorecardSource] = useState<
    'saved' | 'provider' | null
  >(null)
  const [holeEntries, setHoleEntries] = useState<HoleEntry[]>([])
  const [scorecardLoadError, setScorecardLoadError] = useState('')

  const teeOptions = getTeeOptions(catalogueResponse)
  const selectedTee = teeOptions.find((option) => option.id === form.teeId)
  const isCompetition = form.category === 'COMPETITION'
  const isTeamRound =
    isCompetition && form.participation === 'TEAM'
  const completedStrokeCount = holeEntries.filter(({ strokesTaken }) => {
    const strokes = Number(strokesTaken)
    return strokesTaken.trim() !== '' && Number.isInteger(strokes) && strokes > 0
  }).length
  const holeScoreTotal = holeEntries.reduce((total, hole) => {
    const strokes = Number(hole.strokesTaken)
    return total + (Number.isInteger(strokes) && strokes > 0 ? strokes : 0)
  }, 0)
  const declaredGrossScore = Number(form.grossScore)
  const scoreDifference =
    completedStrokeCount === 18 &&
    Number.isInteger(declaredGrossScore) &&
    declaredGrossScore > 0
      ? holeScoreTotal - declaredGrossScore
      : 0

  useEffect(() => {
    if (!form.teeId || isTeamRound) {
      return
    }

    const controller = new AbortController()

    async function loadScorecard() {
      setScorecardStatus('loading')
      setScorecardSource(null)
      setHoleEntries([])
      setScorecardLoadError('')

      try {
        const response = await authenticatedFetch(
          `/api/tees/${encodeURIComponent(form.teeId)}/scorecard`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            await readApiError(
              response,
              'We could not load this tee’s scorecard. Please try again.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!isScorecardResponse(body)) {
          throw new Error('The scorecard returned was incomplete.')
        }

        if (body.status === 'available') {
          setScorecardStatus('available')
          setScorecardSource(body.source)
          setHoleEntries(getHoleEntries(body.holes))
        } else {
          setScorecardStatus('manual_required')
          setHoleEntries(getEmptyManualCard())
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setScorecardStatus('idle')
        setHoleEntries([])
        setScorecardLoadError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load this tee’s scorecard. Please try again.',
        )
      }
    }

    void loadScorecard()

    return () => controller.abort()
  }, [form.teeId, isTeamRound])

  async function handleCourseSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const club = clubQuery.trim()
    const course = courseQuery.trim()

    if (!club && !course) {
      setCourseSearchError('Enter a club name, a course name, or both')
      return
    }

    setIsSearching(true)
    setCourseSearchError('')
    setSubmitError('')

    try {
      const response = await authenticatedFetch(
        buildCatalogueCoursesPath({ club, course, page: 1, pageSize: 10 }),
      )

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not search the course catalogue. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isCatalogueCoursesResponse(body)) {
        throw new Error('The course search results returned were incomplete.')
      }

      const nextOptions = getTeeOptions(body)
      setCatalogueResponse(body)
      setForm((current) => ({
        ...current,
        teeId: nextOptions.some((option) => option.id === current.teeId)
          ? current.teeId
          : (nextOptions[0]?.id ?? ''),
      }))
      setErrors((current) => ({ ...current, teeId: undefined }))
    } catch (error: unknown) {
      setCatalogueResponse(null)
      setForm((current) => ({ ...current, teeId: '' }))
      setCourseSearchError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not search the course catalogue. Please try again.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  function updateField<Field extends keyof RoundForm>(
    field: Field,
    value: RoundForm[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  function updateCategory(category: RoundCategory) {
    setForm((current) => ({
      ...current,
      category,
      participation:
        category === 'CASUAL' ? 'INDIVIDUAL' : current.participation,
      competitionName:
        category === 'CASUAL' ? '' : current.competitionName,
      competitionFormat:
        category === 'CASUAL' ? '' : current.competitionFormat,
      numberOfPlayers:
        category === 'CASUAL' ? '' : current.numberOfPlayers,
    }))
    setErrors((current) => ({
      ...current,
      competitionName: undefined,
      competitionFormat: undefined,
      numberOfPlayers: undefined,
      grossScore: undefined,
      scorecard: undefined,
    }))
    setSubmitError('')
  }

  function updateParticipation(participation: RoundParticipation) {
    setForm((current) => ({ ...current, participation }))
    setErrors((current) => ({
      ...current,
      grossScore: undefined,
      scorecard: undefined,
    }))
    setSubmitError('')

    if (participation === 'TEAM') {
      setScorecardStatus('idle')
      setScorecardSource(null)
      setHoleEntries([])
      setScorecardLoadError('')
    }
  }

  function updateHoleEntry(
    holeNumber: number,
    field: keyof Omit<HoleEntry, 'holeNumber'>,
    value: string,
  ) {
    setHoleEntries((current) =>
      current.map((hole) =>
        hole.holeNumber === holeNumber ? { ...hole, [field]: value } : hole,
      ),
    )
    setErrors((current) => ({ ...current, scorecard: undefined }))
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

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.timePlayed)) {
      nextErrors.timePlayed = 'Choose the time played'
    }

    const numberOfPlayers = Number(form.numberOfPlayers)

    if (isCompetition) {
      if (
        form.competitionName.trim().length < 2 ||
        form.competitionName.trim().length > 120
      ) {
        nextErrors.competitionName =
          'Enter the competition name (2–120 characters)'
      }

      if (
        form.competitionFormat.trim().length < 2 ||
        form.competitionFormat.trim().length > 100
      ) {
        nextErrors.competitionFormat =
          'Enter the competition format (2–100 characters)'
      }

      if (
        form.numberOfPlayers.trim() === '' ||
        !Number.isInteger(numberOfPlayers) ||
        numberOfPlayers <= 0 ||
        numberOfPlayers > 10000
      ) {
        nextErrors.numberOfPlayers =
          'Enter the number of players as a positive whole number'
      }
    }

    if (!isTeamRound) {
      if (
        form.grossScore.trim() === '' ||
        !Number.isInteger(grossScore) ||
        grossScore <= 0
      ) {
        nextErrors.grossScore = 'Enter a whole-number total score'
      }

      if (scorecardStatus === 'loading') {
        nextErrors.scorecard = 'Wait for the scorecard to finish loading'
      } else if (holeEntries.length !== 18) {
        nextErrors.scorecard = 'Load a complete 18-hole scorecard'
      } else if (completedStrokeCount !== 18) {
        nextErrors.scorecard =
          'Enter a whole-number stroke score for every hole'
      } else if (scorecardStatus === 'manual_required') {
        const hasInvalidDefinition = holeEntries.some((hole) => {
          const par = Number(hole.par)
          const strokeIndex = Number(hole.strokeIndex)
          const yardage = Number(hole.yardage)

          return (
            !Number.isInteger(par) ||
            par < 2 ||
            par > 7 ||
            !Number.isInteger(strokeIndex) ||
            strokeIndex < 1 ||
            strokeIndex > 18 ||
            (hole.yardage.trim() !== '' &&
              (!Number.isInteger(yardage) || yardage <= 0))
          )
        })
        const strokeIndexes = new Set(
          holeEntries.map(({ strokeIndex }) => Number(strokeIndex)),
        )

        if (hasInvalidDefinition || strokeIndexes.size !== 18) {
          nextErrors.scorecard =
            'Enter par 2–7 and each stroke index from 1–18 once. Yardage is optional.'
        }
      }

      if (
        !nextErrors.grossScore &&
        completedStrokeCount === 18 &&
        scoreDifference !== 0
      ) {
        nextErrors.scorecard = `Your hole-by-hole scores total ${holeScoreTotal}, but your total score is ${grossScore}—a difference of ${Math.abs(scoreDifference)} ${Math.abs(scoreDifference) === 1 ? 'stroke' : 'strokes'}. Review your scorecard before submitting.`
      }
    }

    if (Object.keys(nextErrors).length > 0 || !selectedTee) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await authenticatedFetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teeId: selectedTee.id,
          datePlayed: form.datePlayed,
          timePlayed: form.timePlayed,
          category: form.category,
          participation: form.participation,
          ...(isCompetition
            ? {
                competitionName: form.competitionName.trim(),
                competitionFormat: form.competitionFormat.trim(),
                numberOfPlayers,
              }
            : {}),
          ...(!isTeamRound
            ? {
                grossScore,
                weatherCondition: form.weatherCondition,
                holeScores: holeEntries.map((hole) => ({
                  holeNumber: hole.holeNumber,
                  par: Number(hole.par),
                  strokeIndex: Number(hole.strokeIndex),
                  strokesTaken: Number(hole.strokesTaken),
                  ...(hole.yardage.trim() === ''
                    ? {}
                    : { yardage: Number(hole.yardage) }),
                })),
              }
            : {}),
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
    const isTeamConfirmation =
      confirmation.round.participation === 'TEAM'

    return (
      <section className="rounds-page" id="rounds">
        <div className="round-confirmation" aria-live="polite">
          <div className="round-confirmation-mark" aria-hidden="true">
            ✓
          </div>
          <p className="form-kicker">
            {isTeamConfirmation
              ? 'Team competition recorded'
              : confirmation.round.scorecardStatus === 'PENDING_REVIEW'
              ? 'Round saved for review'
              : 'Round recorded'}
          </p>
          <h1>
            {isTeamConfirmation
              ? 'Added to your golf record.'
              : confirmation.round.scorecardStatus === 'PENDING_REVIEW'
              ? 'Your card is with the admin.'
              : 'That one counts.'}
          </h1>
          <p className="round-confirmation-course">{confirmation.teeLabel}</p>
          {confirmation.round.competitionName ? (
            <p className="round-confirmation-competition">
              {confirmation.round.competitionName}
            </p>
          ) : null}

          <div className="round-confirmation-grid">
            <div>
              <small>Date played</small>
              <strong>{formatRoundDate(confirmation.round.datePlayed)}</strong>
            </div>
            <div>
              <small>Time played</small>
              <strong>{confirmation.round.timePlayed ?? '—'}</strong>
            </div>
            {isTeamConfirmation ? (
              <>
                <div>
                  <small>Format</small>
                  <strong>{confirmation.round.competitionFormat}</strong>
                </div>
                <div>
                  <small>Players</small>
                  <strong>{confirmation.round.numberOfPlayers}</strong>
                </div>
                <div>
                  <small>Entry</small>
                  <strong>Team record</strong>
                </div>
              </>
            ) : (
              <>
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
                  <strong>
                    {confirmation.round.scoreDifferential?.toFixed(1) ?? '—'}
                  </strong>
                </div>
              </>
            )}
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
            {isTeamConfirmation
              ? 'Team competition entries are saved for your playing history only. They do not affect your Handicap Index.'
              : confirmation.round.scorecardStatus === 'PENDING_REVIEW'
              ? 'Your strokes are saved. This round is provisionally calculated but will not affect your Handicap Index until the manually entered scorecard is approved.'
              : confirmation.round.isCapped
              ? 'Net Double Bogey adjustments were applied.'
              : 'The submitted hole-by-hole card was used to calculate the adjusted gross score.'}
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
                setForm((current) => ({
                  ...current,
                  category: 'CASUAL',
                  participation: 'INDIVIDUAL',
                  competitionName: '',
                  competitionFormat: '',
                  numberOfPlayers: '',
                  grossScore: '',
                  timePlayed: getCurrentTime(),
                }))
                setHoleEntries((current) =>
                  current.map((hole) => ({ ...hole, strokesTaken: '' })),
                )
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
          Record a casual score, an individual competition, or a team event.
          Only complete individual cards can affect your Handicap Index.
        </p>
      </header>

      <form className="round-course-search" onSubmit={handleCourseSearch} noValidate>
        <div>
          <label>
            Club name
            <input
              type="search"
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Sickleholme"
              value={clubQuery}
              aria-invalid={Boolean(courseSearchError)}
              onChange={(event) => {
                setClubQuery(event.target.value)
                setCourseSearchError('')
              }}
            />
          </label>
          <label>
            Course name
            <input
              type="search"
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Old Course"
              value={courseQuery}
              aria-invalid={Boolean(courseSearchError)}
              onChange={(event) => {
                setCourseQuery(event.target.value)
                setCourseSearchError('')
              }}
            />
          </label>
          <button type="submit" disabled={isSearching}>
            {isSearching ? 'Searching…' : 'Find tees'}
          </button>
        </div>
        <small>Use either field or combine both for a narrower result.</small>
      </form>

      {courseSearchError ? (
        <p className="round-course-search-error" role="alert">
          {courseSearchError}
        </p>
      ) : null}

      {isSearching ? (
        <div className="round-state-card" aria-live="polite">
          <div className="round-loading" aria-label="Searching for tees">
            <span />
            <span />
            <span />
          </div>
          <h2>Searching the course catalogue…</h2>
        </div>
      ) : null}

      {!isSearching && catalogueResponse && teeOptions.length === 0 ? (
        <div className="round-state-card">
          <span className="round-state-number" aria-hidden="true">
            00
          </span>
          <p className="form-kicker">No rated tees found</p>
          <h2>Try a broader course search.</h2>
          <p>
            Use fewer words or browse the full catalogue. Missing course
            details can be sent to the administrator from Courses.
          </p>
          <button type="button" onClick={onGoToCourses}>
            Browse courses
          </button>
        </div>
      ) : null}

      {!isSearching && !courseSearchError && !catalogueResponse ? (
        <div className="round-state-card">
          <span className="round-state-number" aria-hidden="true">
            01
          </span>
          <p className="form-kicker">Choose a rated tee</p>
          <h2>Find the course you played.</h2>
          <p>
            Search by club, course, or both. Only the matching tees will be
            loaded into your round form.
          </p>
        </div>
      ) : null}

      {!isSearching && teeOptions.length > 0 ? (
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
              {catalogueResponse && catalogueResponse.pagination.total > 10 ? (
                <small>
                  Showing tees from the first 10 matching courses. Refine your
                  search if the course you need is not listed.
                </small>
              ) : null}
              {errors.teeId ? (
                <span className="round-field-error" id="round-tee-error">
                  {errors.teeId}
                </span>
              ) : null}
            </div>

            <fieldset className="round-choice-fieldset">
              <legend>Round type</legend>
              <div className="round-choice-options">
                <label
                  className={
                    form.category === 'CASUAL'
                      ? 'round-choice-option round-choice-option-selected'
                      : 'round-choice-option'
                  }
                >
                  <input
                    type="radio"
                    name="round-category"
                    value="CASUAL"
                    checked={form.category === 'CASUAL'}
                    onChange={() => updateCategory('CASUAL')}
                  />
                  <span>
                    <strong>Casual round</strong>
                    <small>Individual score that may count</small>
                  </span>
                </label>
                <label
                  className={
                    form.category === 'COMPETITION'
                      ? 'round-choice-option round-choice-option-selected'
                      : 'round-choice-option'
                  }
                >
                  <input
                    type="radio"
                    name="round-category"
                    value="COMPETITION"
                    checked={form.category === 'COMPETITION'}
                    onChange={() => updateCategory('COMPETITION')}
                  />
                  <span>
                    <strong>Competition round</strong>
                    <small>Individual or team competition</small>
                  </span>
                </label>
              </div>
            </fieldset>

            {isCompetition ? (
              <>
                <fieldset className="round-choice-fieldset">
                  <legend>Participation</legend>
                  <div className="round-choice-options">
                    <label
                      className={
                        form.participation === 'INDIVIDUAL'
                          ? 'round-choice-option round-choice-option-selected'
                          : 'round-choice-option'
                      }
                    >
                      <input
                        type="radio"
                        name="round-participation"
                        value="INDIVIDUAL"
                        checked={form.participation === 'INDIVIDUAL'}
                        onChange={() => updateParticipation('INDIVIDUAL')}
                      />
                      <span>
                        <strong>Individual</strong>
                        <small>Submit your own complete score</small>
                      </span>
                    </label>
                    <label
                      className={
                        form.participation === 'TEAM'
                          ? 'round-choice-option round-choice-option-selected'
                          : 'round-choice-option'
                      }
                    >
                      <input
                        type="radio"
                        name="round-participation"
                        value="TEAM"
                        checked={form.participation === 'TEAM'}
                        onChange={() => updateParticipation('TEAM')}
                      />
                      <span>
                        <strong>Team / record only</strong>
                        <small>No gross score or handicap effect</small>
                      </span>
                    </label>
                  </div>
                </fieldset>

                <div className="round-field-row">
                  <div className="round-field">
                    <label htmlFor="round-competition-name">
                      Competition name
                    </label>
                    <input
                      id="round-competition-name"
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Captain’s Day"
                      value={form.competitionName}
                      aria-invalid={Boolean(errors.competitionName)}
                      onChange={(event) =>
                        updateField('competitionName', event.target.value)
                      }
                    />
                    {errors.competitionName ? (
                      <span className="round-field-error">
                        {errors.competitionName}
                      </span>
                    ) : null}
                  </div>
                  <div className="round-field">
                    <label htmlFor="round-competition-format">
                      Competition format
                    </label>
                    <input
                      id="round-competition-format"
                      type="text"
                      maxLength={100}
                      placeholder="e.g. Medal or Texas Scramble"
                      value={form.competitionFormat}
                      aria-invalid={Boolean(errors.competitionFormat)}
                      onChange={(event) =>
                        updateField('competitionFormat', event.target.value)
                      }
                    />
                    {errors.competitionFormat ? (
                      <span className="round-field-error">
                        {errors.competitionFormat}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="round-field round-player-count-field">
                  <label htmlFor="round-player-count">Number of players</label>
                  <input
                    id="round-player-count"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    inputMode="numeric"
                    placeholder="e.g. 64"
                    value={form.numberOfPlayers}
                    aria-invalid={Boolean(errors.numberOfPlayers)}
                    onChange={(event) =>
                      updateField('numberOfPlayers', event.target.value)
                    }
                  />
                  {errors.numberOfPlayers ? (
                    <span className="round-field-error">
                      {errors.numberOfPlayers}
                    </span>
                  ) : null}
                </div>
              </>
            ) : null}

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
                <label htmlFor="round-time">Time played</label>
                <input
                  id="round-time"
                  type="time"
                  value={form.timePlayed}
                  aria-invalid={Boolean(errors.timePlayed)}
                  onChange={(event) =>
                    updateField('timePlayed', event.target.value)
                  }
                />
                {errors.timePlayed ? (
                  <span className="round-field-error">
                    {errors.timePlayed}
                  </span>
                ) : null}
              </div>
            </div>

            {!isTeamRound ? (
              <>
              <div className="round-field round-gross-score-field">
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

            <section className="round-scorecard" aria-labelledby="round-scorecard-title">
              <div className="round-scorecard-heading">
                <div>
                  <p className="form-kicker">Hole-by-hole scorecard</p>
                  <h3 id="round-scorecard-title">Check every hole.</h3>
                </div>
                <div className="round-scorecard-total" aria-live="polite">
                  <small>Running total</small>
                  <strong>{holeScoreTotal || '—'}</strong>
                  <span>{completedStrokeCount}/18 holes</span>
                </div>
              </div>

              {scorecardStatus === 'loading' ? (
                <p className="round-scorecard-notice" role="status">
                  Loading saved hole details…
                </p>
              ) : null}

              {scorecardLoadError ? (
                <p className="round-scorecard-notice round-scorecard-notice-error" role="alert">
                  {scorecardLoadError}
                </p>
              ) : null}

              {scorecardStatus === 'available' ? (
                <p className="round-scorecard-notice">
                  Par, stroke index and available yardages are locked to the {scorecardSource === 'provider' ? 'provider' : 'approved'} scorecard. Enter your strokes for all 18 holes.
                </p>
              ) : null}

              {scorecardStatus === 'manual_required' ? (
                <p className="round-scorecard-notice round-scorecard-notice-review">
                  No complete scorecard is available for this tee. Enter par and stroke index; yardage is optional. Your round will be saved for administrator review and will not affect your Handicap Index until approval.
                </p>
              ) : null}

              {holeEntries.length === 18 ? (
                <div className="round-scorecard-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Hole</th>
                        <th scope="col">Par</th>
                        <th scope="col">SI</th>
                        <th scope="col">Yards</th>
                        <th scope="col">Strokes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holeEntries.map((hole) => (
                        <tr key={hole.holeNumber}>
                          <th scope="row">{hole.holeNumber}</th>
                          <td>
                            {scorecardStatus === 'manual_required' ? (
                              <input
                                aria-label={`Hole ${hole.holeNumber} par`}
                                type="number"
                                min="2"
                                max="7"
                                step="1"
                                inputMode="numeric"
                                value={hole.par}
                                onChange={(event) =>
                                  updateHoleEntry(hole.holeNumber, 'par', event.target.value)
                                }
                              />
                            ) : (
                              hole.par
                            )}
                          </td>
                          <td>
                            {scorecardStatus === 'manual_required' ? (
                              <input
                                aria-label={`Hole ${hole.holeNumber} stroke index`}
                                type="number"
                                min="1"
                                max="18"
                                step="1"
                                inputMode="numeric"
                                value={hole.strokeIndex}
                                onChange={(event) =>
                                  updateHoleEntry(hole.holeNumber, 'strokeIndex', event.target.value)
                                }
                              />
                            ) : (
                              hole.strokeIndex
                            )}
                          </td>
                          <td>
                            {scorecardStatus === 'manual_required' ? (
                              <input
                                aria-label={`Hole ${hole.holeNumber} yardage optional`}
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                placeholder="—"
                                value={hole.yardage}
                                onChange={(event) =>
                                  updateHoleEntry(hole.holeNumber, 'yardage', event.target.value)
                                }
                              />
                            ) : (
                              hole.yardage || '—'
                            )}
                          </td>
                          <td>
                            <input
                              className="round-strokes-input"
                              aria-label={`Hole ${hole.holeNumber} strokes`}
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={hole.strokesTaken}
                              onChange={(event) =>
                                updateHoleEntry(hole.holeNumber, 'strokesTaken', event.target.value)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {scoreDifference !== 0 ? (
                <p className="round-score-mismatch" role="alert">
                  Your hole-by-hole scores total {holeScoreTotal}, but your total score is {declaredGrossScore}—a difference of {Math.abs(scoreDifference)} {Math.abs(scoreDifference) === 1 ? 'stroke' : 'strokes'}. Review your scorecard before submitting.
                </p>
              ) : null}

              {errors.scorecard && scoreDifference === 0 ? (
                <p className="round-field-error" role="alert">
                  {errors.scorecard}
                </p>
              ) : null}
            </section>

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
              </>
            ) : (
              <div className="round-team-record-notice">
                <strong>No scorecard is required.</strong>
                <p>
                  This team competition will appear in your history with its
                  course, date, time and competition details. It will not
                  change your Handicap Index.
                </p>
              </div>
            )}

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
              <span>
                {isSubmitting
                  ? 'Saving round…'
                  : isTeamRound
                    ? 'Add team round to history'
                    : 'Record this round'}
              </span>
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
              <span>
                {isTeamRound
                  ? 'Unaffected by this team entry'
                  : 'Recalculated when this round is saved'}
              </span>
            </div>

            <p className="round-summary-note">
              {isTeamRound
                ? 'Team competitions are preserved in your golf history as record-only entries, without a score differential or counting-round status.'
                : 'Hole-by-hole scores must match the signed total. Net Double Bogey capping uses the approved card; PCC defaults to 0 for this round.'}
            </p>
          </aside>
        </div>
      ) : null}
    </section>
  )
}

export default RoundEntry
