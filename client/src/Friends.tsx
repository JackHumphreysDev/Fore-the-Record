import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildFriendSearchPath,
  isFriendsResponse,
  isFriendSearchResponse,
  type FriendPlayer,
  type FriendsResponse,
  type FriendSearchPlayer,
  type FriendshipItem,
} from './friendsApi.ts'
import './Friends.css'

type FriendsProps = { profileId: string }

async function readError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body &&
    typeof body.error === 'string'
    ? body.error
    : fallback
}

function PlayerIdentity({ player }: { player: FriendPlayer }) {
  return (
    <div className="friend-identity">
      <span aria-hidden="true">{player.name.trim()[0]?.toUpperCase()}</span>
      <div>
        <strong>{player.name}</strong>
        <small>{player.homeClub?.name ?? 'Home club not set'}</small>
      </div>
      <div className="friend-handicap">
        <small>Handicap</small>
        <strong>
          {!player.handicapVisible
            ? 'Handicap hidden'
            : player.handicapIndex === null
              ? 'Awaiting handicap'
              : player.handicapIndex.toFixed(1)}
        </strong>
      </div>
    </div>
  )
}

function Friends({ profileId }: FriendsProps) {
  const [data, setData] = useState<FriendsResponse | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<FriendSearchPlayer[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadFriends() {
      setIsLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch('/api/users/me/friends', {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(await readError(response, 'We could not load your friends.'))
        }
        const body: unknown = await response.json()
        if (!isFriendsResponse(body)) {
          throw new Error('The friend details returned were incomplete.')
        }
        if (!controller.signal.aborted) setData(body)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'We could not load your friends.',
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void loadFriends()
    return () => controller.abort()
  }, [profileId, refresh])

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = search.trim()
    if (term.length < 2) {
      setError('Enter at least 2 characters to search for a player')
      return
    }
    setIsSearching(true)
    setError('')
    setMessage('')
    try {
      const response = await authenticatedFetch(buildFriendSearchPath(term))
      if (!response.ok) {
        throw new Error(await readError(response, 'We could not search for players.'))
      }
      const body: unknown = await response.json()
      if (!isFriendSearchResponse(body)) {
        throw new Error('The player search results were incomplete.')
      }
      setResults(body.players)
      if (body.players.length === 0) {
        setMessage('No active player profiles matched that name.')
      }
    } catch (searchError: unknown) {
      setResults([])
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'We could not search for players.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  async function mutate(
    id: string,
    path: string,
    init: RequestInit,
    successMessage: string,
  ) {
    setBusyId(id)
    setError('')
    setMessage('')
    try {
      const response = await authenticatedFetch(path, init)
      if (!response.ok) {
        throw new Error(await readError(response, 'We could not update that connection.'))
      }
      setMessage(successMessage)
      setResults([])
      setSearch('')
      setRefresh((value) => value + 1)
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'We could not update that connection.',
      )
    } finally {
      setBusyId('')
    }
  }

  function sendRequest(player: FriendSearchPlayer) {
    void mutate(
      player.id,
      '/api/users/me/friend-requests',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      },
      `Friend request sent to ${player.name}.`,
    )
  }

  function respond(item: FriendshipItem, action: 'accept' | 'decline') {
    void mutate(
      item.id,
      `/api/users/me/friend-requests/${encodeURIComponent(item.id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      },
      action === 'accept'
        ? `${item.player.name} is now your friend.`
        : `Friend request from ${item.player.name} declined.`,
    )
  }

  function remove(path: string, item: FriendshipItem, messageText: string) {
    void mutate(item.id, path, { method: 'DELETE' }, messageText)
  }

  return (
    <section className="friends-page" aria-labelledby="friends-title">
      <header className="friends-heading">
        <p className="eyebrow"><span aria-hidden="true" /> Player connections</p>
        <h1 id="friends-title">Friends.</h1>
        <p>
          Find players by name, use their home club to identify the right
          account, and follow each other’s current Handicap Index.
        </p>
      </header>

      <form className="friend-search" onSubmit={runSearch} noValidate>
        <label>
          Player name
          <input
            type="search"
            value={search}
            placeholder="e.g. Tiger Woods"
            onChange={(event) => {
              setSearch(event.target.value)
              setError('')
              setMessage('')
            }}
          />
        </label>
        <button type="submit" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Find players'}
        </button>
        <small>
          Only names, home clubs, and current handicaps are shared. Emails,
          rounds, and private statistics stay hidden.
        </small>
      </form>

      {error ? <p className="friends-alert is-error" role="alert">{error}</p> : null}
      {message ? <p className="friends-alert" role="status">{message}</p> : null}

      {results.length > 0 ? (
        <section className="friend-section" aria-labelledby="search-results-title">
          <h2 id="search-results-title">Matching players</h2>
          <div className="friend-list">
            {results.map((player) => (
              <article className="friend-card" key={player.id}>
                <PlayerIdentity player={player} />
                {player.relationship?.status === 'ACCEPTED' ? (
                  <span className="friend-status">Already friends</span>
                ) : player.relationship?.status === 'PENDING' ? (
                  <span className="friend-status">
                    {player.relationship.direction === 'OUTGOING'
                      ? 'Request sent'
                      : 'Request received below'}
                  </span>
                ) : !player.acceptsFriendRequests ? (
                  <span className="friend-status">Not accepting requests</span>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === player.id}
                    onClick={() => sendRequest(player)}
                  >
                    {busyId === player.id ? 'Sending…' : 'Add friend'}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <div className="friends-state" aria-live="polite">Loading your connections…</div>
      ) : data ? (
        <div className="friend-sections">
          {data.incoming.length > 0 ? (
            <section className="friend-section" aria-labelledby="incoming-title">
              <h2 id="incoming-title">Requests to you</h2>
              <div className="friend-list">
                {data.incoming.map((item) => (
                  <article className="friend-card" key={item.id}>
                    <PlayerIdentity player={item.player} />
                    <div className="friend-actions">
                      <button type="button" disabled={busyId === item.id} onClick={() => respond(item, 'accept')}>Accept</button>
                      <button className="is-secondary" type="button" disabled={busyId === item.id} onClick={() => respond(item, 'decline')}>Decline</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="friend-section" aria-labelledby="your-friends-title">
            <h2 id="your-friends-title">Your friends</h2>
            {data.friends.length === 0 ? (
              <p className="friends-empty">No friends added yet. Search for a player above to get started.</p>
            ) : (
              <div className="friend-list">
                {data.friends.map((item) => (
                  <article className="friend-card" key={item.id}>
                    <PlayerIdentity player={item.player} />
                    <button className="is-secondary" type="button" disabled={busyId === item.id} onClick={() => remove(`/api/users/me/friends/${encodeURIComponent(item.id)}`, item, `${item.player.name} removed from your friends.`)}>Remove</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {data.outgoing.length > 0 ? (
            <section className="friend-section" aria-labelledby="outgoing-title">
              <h2 id="outgoing-title">Requests you sent</h2>
              <div className="friend-list">
                {data.outgoing.map((item) => (
                  <article className="friend-card" key={item.id}>
                    <PlayerIdentity player={item.player} />
                    <button className="is-secondary" type="button" disabled={busyId === item.id} onClick={() => remove(`/api/users/me/friend-requests/${encodeURIComponent(item.id)}`, item, `Request to ${item.player.name} cancelled.`)}>Cancel request</button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default Friends
