import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import type { FriendshipItem } from './friendsApi.ts'
import {
  buildFriendGroupLeaderboardPath,
  isFriendGroup,
  isFriendGroupLeaderboardResponse,
  isFriendGroupMessage,
  isFriendGroupMessagesResponse,
  isFriendGroupsResponse,
  type FriendGroup,
  type FriendGroupLeaderboardResponse,
  type FriendGroupMetric,
  type FriendGroupPeriod,
  type FriendGroupStanding,
  type FriendGroupMessage,
  sortFriendGroupStandings,
} from './friendGroupsApi.ts'

async function readError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : fallback
}

const metricOptions: Array<{ value: FriendGroupMetric; label: string }> = [
  { value: 'ROUNDS_PLAYED', label: 'Rounds played' },
  { value: 'STABLEFORD_POINTS', label: 'Stableford points' },
  { value: 'AVERAGE_GROSS', label: 'Lowest average gross' },
  { value: 'BEST_GROSS', label: 'Best gross score' },
  { value: 'HANDICAP_IMPROVEMENT', label: 'Handicap improvement' },
]

function metricValue(standing: FriendGroupStanding, metric: FriendGroupMetric): number | null {
  if (metric === 'ROUNDS_PLAYED') return standing.roundsPlayed
  if (metric === 'STABLEFORD_POINTS') return standing.stablefordPoints
  if (metric === 'AVERAGE_GROSS') return standing.averageGross
  if (metric === 'BEST_GROSS') return standing.bestGross
  return standing.handicapImprovement
}

function displayMetric(standing: FriendGroupStanding, metric: FriendGroupMetric): string {
  const value = metricValue(standing, metric)
  if (value === null) return '—'
  if (metric === 'HANDICAP_IMPROVEMENT') return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
  if (metric === 'AVERAGE_GROSS') return value.toFixed(1)
  return String(value)
}

