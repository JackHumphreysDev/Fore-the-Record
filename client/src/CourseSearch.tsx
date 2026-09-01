import { useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildCatalogueCoursesPath,
  buildProviderClubCoursesPath,
  buildProviderClubsSearchPath,
  buildProviderCourseImportBody,
  getProviderCourseSearchQuery,
  isCatalogueCoursesResponse,
  isProviderClubSearchResponse,
  isProviderCourseSearchResult,
  type CatalogueCourse,
  type CatalogueCoursesResponse,
  type ProviderClubCandidate,
  type ProviderCourseSearchResult,
} from './courseCatalogueApi.ts'
import './CourseSearch.css'

type CourseSearchProps = {
  onReportMissingCourse: () => void
}

type SearchFilters = {
  club: string
  course: string
}

const PAGE_SIZE = 10

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  return isRecord(body) && typeof body.error === 'string'
    ? body.error
    : fallbackMessage
}

function formatLocation(course: CatalogueCourse): string {
  return [course.club.city, course.club.county].filter(Boolean).join(', ')
}

function summarizeProviderCourses(result: ProviderCourseSearchResult) {
  const courses = new Map<string, number>()

  for (const tee of result.tees) {
    const courseName = tee.courseName?.trim() || result.clubName
    courses.set(courseName, (courses.get(courseName) ?? 0) + 1)
  }

  return [...courses].map(([name, teeCount]) => ({ name, teeCount }))
}

