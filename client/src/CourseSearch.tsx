import { useState, type FormEvent } from 'react'
import './CourseSearch.css'

type CourseSource = 'api' | 'fallback_scrape' | 'manual'

type CourseTee = {
  courseName?: string
  teeName: string
  courseRating: number
  slopeRating: number
  par?: number
}

type CourseSearchResult = {
  clubName: string
  source: CourseSource
  tees: CourseTee[]
  isSaved: boolean
}

type CourseGroup = {
  courseName: string
  tees: Array<{ index: number; tee: CourseTee }>
}

const SOURCE_LABELS: Record<CourseSource, string> = {
  api: 'UK Golf API',
  fallback_scrape: 'Club website',
  manual: 'Saved manually',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCourseSearchResult(value: unknown): value is CourseSearchResult {
  if (
    !isRecord(value) ||
    typeof value.clubName !== 'string' ||
    !['api', 'fallback_scrape', 'manual'].includes(String(value.source)) ||
    typeof value.isSaved !== 'boolean' ||
    !Array.isArray(value.tees)
  ) {
    return false
  }

  return value.tees.every(
    (tee) =>
      isRecord(tee) &&
      (tee.courseName === undefined || typeof tee.courseName === 'string') &&
      typeof tee.teeName === 'string' &&
      typeof tee.courseRating === 'number' &&
      typeof tee.slopeRating === 'number' &&
      (tee.par === undefined || typeof tee.par === 'number'),
  )
}

async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (isRecord(body) && 'error' in body && typeof body.error === 'string') {
    return body.error
  }

  return fallbackMessage
}

function getCourseGroups(result: CourseSearchResult): CourseGroup[] {
  const groups = new Map<string, CourseGroup['tees']>()

  result.tees.forEach((tee, index) => {
    // Fallback sources do not always identify a separate course name. The
    // displayed club name is also the confirmed persistence label in that case.
    const courseName = tee.courseName?.trim() || result.clubName
    const courseTees = groups.get(courseName) ?? []

    courseTees.push({ index, tee })
    groups.set(courseName, courseTees)
  })

  return [...groups].map(([courseName, tees]) => ({ courseName, tees }))
}