function MemberChoices({ friends, selected, onChange }: { friends: FriendshipItem[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return <fieldset className="friend-group-members"><legend>Group friends</legend>{friends.map((friend) => <label key={friend.player.id}><input type="checkbox" checked={selected.includes(friend.player.id)} onChange={(event) => onChange(event.target.checked ? [...selected, friend.player.id] : selected.filter((id) => id !== friend.player.id))} /><span><strong>{friend.player.name}</strong><small>{friend.player.homeClub?.name ?? 'Home club not set'}</small></span></label>)}</fieldset>
}

export default function FriendGroups({ profileId, friends }: { profileId: string; friends: FriendshipItem[] }) {
  const [groups, setGroups] = useState<FriendGroup[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [leaderboard, setLeaderboard] = useState<FriendGroupLeaderboardResponse | null>(null)
  const [period, setPeriod] = useState<FriendGroupPeriod>('90_DAYS')
  const [metric, setMetric] = useState<FriendGroupMetric>('ROUNDS_PLAYED')
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [editName, setEditName] = useState('')
  const [editMemberIds, setEditMemberIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [messages, setMessages] = useState<FriendGroupMessage[]>([])
  const [messageBody, setMessageBody] = useState('')
  const [messageRoundId, setMessageRoundId] = useState('')
  const [messageRefresh, setMessageRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await authenticatedFetch('/api/users/me/friend-groups', { signal: controller.signal })
        if (!response.ok) throw new Error(await readError(response, 'We could not load your groups.'))
        const body: unknown = await response.json()
        if (!isFriendGroupsResponse(body)) throw new Error('The friend groups returned were incomplete.')
        if (!controller.signal.aborted) {
          setGroups(body.groups)
          setSelectedId((current) => body.groups.some((group) => group.id === current) ? current : body.groups[0]?.id ?? '')
        }
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'We could not load your groups.')
      }
    }
    void load()
    return () => controller.abort()
  }, [profileId, refresh])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    async function load() {
      try {
        const response = await authenticatedFetch(buildFriendGroupLeaderboardPath(selectedId, period), { signal: controller.signal })
        if (!response.ok) throw new Error(await readError(response, 'We could not load this leaderboard.'))
        const body: unknown = await response.json()
        if (!isFriendGroupLeaderboardResponse(body)) throw new Error('The leaderboard returned was incomplete.')
        if (!controller.signal.aborted) setLeaderboard(body)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'We could not load this leaderboard.')
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedId, period, refresh])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    async function load() {
      try {
        const response = await authenticatedFetch(`/api/users/me/friend-groups/${encodeURIComponent(selectedId)}/messages`, { signal: controller.signal })
        if (!response.ok) throw new Error(await readError(response, 'We could not load the group messages.'))
        const body: unknown = await response.json()
        if (!isFriendGroupMessagesResponse(body)) throw new Error('The group messages returned were incomplete.')
        if (!controller.signal.aborted) setMessages(body.messages)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'We could not load the group messages.')
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedId, messageRefresh])

  async function saveGroup(event: FormEvent, group?: FriendGroup) {
    event.preventDefault()
    const selectedMembers = group ? editMemberIds : memberIds
    const groupName = group ? editName : name
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await authenticatedFetch(group ? `/api/users/me/friend-groups/${encodeURIComponent(group.id)}` : '/api/users/me/friend-groups', {
        method: group ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: groupName, memberIds: selectedMembers }),
      })
      if (!response.ok) throw new Error(await readError(response, 'We could not save this group.'))
      const body: unknown = await response.json()
      if (!isFriendGroup(body)) throw new Error('The saved group details were incomplete.')
      setName(''); setMemberIds([]); setSelectedId(body.id); setMessage(group ? 'Group updated.' : 'Group created.'); setRefresh((value) => value + 1)
    } catch (saveError: unknown) { setError(saveError instanceof Error ? saveError.message : 'We could not save this group.') } finally { setBusy(false) }
  }

  async function removeGroup(group: FriendGroup, leave = false) {
    if (!leave && !window.confirm(`Delete ${group.name}? This removes the group leaderboard for everyone.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await authenticatedFetch(`/api/users/me/friend-groups/${encodeURIComponent(group.id)}${leave ? '/leave' : ''}`, { method: leave ? 'POST' : 'DELETE' })
      if (!response.ok) throw new Error(await readError(response, leave ? 'We could not leave this group.' : 'We could not delete this group.'))
      setSelectedId(''); setMessage(leave ? 'You left the group.' : 'Group deleted.'); setRefresh((value) => value + 1)
    } catch (removeError: unknown) { setError(removeError instanceof Error ? removeError.message : 'We could not update this group.') } finally { setBusy(false) }
  }

  async function postMessage(event: FormEvent) {
    event.preventDefault()
    if (!selectedGroup) return
    setBusy(true); setError('')
    try {
      const response = await authenticatedFetch(`/api/users/me/friend-groups/${encodeURIComponent(selectedGroup.id)}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: messageBody, roundId: messageRoundId || null }),
      })
      if (!response.ok) throw new Error(await readError(response, 'We could not post this message.'))
      const body: unknown = await response.json()
      if (!isFriendGroupMessage(body)) throw new Error('The saved message was incomplete.')
      setMessageBody(''); setMessageRoundId(''); setMessageRefresh((value) => value + 1)
    } catch (postError: unknown) { setError(postError instanceof Error ? postError.message : 'We could not post this message.') } finally { setBusy(false) }
  }

  async function deleteMessage(message: FriendGroupMessage) {
    if (!selectedGroup) return
    setBusy(true); setError('')
    try {
      const response = await authenticatedFetch(`/api/users/me/friend-groups/${encodeURIComponent(selectedGroup.id)}/messages/${encodeURIComponent(message.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await readError(response, 'We could not delete this message.'))
      setMessages((current) => current.filter((item) => item.id !== message.id))
    } catch (deleteError: unknown) { setError(deleteError instanceof Error ? deleteError.message : 'We could not delete this message.') } finally { setBusy(false) }
  }

  const selectedGroup = groups.find((group) => group.id === selectedId) ?? null
  const ranked = useMemo(() => sortFriendGroupStandings(leaderboard?.standings ?? [], metric), [leaderboard, metric])

  return <section className="friend-groups friend-section" aria-labelledby="friend-groups-title">
    <div className="friend-group-heading"><div><p className="form-kicker">Private groups</p><h2 id="friend-groups-title">Group leaderboards</h2></div><span>Verified individual rounds only</span></div>
    <p className="round-tags-intro">Create a group from accepted friends and compare play without exposing notes, support details, or account information.</p>
    {error ? <p className="friends-alert is-error" role="alert">{error}</p> : null}{message ? <p className="friends-alert" role="status">{message}</p> : null}
    {friends.length > 0 ? <details className="friend-group-editor"><summary>Create a group</summary><form onSubmit={(event) => void saveGroup(event)}><label>Group name<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunday golfers" /></label><MemberChoices friends={friends} selected={memberIds} onChange={setMemberIds} /><button disabled={busy || !name.trim() || memberIds.length === 0}>Create group</button></form></details> : <p className="friends-empty">Add and accept a friend before creating a group.</p>}
    {groups.length > 0 ? <>
      <div className="friend-group-tabs" role="list" aria-label="Your friend groups">{groups.map((group) => <button type="button" className={group.id === selectedId ? 'is-active' : ''} key={group.id} onClick={() => setSelectedId(group.id)}>{group.name}<small>{group.players.length} players</small></button>)}</div>
      {selectedGroup ? <div className="friend-group-board">
        <div className="friend-group-controls"><label>Period<select value={period} onChange={(event) => setPeriod(event.target.value as FriendGroupPeriod)}><option value="30_DAYS">Last 30 days</option><option value="90_DAYS">Last 90 days</option><option value="12_MONTHS">Last 12 months</option><option value="ALL_TIME">All time</option></select></label><label>Ranking<select value={metric} onChange={(event) => setMetric(event.target.value as FriendGroupMetric)}>{metricOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label></div>
        <ol className="friend-group-ranking">{ranked.map((standing, index) => <li key={standing.player.id}><span className="friend-group-position">{index + 1}</span><span><strong>{standing.player.name}{standing.player.id === profileId ? ' (you)' : ''}</strong><small>{standing.player.homeClub?.name ?? 'Home club not set'} · {standing.roundsPlayed} qualifying {standing.roundsPlayed === 1 ? 'round' : 'rounds'}</small></span><strong>{displayMetric(standing, metric)}</strong></li>)}</ol>
        <section className="friend-group-messages" aria-labelledby="friend-group-messages-title"><div><h3 id="friend-group-messages-title">Group message board</h3><small>Discuss the leaderboard or attach a comment to a recent group round.</small></div><form onSubmit={(event) => void postMessage(event)}><label>Comment<textarea value={messageBody} maxLength={500} rows={3} onChange={(event) => setMessageBody(event.target.value)} placeholder="Add a message for the group" /></label><label>Related round (optional)<select value={messageRoundId} onChange={(event) => setMessageRoundId(event.target.value)}><option value="">General leaderboard comment</option>{leaderboard?.recentRounds.map((round) => <option key={round.id} value={round.id}>{round.player.name} · {round.tee.course.club.name} · {round.datePlayed}</option>)}</select></label><button disabled={busy || !messageBody.trim()}>Post message</button></form><div className="friend-group-message-list">{messages.map((groupMessage) => <article key={groupMessage.id}><div><strong>{groupMessage.author.name}</strong><time dateTime={groupMessage.createdAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(groupMessage.createdAt))}</time></div>{groupMessage.round ? <small className="friend-group-message-round">On {groupMessage.round.player.name}’s round at {groupMessage.round.tee.course.club.name} · {groupMessage.round.datePlayed}</small> : <small className="friend-group-message-round">Leaderboard discussion</small>}<p>{groupMessage.body}</p>{groupMessage.canDelete ? <button className="is-secondary" type="button" disabled={busy} onClick={() => void deleteMessage(groupMessage)}>Delete</button> : null}</article>)}{messages.length === 0 ? <p className="friends-empty">No messages yet. Start the group conversation.</p> : null}</div></section>
        {selectedGroup.isOwner ? <details className="friend-group-editor" onToggle={(event) => { if (event.currentTarget.open) { setEditName(selectedGroup.name); setEditMemberIds(selectedGroup.players.filter((player) => !player.isOwner).map((player) => player.id)) } }}><summary>Manage group</summary><form onSubmit={(event) => void saveGroup(event, selectedGroup)}><label>Group name<input value={editName} maxLength={80} onChange={(event) => setEditName(event.target.value)} /></label><MemberChoices friends={friends} selected={editMemberIds} onChange={setEditMemberIds} /><div className="friend-actions"><button disabled={busy || !editName.trim() || editMemberIds.length === 0}>Save changes</button><button className="is-secondary" type="button" disabled={busy} onClick={() => void removeGroup(selectedGroup)}>Delete group</button></div></form></details> : <button className="is-secondary" type="button" disabled={busy} onClick={() => void removeGroup(selectedGroup, true)}>Leave group</button>}
      </div> : null}
    </> : <p className="friends-empty">You do not belong to a friend group yet.</p>}
  </section>
}