function CourseSearch({ onReportMissingCourse }: CourseSearchProps) {
  const [club, setClub] = useState('')
  const [course, setCourse] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters | null>(
    null,
  )
  const [response, setResponse] = useState<CatalogueCoursesResponse | null>(
    null,
  )
  const [fieldError, setFieldError] = useState('')
  const [searchError, setSearchError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [providerResult, setProviderResult] =
    useState<ProviderCourseSearchResult | null>(null)
  const [providerClubs, setProviderClubs] = useState<ProviderClubCandidate[]>(
    [],
  )
  const [providerError, setProviderError] = useState('')
  const [providerNotice, setProviderNotice] = useState('')
  const [isProviderSearching, setIsProviderSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  async function searchCatalogue(
    filters: SearchFilters,
    page: number,
    checkProviderOnMiss = false,
  ) {
    setIsSearching(true)
    setSearchError('')

    try {
      const apiResponse = await authenticatedFetch(
        buildCatalogueCoursesPath({ ...filters, page, pageSize: PAGE_SIZE }),
      )

      if (!apiResponse.ok) {
        throw new Error(
          await readApiError(
            apiResponse,
            'We could not search the course catalogue. Please try again.',
          ),
        )
      }

      const body: unknown = await apiResponse.json()

      if (!isCatalogueCoursesResponse(body)) {
        throw new Error('The course search results returned were incomplete.')
      }

      setAppliedFilters(filters)
      setResponse(body)

      if (checkProviderOnMiss && body.courses.length === 0) {
        await searchProvider(getProviderCourseSearchQuery(filters))
      }
    } catch (error: unknown) {
      setResponse(null)
      setSearchError(
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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const filters = { club: club.trim(), course: course.trim() }

    if (!filters.club && !filters.course) {
      setFieldError('Enter a club name, a course name, or both')
      return
    }

    setFieldError('')
    setProviderClubs([])
    setProviderResult(null)
    setProviderError('')
    setProviderNotice('')
    void searchCatalogue(filters, 1, true)
  }

  async function searchProvider(providerQuery: string) {
    setIsProviderSearching(true)
    setProviderError('')
    setProviderNotice('')

    try {
      const apiResponse = await authenticatedFetch(
        buildProviderClubsSearchPath(providerQuery),
      )

      if (!apiResponse.ok) {
        throw new Error(
          await readApiError(
            apiResponse,
            'The provider club search could not be completed.',
          ),
        )
      }

      const body: unknown = await apiResponse.json()

      if (!isProviderClubSearchResponse(body)) {
        throw new Error('The provider returned incomplete club details.')
      }

      if (body.clubs.length === 0) {
        throw new Error('The provider did not return a matching club.')
      }

      if (body.clubs.length === 1) {
        await loadProviderClub(body.clubs[0])
      } else {
        setProviderClubs(body.clubs)
      }
    } catch (error: unknown) {
      setProviderClubs([])
      setProviderResult(null)
      setProviderError(
        error instanceof TypeError
          ? 'We could not reach the provider. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'The provider club search could not be completed.',
      )
    } finally {
      setIsProviderSearching(false)
    }
  }

  async function loadProviderClub(providerClub: ProviderClubCandidate) {
    setIsProviderSearching(true)
    setProviderError('')

    try {
      const apiResponse = await authenticatedFetch(
        buildProviderClubCoursesPath(providerClub),
      )

      if (!apiResponse.ok) {
        throw new Error(
          await readApiError(
            apiResponse,
            'The provider could not find rated tees for that club.',
          ),
        )
      }

      const body: unknown = await apiResponse.json()

      if (!isProviderCourseSearchResult(body)) {
        throw new Error('The provider returned incomplete course details.')
      }

      setProviderClubs([])
      setProviderResult(body)
    } catch (error: unknown) {
      setProviderResult(null)
      setProviderError(
        error instanceof TypeError
          ? 'We could not reach the provider. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'The provider could not find rated tees for that club.',
      )
    } finally {
      setIsProviderSearching(false)
    }
  }

  async function importProviderClub() {
    if (!providerResult) {
      return
    }

    const importBody = buildProviderCourseImportBody(providerResult)

    if (importBody.tees.length === 0) {
      setProviderResult(null)
      setCourse('')
      await searchCatalogue({ club: providerResult.clubName, course: '' }, 1)
      setProviderNotice('This club was already in the saved catalogue.')
      return
    }

    setIsImporting(true)
    setProviderError('')

    try {
      const apiResponse = await authenticatedFetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importBody),
      })

      if (!apiResponse.ok) {
        throw new Error(
          await readApiError(
            apiResponse,
            'We found the club but could not add it to the catalogue.',
          ),
        )
      }

      const importedTeeCount = importBody.tees.length
      const filters = { club: providerResult.clubName, course: '' }

      setClub(providerResult.clubName)
      setCourse('')
      setProviderClubs([])
      setProviderResult(null)
      await searchCatalogue(filters, 1)
      setProviderNotice(
        `${importedTeeCount} ${importedTeeCount === 1 ? 'tee was' : 'tees were'} added to the catalogue. Future searches will use the saved data.`,
      )
    } catch (error: unknown) {
      setProviderError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We found the club but could not add it to the catalogue.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  const pagination = response?.pagination
  const pageCount = Math.max(pagination?.totalPages ?? 0, 1)
  const providerCourses = providerResult
    ? summarizeProviderCourses(providerResult)
    : []
  const unsavedProviderTeeCount =
    providerResult?.tees.filter((tee) => !tee.isSaved).length ?? 0

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
          Search the saved UK catalogue by club, course, or both. If a club is
          missing, a one-off provider check can add its available rated tees.
        </p>
      </header>

      <form className="course-search-form" onSubmit={handleSearch} noValidate>
        <div className="course-search-fields">
          <label>
            Club search
            <input
              type="search"
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Sickleholme"
              value={club}
              aria-invalid={Boolean(fieldError)}
              onChange={(event) => {
                setClub(event.target.value)
                setFieldError('')
              }}
            />
          </label>
          <label>
            Course search
            <input
              type="search"
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Old Course"
              value={course}
              aria-invalid={Boolean(fieldError)}
              onChange={(event) => {
                setCourse(event.target.value)
                setFieldError('')
              }}
            />
          </label>
          <button
            type="submit"
            disabled={isSearching || isProviderSearching}
          >
            {isProviderSearching
              ? 'Checking provider…'
              : isSearching
                ? 'Searching…'
                : 'Search catalogue'}
          </button>
        </div>
        {fieldError ? (
          <span className="course-field-error" role="alert">
            {fieldError}
          </span>
        ) : (
          <span className="course-search-tip">
            Partial names work. Saved data is searched first; an unsuccessful
            search automatically checks provider club names and may use up to
            two of the site’s 200 monthly requests.
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

        {!isSearching && searchError ? (
          <div className="course-state-card course-state-error" role="alert">
            <div className="course-state-icon" aria-hidden="true">
              !
            </div>
            <div>
              <h2>We couldn’t complete that search.</h2>
              <p>{searchError}</p>
            </div>
          </div>
        ) : null}

        {!isSearching &&
        !searchError &&
        response?.courses.length === 0 &&
        providerClubs.length === 0 &&
        !providerResult ? (
          <div className="course-state-card course-state-error">
            <div className="course-state-icon" aria-hidden="true">
              ?
            </div>
            <div>
              <h2>No matching course found.</h2>
              <p>
                We searched saved data and then checked the provider using your
                entry as a possible club name. Try fewer words or submit the
                missing details for review.
              </p>
              <button
                className="course-secondary-action"
                type="button"
                onClick={onReportMissingCourse}
              >
                Submit a missing course
              </button>
              {providerError ? (
                <p className="provider-error" role="alert">
                  {providerError}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isSearching && !searchError && !response ? (
          <div className="course-state-card course-state-idle">
            <div className="course-map-mark" aria-hidden="true">
              <span />
            </div>
            <div>
              <p className="form-kicker">Ready when you are</p>
              <h2>Your next tee starts here.</h2>
              <p>
                Search by a full or partial club or course name to see matching
                courses and all of their rated tees.
              </p>
            </div>
          </div>
        ) : null}

        {!isSearching && !searchError && response?.courses.length ? (
          <section
            className="catalogue-results"
            aria-labelledby="catalogue-results-title"
          >
            <header>
              <div>
                <p className="form-kicker">Catalogue results</p>
                <h2 id="catalogue-results-title">
                  {pagination?.total}{' '}
                  {pagination?.total === 1 ? 'course' : 'courses'} found
                </h2>
              </div>
              <span>
                Page {pagination?.page} of {pageCount}
              </span>
            </header>

            <div className="catalogue-course-list">
              {response.courses.map((result) => {
                const location = formatLocation(result)

                return (
                  <article className="catalogue-course" key={result.id}>
                    <header>
                      <div>
                        <p>
                          {result.club.name}
                          {location ? ` · ${location}` : ''}
                        </p>
                        <h3>{result.name}</h3>
                      </div>
                      <dl>
                        <div>
                          <dt>Holes</dt>
                          <dd>{result.holes ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>Par</dt>
                          <dd>{result.par ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>Tees</dt>
                          <dd>{result.tees.length}</dd>
                        </div>
                      </dl>
                    </header>

                    {result.designedBy || result.yearOpened ? (
                      <p className="catalogue-course-history">
                        {result.designedBy
                          ? `Designed by ${result.designedBy}`
                          : 'Designer not supplied'}
                        {result.yearOpened
                          ? ` · Opened ${result.yearOpened}`
                          : ''}
                      </p>
                    ) : null}

                    <div className="catalogue-tee-list">
                      {result.tees.map((tee) => (
                        <div className="catalogue-tee" key={tee.id}>
                          <span>
                            <small>Tee</small>
                            <strong>{tee.teeName}</strong>
                            <em>
                              {[tee.gender, tee.colour]
                                .filter(Boolean)
                                .join(' · ') || 'Details not supplied'}
                            </em>
                          </span>
                          <span>
                            <small>Rating</small>
                            <strong>{tee.courseRating.toFixed(1)}</strong>
                          </span>
                          <span>
                            <small>Slope</small>
                            <strong>{tee.slopeRating}</strong>
                          </span>
                          <span>
                            <small>Par</small>
                            <strong>{tee.par ?? result.par ?? '—'}</strong>
                          </span>
                          <span>
                            <small>Length</small>
                            <strong>
                              {tee.totalYardage
                                ? `${tee.totalYardage.toLocaleString('en-GB')} yd`
                                : tee.totalMetres
                                  ? `${tee.totalMetres.toLocaleString('en-GB')} m`
                                  : '—'}
                            </strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>

            {pagination && pagination.totalPages > 1 && appliedFilters ? (
              <nav
                className="catalogue-pagination"
                aria-label="Course result pages"
              >
                <button
                  type="button"
                  disabled={pagination.page <= 1 || isSearching}
                  onClick={() =>
                    void searchCatalogue(appliedFilters, pagination.page - 1)
                  }
                >
                  Previous
                </button>
                <span>
                  Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                  {Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total,
                  )}{' '}
                  of {pagination.total}
                </span>
                <button
                  type="button"
                  disabled={
                    pagination.page >= pagination.totalPages || isSearching
                  }
                  onClick={() =>
                    void searchCatalogue(appliedFilters, pagination.page + 1)
                  }
                >
                  Next
                </button>
              </nav>
            ) : null}
          </section>
        ) : null}

        {!isSearching && providerClubs.length > 0 ? (
          <section className="provider-club-results" aria-live="polite">
            <header>
              <div>
                <p className="form-kicker">Provider club matches</p>
                <h2>Choose the right club.</h2>
              </div>
              <span>
                {providerClubs.length}{' '}
                {providerClubs.length === 1 ? 'club' : 'clubs'} found
              </span>
            </header>
            <div className="provider-club-list">
              {providerClubs.map((providerClub) => {
                const location = [providerClub.city, providerClub.county]
                  .filter(Boolean)
                  .join(', ')

                return (
                  <button
                    type="button"
                    key={providerClub.id}
                    disabled={isProviderSearching}
                    onClick={() => void loadProviderClub(providerClub)}
                  >
                    <span>
                      <strong>{providerClub.name}</strong>
                      <small>
                        {location ||
                          providerClub.postcode ||
                          'Location not supplied'}
                      </small>
                    </span>
                    <em>View courses and tees →</em>
                  </button>
                )
              })}
            </div>
            <footer>
              Choose one club to load its courses and rated tees. This uses the
              second provider request.
            </footer>
            {providerError ? (
              <p className="provider-result-error" role="alert">
                {providerError}
              </p>
            ) : null}
          </section>
        ) : null}

        {!isSearching && providerResult ? (
          <section className="provider-result" aria-live="polite">
            <header>
              <div>
                <p className="form-kicker">Provider match</p>
                <h2>{providerResult.clubName}</h2>
              </div>
              <span>
                {providerResult.tees.length}{' '}
                {providerResult.tees.length === 1
                  ? 'rated tee'
                  : 'rated tees'}
              </span>
            </header>
            <div className="provider-course-list">
              {providerCourses.map((providerCourse) => (
                <div key={providerCourse.name}>
                  <strong>{providerCourse.name}</strong>
                  <span>
                    {providerCourse.teeCount}{' '}
                    {providerCourse.teeCount === 1 ? 'tee' : 'tees'}
                  </span>
                </div>
              ))}
            </div>
            <footer>
              <p>
                {unsavedProviderTeeCount > 0
                  ? 'Add all new tees now. They will be saved for everyone and will not need another provider request next time.'
                  : 'Every tee returned by the provider is already saved. Show the club without the course filter to see it.'}
              </p>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => void importProviderClub()}
              >
                {isImporting
                  ? 'Adding tees…'
                  : unsavedProviderTeeCount > 0
                    ? `Add ${unsavedProviderTeeCount} ${unsavedProviderTeeCount === 1 ? 'tee' : 'tees'} to catalogue`
                    : 'Show saved club'}
              </button>
            </footer>
            {providerError ? (
              <p className="provider-result-error" role="alert">
                {providerError}
              </p>
            ) : null}
          </section>
        ) : null}

        {providerNotice ? (
          <p className="provider-notice" role="status">
            {providerNotice}
          </p>
        ) : null}
      </div>

      <aside className="missing-course-callout">
        <div>
          <strong>Can’t find a club or course?</strong>
          <span>
            Submit the details to the administrator and we’ll investigate
            adding it to the catalogue.
          </span>
        </div>
        <button type="button" onClick={onReportMissingCourse}>
          Submit club or course
        </button>
      </aside>
    </section>
  )
}

export default CourseSearch
