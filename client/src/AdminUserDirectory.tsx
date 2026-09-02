import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildAdminUserPath,
  buildAdminUsersPath,
  buildAdminUserStatusPath,
  isAdminUser,
  isAdminUsersResponse,
  type AdminUser,
  type AdminUsersResponse,
  type AdminUserStatus,
} from './adminApi.ts'

type AdminUserDirectoryProps = {
  onUsersChanged: () => void
}

const PAGE_SIZE = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readAccountError(
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

function AdminUserDirectory({ onUsersChanged }: AdminUserDirectoryProps) {
  const [usersResponse, setUsersResponse] =
    useState<AdminUsersResponse | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createNotice, setCreateNotice] = useState('')
  const [managedUser, setManagedUser] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showSuspendConfirmation, setShowSuspendConfirmation] =
    useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [mutationNotice, setMutationNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsers() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await authenticatedFetch(
          buildAdminUsersPath(search, page, PAGE_SIZE),
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            await readAccountError(
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

        setLoadError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load the player directory.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadUsers()
    return () => controller.abort()
  }, [loadAttempt, page, search])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSearch = searchInput.trim()

    setPage(1)
    setSearch(nextSearch)

    if (page === 1 && search === nextSearch) {
      setLoadAttempt((value) => value + 1)
    }
  }

  function replaceUser(updatedUser: AdminUser) {
    setUsersResponse((current) =>
      current
        ? {
            ...current,
            users: current.users.map((user) =>
              user.id === updatedUser.id ? updatedUser : user,
            ),
          }
        : current,
    )
    setManagedUser(updatedUser)
  }

  function manageUser(user: AdminUser) {
    setManagedUser(user)
    setEditName(user.name)
    setEditEmail(user.email)
    setDeleteConfirmation('')
    setShowSuspendConfirmation(false)
    setMutationError('')
    setMutationNotice('')
  }

  async function createPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setCreateError('')
    setCreateNotice('')

    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, email: createEmail }),
      })

      if (!response.ok) {
        throw new Error(
          await readAccountError(
            response,
            'We could not invite this player.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isAdminUser(body)) {
        throw new Error('The invited player returned was incomplete.')
      }

      setCreateName('')
      setCreateEmail('')
      setCreateNotice(
        `Invitation sent to ${body.email}. They must use the email link to choose their password.`,
      )
      setPage(1)
      setLoadAttempt((value) => value + 1)
      onUsersChanged()
    } catch (error: unknown) {
      setCreateError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not invite this player.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function updatePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!managedUser) {
      return
    }

    setIsMutating(true)
    setMutationError('')
    setMutationNotice('')

    try {
      const response = await authenticatedFetch(
        buildAdminUserPath(managedUser.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, email: editEmail }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await readAccountError(
            response,
            'We could not update this player.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isAdminUser(body)) {
        throw new Error('The updated player returned was incomplete.')
      }

      replaceUser(body)
      setEditName(body.name)
      setEditEmail(body.email)
      setMutationNotice('Player details updated and recorded in the audit log.')
      onUsersChanged()
    } catch (error: unknown) {
      setMutationError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not update this player.',
      )
    } finally {
      setIsMutating(false)
    }
  }

  async function updateStatus(status: AdminUserStatus) {
    if (!managedUser) {
      return
    }

    setIsMutating(true)
    setMutationError('')
    setMutationNotice('')

    try {
      const response = await authenticatedFetch(
        buildAdminUserStatusPath(managedUser.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await readAccountError(
            response,
            'We could not change this account status.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isAdminUser(body)) {
        throw new Error('The updated account returned was incomplete.')
      }

      replaceUser(body)
      setShowSuspendConfirmation(false)
      setDeleteConfirmation('')
      setMutationNotice(
        status === 'SUSPENDED'
          ? 'Account suspended. The player can no longer use Fore the Record.'
          : 'Account restored. The player can sign in again.',
      )
      onUsersChanged()
    } catch (error: unknown) {
      setMutationError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not change this account status.',
      )
    } finally {
      setIsMutating(false)
    }
  }

  async function deletePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!managedUser) {
      return
    }

    setIsMutating(true)
    setMutationError('')
    setMutationNotice('')

    try {
      const response = await authenticatedFetch(
        buildAdminUserPath(managedUser.id),
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: deleteConfirmation }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await readAccountError(
            response,
            'We could not permanently delete this player.',
          ),
        )
      }

      setManagedUser(null)
      setDeleteConfirmation('')
      setLoadAttempt((value) => value + 1)
      setCreateNotice('Player account and associated records permanently deleted.')
      onUsersChanged()
    } catch (error: unknown) {
      setMutationError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not permanently delete this player.',
      )
    } finally {
      setIsMutating(false)
    }
  }

  const pagination = usersResponse?.pagination
  const displayPageCount = Math.max(pagination?.totalPages ?? 0, 1)
  const deleteMatches =
    managedUser !== null &&
    deleteConfirmation.trim().toLowerCase() === managedUser.email.toLowerCase()

  return (
    <section
      className="admin-panel admin-directory"
      aria-labelledby="player-directory-title"
    >
      <div className="admin-panel-heading admin-directory-heading">
        <div>
          <p>Account management</p>
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
            <button type="submit" disabled={isLoading}>
              Search
            </button>
          </div>
        </form>
      </div>

      <section className="admin-account-create" aria-labelledby="invite-player-title">
        <div>
          <p>Secure invitation</p>
          <h3 id="invite-player-title">Invite a new player</h3>
          <span>
            The player receives a secure email link and chooses their own password.
            Administrators never see or set passwords.
          </span>
        </div>
        <form onSubmit={createPlayer} noValidate>
          <label>
            Full name
            <input
              type="text"
              maxLength={120}
              autoComplete="off"
              value={createName}
              placeholder="e.g. Tiger Woods"
              onChange={(event) => {
                setCreateName(event.target.value)
                setCreateError('')
                setCreateNotice('')
              }}
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              maxLength={320}
              autoComplete="off"
              value={createEmail}
              placeholder="player@example.com"
              onChange={(event) => {
                setCreateEmail(event.target.value)
                setCreateError('')
                setCreateNotice('')
              }}
            />
          </label>
          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Sending invitation…' : 'Invite player'}
          </button>
        </form>
        {createError ? <p className="admin-account-error" role="alert">{createError}</p> : null}
        {createNotice ? <p className="admin-account-notice" role="status">{createNotice}</p> : null}
      </section>

      {isLoading ? (
        <div className="admin-state" role="status">
          Loading player directory…
        </div>
      ) : loadError ? (
        <div className="admin-state admin-state-error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
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
                    <th scope="col">Status</th>
                    <th scope="col">Role</th>
                    <th scope="col">Home club</th>
                    <th scope="col">Handicap</th>
                    <th scope="col">Rounds</th>
                    <th scope="col">Joined</th>
                    <th scope="col">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {usersResponse.users.map((user) => (
                    <tr key={user.id}>
                      <td><UserIdentity user={user} /></td>
                      <td>
                        <span className={`admin-account-status admin-account-status-${user.status.toLowerCase()}`}>
                          {user.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-role admin-role-${user.role.toLowerCase()}`}>
                          {user.role === 'ADMIN' ? 'Admin' : 'Player'}
                        </span>
                      </td>
                      <td>{user.homeClub?.name ?? 'Not set'}</td>
                      <td>{user.handicapIndex ?? '—'}</td>
                      <td>{user.roundCount}</td>
                      <td><time dateTime={user.createdAt}>{formatAdminDate(user.createdAt)}</time></td>
                      <td>
                        {user.role === 'ADMIN' ? (
                          <span className="admin-protected-account">Protected</span>
                        ) : (
                          <button
                            className="admin-manage-button"
                            type="button"
                            onClick={() => manageUser(user)}
                          >
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {managedUser ? (
            <section className="admin-account-editor" aria-labelledby="manage-player-title">
              <header>
                <div>
                  <p>Selected player</p>
                  <h3 id="manage-player-title">Manage {managedUser.name}</h3>
                </div>
                <button type="button" onClick={() => setManagedUser(null)}>
                  Close
                </button>
              </header>

              <form className="admin-account-edit-form" onSubmit={updatePlayer} noValidate>
                <label>
                  Full name
                  <input
                    type="text"
                    maxLength={120}
                    value={editName}
                    onChange={(event) => {
                      setEditName(event.target.value)
                      setMutationError('')
                      setMutationNotice('')
                    }}
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    maxLength={320}
                    value={editEmail}
                    onChange={(event) => {
                      setEditEmail(event.target.value)
                      setMutationError('')
                      setMutationNotice('')
                    }}
                  />
                </label>
                <button type="submit" disabled={isMutating}>Save details</button>
              </form>

              <div className="admin-account-access">
                <div>
                  <strong>Account access</strong>
                  <span>
                    {managedUser.status === 'ACTIVE'
                      ? 'Suspension blocks sign-in and every protected application request.'
                      : 'This player is suspended and cannot use Fore the Record.'}
                  </span>
                </div>
                {managedUser.status === 'ACTIVE' ? (
                  showSuspendConfirmation ? (
                    <div className="admin-account-confirm-actions">
                      <button type="button" disabled={isMutating} onClick={() => void updateStatus('SUSPENDED')}>
                        Confirm suspension
                      </button>
                      <button type="button" onClick={() => setShowSuspendConfirmation(false)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowSuspendConfirmation(true)}>
                      Suspend account
                    </button>
                  )
                ) : (
                  <button type="button" disabled={isMutating} onClick={() => void updateStatus('ACTIVE')}>
                    Restore account
                  </button>
                )}
              </div>

              {managedUser.status === 'SUSPENDED' ? (
                <form className="admin-account-delete" onSubmit={deletePlayer}>
                  <div>
                    <strong>Permanently delete account</strong>
                    <span>
                      This removes the login, profile, rounds, scorecards, and support requests. It cannot be undone.
                    </span>
                  </div>
                  <label>
                    Type {managedUser.email} to confirm
                    <input
                      type="email"
                      value={deleteConfirmation}
                      onChange={(event) => {
                        setDeleteConfirmation(event.target.value)
                        setMutationError('')
                      }}
                    />
                  </label>
                  <button type="submit" disabled={isMutating || !deleteMatches}>
                    Permanently delete
                  </button>
                </form>
              ) : null}

              {mutationError ? <p className="admin-account-error" role="alert">{mutationError}</p> : null}
              {mutationNotice ? <p className="admin-account-notice" role="status">{mutationNotice}</p> : null}
            </section>
          ) : null}

          <nav className="admin-pagination" aria-label="Player directory pages">
            <button
              type="button"
              disabled={usersResponse.pagination.page <= 1 || isLoading}
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

export default AdminUserDirectory
