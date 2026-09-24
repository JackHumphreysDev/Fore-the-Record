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
import {
  buildFriendActivityPath,
  isFriendActivityResponse,
  type FriendActivityResponse,
} from './friendActivityApi.ts'
import './Friends.css'
import { buildRoundTagPath, isRoundTagsResponse, type RoundTag } from './roundTagsApi.ts'
import ChallengesBoard from './ChallengesBoard.tsx'
import SharedRounds from './SharedRounds.tsx'
import FriendGroups from './FriendGroups.tsx'
import PlayingPartnersHistory from './PlayingPartnersHistory.tsx'
import ProfileAvatar from './ProfileAvatar.tsx'
import KnockoutCompetitions from './KnockoutCompetitions.tsx'

type FriendsProps = { profileId: string; onOpenRound: (roundId: string) => void }

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
      <ProfileAvatar userId={player.id} name={player.name} hasImage={player.hasProfileImage} />
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

function formatActivityDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function roundLengthLabel(
  holeCount: 9 | 18,
  segment: 'FRONT_NINE' | 'BACK_NINE' | null,
): string {
  if (holeCount === 18) return '18 holes'
  return segment === 'BACK_NINE' ? 'Back 9' : 'Front 9'
}

function activityScoreLabel(
  participation: 'INDIVIDUAL' | 'TEAM',
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD',
  grossScore: number | null,
  stablefordPoints: number | null,
): string {
  if (participation === 'TEAM') return 'Team round'
  if (scoringFormat === 'STABLEFORD') {
    return stablefordPoints === null ? 'Points unavailable' : `${stablefordPoints} pts`
  }
  return grossScore === null ? 'Score unavailable' : `Gross ${grossScore}`
}

