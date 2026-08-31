import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildSubmissionsPath,
  isSubmission,
  isSubmissionsResponse,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
  SUBMISSION_TYPES,
  type SubmissionType,
  type SubmissionsResponse,
} from './submissionApi.ts'
import SubmissionConversation from './SubmissionConversation.tsx'
import './Support.css'

const PAGE_SIZE = 10

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readSupportError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return isRecord(body) && typeof body.error === 'string'
    ? body.error
    : fallback
}

function formatSupportDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function Support() {
  const [type, setType] = useState<SubmissionType>('IDEA')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [clubName, setClubName] = useState('')
  const [townCounty, setTownCounty] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [courseName, setCourseName] = useState('')
  const [teeDetails, setTeeDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitNotice, setSubmitNotice] = useState('')
  const [submissionsResponse, setSubmissionsResponse] =
    useState<SubmissionsResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadSubmissions() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await authenticatedFetch(
          buildSubmissionsPath(page, PAGE_SIZE),
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            await readSupportError(
              response,
              'We could not load your support requests.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!isSubmissionsResponse(body)) {
          throw new Error('Your support history returned was incomplete.')
        }

        setSubmissionsResponse(body)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setLoadError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load your support requests.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadSubmissions()
    return () => controller.abort()
  }, [loadAttempt, page])

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitNotice('')

    try {
      const response = await authenticatedFetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject,
          message,
          ...(type === 'MISSING_COURSE'
            ? {
                clubName,
                townCounty,
                websiteUrl,
                courseName,
                teeDetails,
              }
            : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await readSupportError(
            response,
            'We could not submit your request. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isSubmission(body)) {
        throw new Error('The saved support request returned was incomplete.')
      }

      setSubject('')
      setMessage('')
      setClubName('')
      setTownCounty('')
      setWebsiteUrl('')
      setCourseName('')
      setTeeDetails('')
      setSubmitNotice('Your request has been sent to the administrator.')
      setPage(1)
      setLoadAttempt((value) => value + 1)
    } catch (error: unknown) {
      setSubmitError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not submit your request. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const pagination = submissionsResponse?.pagination
  const pageCount = Math.max(pagination?.totalPages ?? 0, 1)

  return (
    <section className="support-page" id="support">
      <header className="support-hero">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" /> Support and feedback
          </p>
          <h1>
            Help shape
            <span>the next round.</span>
          </h1>
        </div>
        <p>
          Share an idea, report a problem, flag incorrect information, or tell
          us about a course that is missing.
        </p>
      </header>

      <div className="support-layout">
        <section className="support-form-card" aria-labelledby="support-form-title">
          <p className="form-kicker">New request</p>
          <h2 id="support-form-title">What can we help with?</h2>

          <form onSubmit={submitRequest}>
            <label>
              Request type
              <select
                value={type}
                disabled={isSubmitting}
                onChange={(event) => {
                  setType(event.target.value as SubmissionType)
                  setSubmitError('')
                  setSubmitNotice('')
                }}
              >
                {SUBMISSION_TYPES.map((submissionType) => (
                  <option key={submissionType} value={submissionType}>
                    {SUBMISSION_TYPE_LABELS[submissionType]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Subject
              <input
                required
                minLength={5}
                maxLength={120}
                value={subject}
                disabled={isSubmitting}
                placeholder="A short summary"
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>

            <label>
              Details
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={6}
                value={message}
                disabled={isSubmitting}
                placeholder="Tell us what happened or what you would like to see"
                onChange={(event) => setMessage(event.target.value)}
              />
              <small>{message.length}/2000 characters</small>
            </label>

            {type === 'MISSING_COURSE' ? (
              <fieldset>
                <legend>Course details</legend>
                <label>
                  Club name
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={clubName}
                    disabled={isSubmitting}
                    onChange={(event) => setClubName(event.target.value)}
                  />
                </label>
                <label>
                  Town or county
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={townCounty}
                    disabled={isSubmitting}
                    onChange={(event) => setTownCounty(event.target.value)}
                  />
                </label>
                <label>
                  Club website <span>Optional</span>
                  <input
                    type="url"
                    maxLength={500}
                    value={websiteUrl}
                    disabled={isSubmitting}
                    placeholder="https://example.com"
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                  />
                </label>
                <label>
                  Course name <span>Optional</span>
                  <input
                    maxLength={160}
                    value={courseName}
                    disabled={isSubmitting}
                    onChange={(event) => setCourseName(event.target.value)}
                  />
                </label>
                <label>
                  Known tee details <span>Optional</span>
                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={teeDetails}
                    disabled={isSubmitting}
                    onChange={(event) => setTeeDetails(event.target.value)}
                  />
                </label>
              </fieldset>
            ) : null}

            {submitError ? (
              <p className="support-message support-error" role="alert">
                {submitError}
              </p>
            ) : null}
            {submitNotice ? (
              <p className="support-message support-success" role="status">
                {submitNotice}
              </p>
            ) : null}

            <button className="support-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send request'}
            </button>
          </form>
        </section>

        <section className="support-history" aria-labelledby="support-history-title">
          <div className="support-history-heading">
            <div>
              <p>Your requests</p>
              <h2 id="support-history-title">Previous requests</h2>
            </div>
            {pagination ? <span>{pagination.total} total</span> : null}
          </div>

          {isLoading ? (
            <div className="support-state" role="status">
              Loading your requests…
            </div>
          ) : loadError ? (
            <div className="support-state support-state-error" role="alert">
              <p>{loadError}</p>
              <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
                Try again
              </button>
            </div>
          ) : submissionsResponse?.submissions.length === 0 ? (
            <div className="support-state">
              Your submitted requests and their progress will appear here.
            </div>
          ) : submissionsResponse ? (
            <>
              <div className="support-request-list">
                {submissionsResponse.submissions.map((submission) => (
                  <article key={submission.id}>
                    <div className="support-request-meta">
                      <span className={`submission-status submission-status-${submission.status.toLowerCase()}`}>
                        {SUBMISSION_STATUS_LABELS[submission.status]}
                      </span>
                      <span>{SUBMISSION_TYPE_LABELS[submission.type]}</span>
                      <time dateTime={submission.createdAt}>
                        {formatSupportDate(submission.createdAt)}
                      </time>
                    </div>
                    <h3>{submission.subject}</h3>
                    <p>{submission.message}</p>
                    {submission.clubName ? (
                      <dl className="support-course-details">
                        <div><dt>Club</dt><dd>{submission.clubName}</dd></div>
                        <div><dt>Area</dt><dd>{submission.townCounty}</dd></div>
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
                      submissionId={submission.id}
                      status={submission.status}
                    />
                  </article>
                ))}
              </div>
              <nav className="support-pagination" aria-label="Support request pages">
                <button
                  type="button"
                  disabled={submissionsResponse.pagination.page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </button>
                <span>Page {submissionsResponse.pagination.page} of {pageCount}</span>
                <button
                  type="button"
                  disabled={
                    submissionsResponse.pagination.totalPages === 0 ||
                    submissionsResponse.pagination.page >= submissionsResponse.pagination.totalPages
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          ) : null}
        </section>
      </div>
    </section>
  )
}

export default Support
