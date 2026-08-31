import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildAdminUsersPath,
  isAdminOverview,
  isAdminUsersResponse,
  type AdminOverview,
  type AdminUser,
  type AdminUsersResponse,
} from './adminApi.ts'
import './AdminPortal.css'

type AdminPortalProps = {
  administratorName: string
}

const PAGE_SIZE = 20

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
  const [usersResponse, setUsersResponse] =
    useState<AdminUsersResponse | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [overviewAttempt, setOverviewAttempt] = useState(0)
  const [usersAttempt, setUsersAttempt] = useState(0)
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [usersError, setUsersError] = useState('')

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

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsers() {
      setIsUsersLoading(true)
      setUsersError('')

      try {
        const response = await authenticatedFetch(
          buildAdminUsersPath(search, page, PAGE_SIZE),
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            await readAdminApiError(
              response,
              'We could not load the player directory.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!isAdminUsersResponse(body)) {
          throw new Error('The player directory returned was incomplete.')
        }

        setUsersResponse(body)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setUsersError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load the player directory.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsUsersLoading(false)
        }
      }
    }

    void loadUsers()

    return () => controller.abort()
  }, [page, search, usersAttempt])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSearch = searchInput.trim()

    setPage(1)
    setSearch(nextSearch)

    if (page === 1 && search === nextSearch) {
      setUsersAttempt((value) => value + 1)
    }
  }

  const pagination = usersResponse?.pagination
  const displayPageCount = Math.max(pagination?.totalPages ?? 0, 1)

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
            <strong>Read-only access</strong>
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

      <section className="admin-panel admin-directory" aria-labelledby="player-directory-title">
        <div className="admin-panel-heading admin-directory-heading">
          <div>
            <p>Account directory</p>
            <h2 id="player-directory-title">Players</h2>
          </div>
          <form className="admin-search" role="search" onSubmit={submitSearch}>
            <label htmlFor="admin-user-search">Search by name or email</label>
            <div>
              <input
                id="admin-user-search"
                type="search"
                maxLength={100}
                value={searchInput}
                placeholder="e.g. Tiger Woods"
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button type="submit" disabled={isUsersLoading}>
                Search
              </button>
            </div>
          </form>
        </div>

        {isUsersLoading ? (
          <div className="admin-state" role="status">
            Loading player directory…
          </div>
        ) : usersError ? (
          <div className="admin-state admin-state-error" role="alert">
            <p>{usersError}</p>
            <button
              type="button"
              onClick={() => setUsersAttempt((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : usersResponse ? (
          <>
            <div className="admin-results-meta" aria-live="polite">
              <span>
                {usersResponse.pagination.total}{' '}
                {usersResponse.pagination.total === 1 ? 'profile' : 'profiles'}
                {search ? ` matching “${search}”` : ''}
              </span>
              <span>
                Page {usersResponse.pagination.page} of {displayPageCount}
              </span>
            </div>

            {usersResponse.users.length === 0 ? (
              <p className="admin-empty">
                {search
                  ? 'No player profiles match that search.'
                  : 'No player profiles are available.'}
              </p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-user-table">
                  <thead>
                    <tr>
                      <th scope="col">Player</th>
                      <th scope="col">Role</th>
                      <th scope="col">Home club</th>
                      <th scope="col">Handicap</th>
                      <th scope="col">Rounds</th>
                      <th scope="col">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersResponse.users.map((user) => (
                      <tr key={user.id}>
                        <td><UserIdentity user={user} /></td>
                        <td>
                          <span className={`admin-role admin-role-${user.role.toLowerCase()}`}>
                            {user.role === 'ADMIN' ? 'Admin' : 'Player'}
                          </span>
                        </td>
                        <td>{user.homeClub?.name ?? 'Not set'}</td>
                        <td>{user.handicapIndex ?? '—'}</td>
                        <td>{user.roundCount}</td>
                        <td>
                          <time dateTime={user.createdAt}>
                            {formatAdminDate(user.createdAt)}
                          </time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <nav className="admin-pagination" aria-label="Player directory pages">
              <button
                type="button"
                disabled={usersResponse.pagination.page <= 1 || isUsersLoading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </button>
              <span>{usersResponse.pagination.page}</span>
              <button
                type="button"
                disabled={
                  usersResponse.pagination.totalPages === 0 ||
                  usersResponse.pagination.page >= usersResponse.pagination.totalPages ||
                  isUsersLoading
                }
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </nav>
          </>
        ) : null}
      </section>
    </section>
  )
}

export default AdminPortal
