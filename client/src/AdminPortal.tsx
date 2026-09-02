import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import AdminSubmissionQueue from './AdminSubmissionQueue.tsx'
import AdminScorecardReviews from './AdminScorecardReviews.tsx'
import AdminUserDirectory from './AdminUserDirectory.tsx'
import {
  isAdminOverview,
  type AdminOverview,
  type AdminUser,
} from './adminApi.ts'
import './AdminPortal.css'

type AdminPortalProps = {
  administratorName: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readAdminApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  return isRecord(body) && typeof body.error === 'string'
    ? body.error
    : fallback
}

function formatAdminDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function UserIdentity({ user }: { user: AdminUser }) {
  return (
    <div className="admin-user-identity">
      <strong>{user.name}</strong>
      <span>{user.email}</span>
    </div>
  )
}

function AdminPortal({ administratorName }: AdminPortalProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [overviewAttempt, setOverviewAttempt] = useState(0)
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadOverview() {
      setIsOverviewLoading(true)
      setOverviewError('')

      try {
        const response = await authenticatedFetch('/api/admin/overview', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(
            await readAdminApiError(
              response,
              'We could not load the administrator overview.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!isAdminOverview(body)) {
          throw new Error('The administrator overview returned was incomplete.')
        }

        setOverview(body)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setOverviewError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load the administrator overview.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsOverviewLoading(false)
        }
      }
    }

    void loadOverview()

    return () => controller.abort()
  }, [overviewAttempt])

  return (
    <section className="admin-page" id="admin">
      <header className="admin-hero">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" /> Administration
          </p>
          <h1>
            Clubhouse
            <span>overview.</span>
          </h1>
        </div>
        <div className="admin-access-note">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Administrator access</strong>
            <small>Signed in as {administratorName}</small>
          </div>
        </div>
      </header>

      {isOverviewLoading ? (
        <div className="admin-state" role="status">
          Loading administrator overview…
        </div>
      ) : overviewError ? (
        <div className="admin-state admin-state-error" role="alert">
          <p>{overviewError}</p>
          <button
            type="button"
            onClick={() => setOverviewAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : overview ? (
        <>
          <section className="admin-summary" aria-label="Site totals">
            <article>
              <small>Player profiles</small>
              <strong>{overview.totals.users}</strong>
              <span>Accounts in the record</span>
            </article>
            <article>
              <small>Rounds recorded</small>
              <strong>{overview.totals.rounds}</strong>
              <span>Scorecards submitted</span>
            </article>
            <article>
              <small>Saved clubs</small>
              <strong>{overview.totals.clubs}</strong>
              <span>Course library coverage</span>
            </article>
          </section>

          <section className="admin-panel" aria-labelledby="recent-users-title">
            <div className="admin-panel-heading">
              <div>
                <p>Latest activity</p>
                <h2 id="recent-users-title">Recent registrations</h2>
              </div>
              <span>Latest five</span>
            </div>

            {overview.recentRegistrations.length === 0 ? (
              <p className="admin-empty">No profiles have been registered yet.</p>
            ) : (
              <ul className="admin-recent-list">
                {overview.recentRegistrations.map((user) => (
                  <li key={user.id}>
                    <UserIdentity user={user} />
                    <span>{user.homeClub?.name ?? 'No home club'}</span>
                    <span>
                      {user.roundCount}{' '}
                      {user.roundCount === 1 ? 'round' : 'rounds'}
                    </span>
                    <time dateTime={user.createdAt}>
                      {formatAdminDate(user.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <AdminSubmissionQueue />

      <AdminScorecardReviews />

      <AdminUserDirectory
        onUsersChanged={() => setOverviewAttempt((value) => value + 1)}
      />
    </section>
  )
}

export default AdminPortal