function Friends({ profileId, onOpenRound }: FriendsProps) {
  const [data, setData] = useState<FriendsResponse | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<FriendSearchPlayer[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [activity, setActivity] = useState<FriendActivityResponse | null>(null)
  const [activityPage, setActivityPage] = useState(1)
  const [activityError, setActivityError] = useState('')
  const [isLoadingActivity, setIsLoadingActivity] = useState(true)
  const [roundTags, setRoundTags] = useState<RoundTag[]>([])
  const [tagError, setTagError] = useState('')
  const [tagBusyId, setTagBusyId] = useState('')

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

  useEffect(() => {
    const controller = new AbortController()
    async function loadActivity() {
      setIsLoadingActivity(true)
      setActivityError('')
      try {
        const response = await authenticatedFetch(
          buildFriendActivityPath(activityPage),
          { signal: controller.signal },
        )
        if (!response.ok) {
          throw new Error(await readError(response, 'We could not load friend activity.'))
        }
        const body: unknown = await response.json()
        if (!isFriendActivityResponse(body)) {
          throw new Error('The friend activity returned was incomplete.')
        }
        if (!controller.signal.aborted) setActivity(body)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) {
          setActivityError(
            loadError instanceof Error
              ? loadError.message
              : 'We could not load friend activity.',
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingActivity(false)
      }
    }
    void loadActivity()
    return () => controller.abort()
  }, [profileId, refresh, activityPage])

  useEffect(() => {
    const controller = new AbortController()
    async function loadTags() {
      try {
        const response = await authenticatedFetch('/api/users/me/round-tags', { signal: controller.signal })
        if (!response.ok) throw new Error(await readError(response, 'We could not load rounds you were tagged in.'))
        const body: unknown = await response.json()
        if (!isRoundTagsResponse(body)) throw new Error('The round tags returned were incomplete.')
        if (!controller.signal.aborted) setRoundTags(body.tags)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setTagError(loadError instanceof Error ? loadError.message : 'We could not load rounds you were tagged in.')
      }
    }
    void loadTags()
    return () => controller.abort()
  }, [profileId, refresh])

  async function removeRoundTag(roundId: string) {
    setTagBusyId(roundId)
    setTagError('')
    try {
      const response = await authenticatedFetch(buildRoundTagPath(roundId), { method: 'DELETE' })
      if (!response.ok) throw new Error(await readError(response, 'We could not remove that tag.'))
      setRoundTags((current) => current.filter((tag) => tag.roundId !== roundId))
    } catch (removeError: unknown) {
      setTagError(removeError instanceof Error ? removeError.message : 'We could not remove that tag.')
    } finally {
      setTagBusyId('')
    }
  }

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
      setActivityPage(1)
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
          account, exchange requests, and follow the verified rounds friends
          choose to share.
        </p>
      </header>

      <section className="friend-activity" aria-labelledby="friend-activity-title">
        <div className="friend-activity-heading">
          <div>
            <p className="form-kicker">Latest rounds</p>
            <h2 id="friend-activity-title">Friends activity</h2>
          </div>
          {activity ? <span>{activity.pagination.total} shared {activity.pagination.total === 1 ? 'round' : 'rounds'}</span> : null}
        </div>

        {isLoadingActivity ? (
          <p className="friends-state" aria-live="polite">Loading friend activity…</p>
        ) : activityError ? (
          <p className="friends-alert is-error" role="alert">{activityError}</p>
        ) : activity && activity.activities.length > 0 ? (
          <>
            <div className="friend-activity-list">
              {activity.activities.map((item) => (
                <details className="friend-activity-card" key={item.id}>
                  <summary>
                    <span className="friend-activity-avatar" aria-hidden="true">{item.player.name.trim()[0]?.toUpperCase()}</span>
                    <span className="friend-activity-summary">
                      <strong>{item.player.name}</strong>
                      <small>{item.tee.course.club.name} · {item.tee.course.name}</small>
                    </span>
                    <span className="friend-activity-score">
                      <strong>{activityScoreLabel(item.participation, item.scoringFormat, item.grossScore, item.stablefordPoints)}</strong>
                      <small>{formatActivityDate(item.datePlayed)}</small>
                    </span>
                    <span className="friend-activity-chevron" aria-hidden="true">⌄</span>
                  </summary>
                  <dl>
                    <div><dt>Round</dt><dd>{item.category === 'COMPETITION' ? 'Competition' : item.category === 'SOCIAL_GAME' ? 'Game with friends' : 'Casual'} · {item.participation === 'TEAM' ? 'Team' : 'Individual'}</dd></div>
                    {item.gameFormat || item.competitionFormat ? <div><dt>Format</dt><dd>{item.gameFormat ?? item.competitionFormat}{item.gameResult ? ` · ${item.gameResult === 'WON' ? 'Won' : item.gameResult === 'LOST' ? 'Lost' : 'Tied'}` : ''}</dd></div> : null}
                    <div><dt>Length</dt><dd>{roundLengthLabel(item.holeCount, item.nineHoleSegment)}</dd></div>
                    <div><dt>Scoring</dt><dd>{item.participation === 'TEAM' ? 'Record only' : item.scoringFormat === 'STABLEFORD' ? 'Stableford' : 'Stroke play'}</dd></div>
                    <div><dt>Tee</dt><dd>{item.tee.teeName}</dd></div>
                    <div><dt>Home club</dt><dd>{item.player.homeClub?.name ?? 'Not set'}</dd></div>
                    <div><dt>Time</dt><dd>{item.timePlayed ?? 'Not recorded'}</dd></div>
                    <div><dt>Handicap status</dt><dd>{item.participation === 'TEAM' ? 'Playing record only' : item.usedInHandicapCalc ? 'Currently counting' : 'Not currently counting'}</dd></div>
                    <div><dt>Player Handicap</dt><dd>{!item.player.handicapVisible ? 'Hidden' : item.player.handicapIndex === null ? 'Awaiting handicap' : item.player.handicapIndex.toFixed(1)}</dd></div>
                  </dl>
                  <p>Private notes and hole-by-hole scores are not shared.</p>
                </details>
              ))}
            </div>
            {activity.pagination.totalPages > 1 ? (
              <div className="friend-activity-pagination" aria-label="Friend activity pages">
                <button type="button" disabled={activityPage <= 1} onClick={() => setActivityPage((page) => page - 1)}>Previous</button>
                <span>Page {activity.pagination.page} of {activity.pagination.totalPages}</span>
                <button type="button" disabled={activityPage >= activity.pagination.totalPages} onClick={() => setActivityPage((page) => page + 1)}>Next</button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="friends-empty">No shared rounds yet. Activity appears here after an accepted friend records a verified round and chooses to share it.</p>
        )}
      </section>

      <section className="friend-section round-tags" aria-labelledby="round-tags-title">
        <h2 id="round-tags-title">Rounds you were tagged in</h2>
        <p className="round-tags-intro">A tag records who played together. It does not copy the round to your history or affect your handicap.</p>
        {tagError ? <p className="friends-alert is-error" role="alert">{tagError}</p> : null}
        {roundTags.length === 0 ? <p className="friends-empty">You have not been tagged in a round.</p> : (
          <div className="friend-list">
            {roundTags.map((tag) => <article className="friend-card round-tag-card" key={tag.roundId}>
              <div><strong>{tag.gameFormat ?? tag.competitionFormat ?? 'Round'}{tag.result ? ` · ${tag.result === 'WON' ? 'Won' : tag.result === 'LOST' ? 'Lost' : 'Tied'}` : ''}</strong><small>{tag.player.name} · {tag.tee.course.club.name} · {tag.tee.course.name} · {formatActivityDate(tag.datePlayed)}</small></div>
              <button className="is-secondary" type="button" disabled={tagBusyId === tag.roundId} onClick={() => void removeRoundTag(tag.roundId)}>{tagBusyId === tag.roundId ? 'Removing…' : 'Remove tag'}</button>
            </article>)}
          </div>
        )}
      </section>

      <PlayingPartnersHistory profileId={profileId} onOpenRound={onOpenRound} />

      <ChallengesBoard profileId={profileId} friends={data?.friends ?? []} />
      <KnockoutCompetitions profileId={profileId} friends={data?.friends ?? []} />
      <FriendGroups profileId={profileId} friends={data?.friends ?? []} />
      <SharedRounds profileId={profileId} friends={data?.friends ?? []} />

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
          Search results show only names, home clubs, and permitted handicaps.
          Accepted friends may separately share limited round activity.
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
