import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildAdminSubmissionsPath,
  isAdminSubmissionsResponse,
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_TYPES,
  SUBMISSION_TYPE_LABELS,
  type AdminSubmissionsResponse,
  type SubmissionStatus,
  type SubmissionStatusUpdate,
  type SubmissionType,
} from './submissionApi.ts'
import SubmissionConversation from './SubmissionConversation.tsx'
import './AdminSubmissionQueue.css'

const PAGE_SIZE = 10

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readQueueError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  return isRecord(body) && typeof body.error === 'string'
    ? body.error
    : fallback
}

function formatQueueDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function AdminSubmissionQueue() {
  const [draftSearch, setDraftSearch] = useState('')
  const [draftStatus, setDraftStatus] = useState<SubmissionStatus | ''>('')
  const [draftType, setDraftType] = useState<SubmissionType | ''>('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SubmissionStatus | ''>('')
  const [type, setType] = useState<SubmissionType | ''>('')
  const [page, setPage] = useState(1)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [response, setResponse] =
    useState<AdminSubmissionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadSubmissions() {
      setIsLoading(true)
      setError('')

      try {
        const apiResponse = await authenticatedFetch(
          buildAdminSubmissionsPath({
            search,
            status,
            type,
            page,
            pageSize: PAGE_SIZE,
          }),
          { signal: controller.signal },
        )

        if (!apiResponse.ok) {
          throw new Error(
            await readQueueError(
              apiResponse,
              'We could not load the support request queue.',
            ),
          )
        }

        const body: unknown = await apiResponse.json()

        if (!isAdminSubmissionsResponse(body)) {
          throw new Error('The support request queue returned was incomplete.')
        }

        setResponse(body)
      } catch (loadError: unknown) {
        if (
          loadError instanceof DOMException &&
          loadError.name === 'AbortError'
        ) {
          return
        }

        setError(
          loadError instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : loadError instanceof Error
              ? loadError.message
              : 'We could not load the support request queue.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadSubmissions()
    return () => controller.abort()
  }, [loadAttempt, page, search, status, type])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSearch = draftSearch.trim()
    const filtersAreUnchanged =
      page === 1 &&
      search === nextSearch &&
      status === draftStatus &&
      type === draftType

    setPage(1)
    setSearch(nextSearch)
    setStatus(draftStatus)
    setType(draftType)

    if (filtersAreUnchanged) {
      setLoadAttempt((value) => value + 1)
    }
  }

  function clearFilters() {
    const filtersAreClear =
      page === 1 && search === '' && status === '' && type === ''

    setDraftSearch('')
    setDraftStatus('')
    setDraftType('')
    setPage(1)
    setSearch('')
    setStatus('')
    setType('')

    if (filtersAreClear) {
      setLoadAttempt((value) => value + 1)
    }
  }

  function updateSubmissionStatus(update: SubmissionStatusUpdate) {
    setResponse((current) =>
      current
        ? {
            ...current,
            submissions: current.submissions.map((submission) =>
              submission.id === update.id
                ? {
                    ...submission,
                    status: update.status,
                    updatedAt: update.updatedAt,
                  }
                : submission,
            ),
          }
        : current,
    )
  }

  const pagination = response?.pagination
  const pageCount = Math.max(pagination?.totalPages ?? 0, 1)
  const hasAppliedFilters = Boolean(search || status || type)

  return (
    <section
      className="admin-panel admin-submission-queue"
      aria-labelledby="admin-submission-title"
    >
      <div className="admin-panel-heading admin-submission-heading">
        <div>
          <p>Player support</p>
          <h2 id="admin-submission-title">Request queue</h2>
        </div>
        <span>Response tools</span>
      </div>

      <form className="admin-submission-filters" onSubmit={applyFilters}>
        <label>
          Search requests or players
          <input
            type="search"
            maxLength={100}
            value={draftSearch}
            placeholder="Subject, details, club, name or email"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={draftStatus}
            onChange={(event) =>
              setDraftStatus(event.target.value as SubmissionStatus | '')
            }
          >
            <option value="">All statuses</option>
            {SUBMISSION_STATUSES.map((submissionStatus) => (
              <option key={submissionStatus} value={submissionStatus}>
                {SUBMISSION_STATUS_LABELS[submissionStatus]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            value={draftType}
            onChange={(event) =>
              setDraftType(event.target.value as SubmissionType | '')
            }
          >
            <option value="">All request types</option>
            {SUBMISSION_TYPES.map((submissionType) => (
              <option key={submissionType} value={submissionType}>
                {SUBMISSION_TYPE_LABELS[submissionType]}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-submission-filter-actions">
          <button type="submit" disabled={isLoading}>
            Apply filters
          </button>
          <button type="button" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="admin-state" role="status">
          Loading support requests…
        </div>
      ) : error ? (
        <div className="admin-state admin-state-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setLoadAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : response ? (
        <>
          <div className="admin-results-meta" aria-live="polite">
            <span>
              {response.pagination.total}{' '}
              {response.pagination.total === 1 ? 'request' : 'requests'}
              {hasAppliedFilters ? ' matching these filters' : ''}
            </span>
            <span>
              Page {response.pagination.page} of {pageCount}
            </span>
          </div>

          {response.submissions.length === 0 ? (
            <p className="admin-empty">
              {hasAppliedFilters
                ? 'No support requests match these filters.'
                : 'No support requests have been submitted yet.'}
            </p>
          ) : (
            <div className="admin-submission-list">
              {response.submissions.map((submission) => (
                <article key={submission.id}>
                  <div className="admin-submission-meta">
                    <span
                      className={`admin-submission-status admin-submission-status-${submission.status.toLowerCase()}`}
                    >
                      {SUBMISSION_STATUS_LABELS[submission.status]}
                    </span>
                    <span>{SUBMISSION_TYPE_LABELS[submission.type]}</span>
                    <time dateTime={submission.createdAt}>
                      {formatQueueDate(submission.createdAt)}
                    </time>
                  </div>
                  <div className="admin-submission-content">
                    <div>
                      <h3>{submission.subject}</h3>
                      <p>{submission.message}</p>
                    </div>
                    <div className="admin-submission-player">
                      <small>Submitted by</small>
                      <strong>{submission.user.name}</strong>
                      <span>{submission.user.email}</span>
                    </div>
                  </div>

                  {submission.clubName ? (
                    <dl className="admin-submission-course">
                      <div>
                        <dt>Club</dt>
                        <dd>{submission.clubName}</dd>
                      </div>
                      <div>
                        <dt>Area</dt>
                        <dd>{submission.townCounty}</dd>
                      </div>
                      {submission.courseName ? (
                        <div>
                          <dt>Course</dt>
                          <dd>{submission.courseName}</dd>
                        </div>
                      ) : null}
                      {submission.teeDetails ? (
                        <div>
                          <dt>Tee details</dt>
                          <dd>{submission.teeDetails}</dd>
                        </div>
                      ) : null}
                      {submission.websiteUrl ? (
                        <div>
                          <dt>Website</dt>
                          <dd>
                            <a
                              href={submission.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Visit club website
                            </a>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                  <SubmissionConversation
                    administrator
                    submissionId={submission.id}
                    status={submission.status}
                    onStatusUpdated={updateSubmissionStatus}
                  />
                </article>
              ))}
            </div>
          )}

          <nav
            className="admin-pagination"
            aria-label="Support request queue pages"
          >
            <button
              type="button"
              disabled={response.pagination.page <= 1 || isLoading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <span>{response.pagination.page}</span>
            <button
              type="button"
              disabled={
                response.pagination.totalPages === 0 ||
                response.pagination.page >= response.pagination.totalPages ||
                isLoading
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
    </section>
  )
}

export default AdminSubmissionQueue