function CourseSearch() {
  const [query, setQuery] = useState('')
  const [queryError, setQueryError] = useState('')
  const [result, setResult] = useState<CourseSearchResult | null>(null)
  const [selectedTeeIndexes, setSelectedTeeIndexes] = useState<Set<number>>(
    new Set(),
  )
  const [searchMessage, setSearchMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const clubName = query.trim()

    if (clubName === '') {
      setQueryError('Enter a golf club name')
      return
    }

    setQueryError('')
    setSearchMessage('')
    setSaveError('')
    setResult(null)
    setIsSaved(false)
    setIsSearching(true)

    try {
      const response = await fetch(
        `/api/courses/search?q=${encodeURIComponent(clubName)}`,
      )

      if (response.status === 404) {
        setSearchMessage(
          `We could not find rated tees for “${clubName}”. Check the full club name and try again.`,
        )
        return
      }

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not search for courses. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isCourseSearchResult(body) || body.tees.length === 0) {
        throw new Error('The course data returned was incomplete. Try again.')
      }

      setResult(body)
      setIsSaved(body.isSaved)
      setSelectedTeeIndexes(new Set(body.tees.map((_, index) => index)))
    } catch (error: unknown) {
      setSearchMessage(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not search for courses. Please try again.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  function toggleTee(index: number) {
    setSelectedTeeIndexes((current) => {
      const next = new Set(current)

      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }

      return next
    })
    setSaveError('')
  }

  async function saveSelectedTees() {
    if (!result) {
      return
    }

    const selectedTees = result.tees.filter((_, index) =>
      selectedTeeIndexes.has(index),
    )

    if (selectedTees.length === 0) {
      setSaveError('Select at least one tee to save')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clubName: result.clubName,
          source: result.source,
          tees: selectedTees.map((tee) => ({
            courseName: tee.courseName?.trim() || result.clubName,
            teeName: tee.teeName,
            courseRating: tee.courseRating,
            slopeRating: tee.slopeRating,
            ...(tee.par === undefined ? {} : { par: tee.par }),
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not save this course. Please try again.',
          ),
        )
      }

      setIsSaved(true)
    } catch (error: unknown) {
      setSaveError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not save this course. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const courseGroups = result ? getCourseGroups(result) : []
  const selectedTeeCount = selectedTeeIndexes.size

  return (
    <section className="courses-page" id="courses">
      <header className="courses-hero">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" /> Courses and tees
          </p>
          <h1>
            Find your course.
            <span>Choose your line.</span>
          </h1>
        </div>
        <p>
          Search UK clubs for official Course Rating and Slope Rating data,
          then save the tees you play.
        </p>
      </header>

      <form className="course-search-form" onSubmit={handleSearch} noValidate>
        <label htmlFor="course-query">Golf club name</label>
        <div className="course-search-control">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            id="course-query"
            name="course-query"
            type="search"
            autoComplete="off"
            placeholder="e.g. Sickleholme Golf Club"
            value={query}
            aria-invalid={Boolean(queryError)}
            aria-describedby={queryError ? 'course-query-error' : 'search-tip'}
            onChange={(event) => {
              setQuery(event.target.value)
              setQueryError('')
            }}
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? 'Searching…' : 'Search courses'}
          </button>
        </div>
        {queryError ? (
          <span className="course-field-error" id="course-query-error">
            {queryError}
          </span>
        ) : (
          <span className="course-search-tip" id="search-tip">
            Use the club’s full name for the closest match.
          </span>
        )}
      </form>

      <div className="course-search-content" aria-live="polite">
        {isSearching ? (
          <div className="course-loading" aria-label="Searching for courses">
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {!isSearching && searchMessage ? (
          <div className="course-state-card course-state-error" role="alert">
            <div className="course-state-icon" aria-hidden="true">
              !
            </div>
            <div>
              <h2>No course to show yet</h2>
              <p>{searchMessage}</p>
            </div>
          </div>
        ) : null}

        {!isSearching && !searchMessage && !result ? (
          <div className="course-state-card course-state-idle">
            <div className="course-map-mark" aria-hidden="true">
              <span />
            </div>
            <div>
              <p className="form-kicker">Ready when you are</p>
              <h2>Your next tee starts here.</h2>
              <p>
                Results will show every available course and tee, with the
                numbers needed for an accurate differential.
              </p>
            </div>
          </div>
        ) : null}

        {!isSearching && result ? (
          <div className="course-results">
            <header className="course-results-header">
              <div>
                <div className="course-source">
                  <span>{SOURCE_LABELS[result.source]}</span>
                  <span aria-hidden="true">•</span>
                  <span>
                    {result.tees.length}{' '}
                    {result.tees.length === 1 ? 'tee' : 'tees'}
                  </span>
                </div>
                <h2>{result.clubName}</h2>
              </div>
              <span className={isSaved ? 'saved-badge' : 'lookup-badge'}>
                {isSaved ? 'Saved' : 'Ready to confirm'}
              </span>
            </header>

            <div className="course-groups">
              {courseGroups.map((group) => (
                <section className="course-group" key={group.courseName}>
                  <header>
                    <span aria-hidden="true">18</span>
                    <div>
                      <small>Course</small>
                      <h3>{group.courseName}</h3>
                    </div>
                  </header>

                  <div className="tee-list">
                    {group.tees.map(({ index, tee }) => (
                      <div className="tee-row" key={`${tee.teeName}-${index}`}>
                        {!isSaved ? (
                          <input
                            type="checkbox"
                            checked={selectedTeeIndexes.has(index)}
                            aria-label={`Select ${tee.teeName} tee`}
                            onChange={() => toggleTee(index)}
                          />
                        ) : (
                          <span className="saved-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                        <span className="tee-name">
                          <small>Tee</small>
                          <strong>{tee.teeName}</strong>
                        </span>
                        <span className="tee-metric">
                          <small>Rating</small>
                          <strong>{tee.courseRating.toFixed(1)}</strong>
                        </span>
                        <span className="tee-metric">
                          <small>Slope</small>
                          <strong>{tee.slopeRating}</strong>
                        </span>
                        <span className="tee-metric">
                          <small>Par</small>
                          <strong>{tee.par ?? '—'}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {isSaved ? (
              <div className="course-saved-message" role="status">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>This club is in your course library.</strong>
                  <small>Its tees are ready for round entry.</small>
                </div>
              </div>
            ) : (
              <div className="course-save-bar">
                <div>
                  <strong>
                    {selectedTeeCount}{' '}
                    {selectedTeeCount === 1 ? 'tee' : 'tees'} selected
                  </strong>
                  <small>Only selected tees will be saved.</small>
                  {saveError ? <span role="alert">{saveError}</span> : null}
                </div>
                <button
                  type="button"
                  disabled={isSaving || selectedTeeCount === 0}
                  onClick={saveSelectedTees}
                >
                  {isSaving ? 'Saving…' : 'Save selected tees'}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default CourseSearch
