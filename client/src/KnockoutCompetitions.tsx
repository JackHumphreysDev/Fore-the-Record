import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import type { FriendshipItem } from './friendsApi.ts'
import { isKnockoutCompetitionsResponse, knockoutRoundLabel, type KnockoutCompetition, type KnockoutMatch } from './knockoutCompetitionsApi.ts'
import ProfileAvatar from './ProfileAvatar.tsx'
import './KnockoutCompetitions.css'

const resultOptions = [
  { value: '1:0', label: '1 up' },
  { value: '2:0', label: '2 up' },
  ...Array.from({ length: 8 }, (_, index) => ({ value: `${index + 2}:${index + 1}`, label: `${index + 2} & ${index + 1}` })),
  { value: '10:8', label: '10 & 8' },
]

function bodyError(body: unknown, fallback: string): string {
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : fallback
}

function statusLabel(status: KnockoutCompetition['status']): string {
  if (status === 'INVITING') return 'Invitations open'
  if (status === 'ACTIVE') return 'In progress'
  if (status === 'COMPLETED') return 'Completed'
  return 'Cancelled'
}

function MatchResultForm({ competition, match, busy, onSaved }: { competition: KnockoutCompetition; match: KnockoutMatch; busy: boolean; onSaved: () => void }) {
  const [winnerId, setWinnerId] = useState(match.playerOneId ?? '')
  const [result, setResult] = useState('1:0')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const [winningMargin, holesRemaining] = result.split(':').map(Number)
    try {
      const response = await authenticatedFetch(`/api/users/me/knockout-competitions/${encodeURIComponent(competition.id)}/matches/${encodeURIComponent(match.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ winnerId, winningMargin, holesRemaining }) })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) return setError(bodyError(body, 'We could not record that result.'))
      setError(''); onSaved()
    } catch (value: unknown) { setError(value instanceof Error ? value.message : 'We could not record that result.') } finally { setSaving(false) }
  }
  return <form className="knockout-result-form" onSubmit={(event) => void submit(event)}><label>Winner<select value={winnerId} onChange={(event) => setWinnerId(event.target.value)}><option value={match.playerOneId ?? ''}>{match.playerOne?.name}</option><option value={match.playerTwoId ?? ''}>{match.playerTwo?.name}</option></select></label><label>Result<select value={result} onChange={(event) => setResult(event.target.value)}>{resultOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button disabled={busy || saving || !winnerId}>{saving ? 'Recording…' : 'Record result'}</button>{error ? <small role="alert">{error}</small> : null}</form>
}

export default function KnockoutCompetitions({ profileId, friends }: { profileId: string; friends: FriendshipItem[] }) {
  const [competitions, setCompetitions] = useState<KnockoutCompetition[]>([])
  const [name, setName] = useState('')
  const [inviteeIds, setInviteeIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void authenticatedFetch('/api/users/me/knockout-competitions', { signal: controller.signal }).then(async (response) => {
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(bodyError(body, 'We could not load knockout competitions.'))
      if (!isKnockoutCompetitionsResponse(body)) throw new Error('The knockout competition details were incomplete.')
      if (!controller.signal.aborted) { setCompetitions(body.competitions); setError('') }
    }).catch((value: unknown) => { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : 'We could not load knockout competitions.') })
    return () => controller.abort()
  }, [profileId, refresh])

  async function mutate(path: string, init: RequestInit, success: string): Promise<boolean> {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await authenticatedFetch(path, init)
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(bodyError(body, 'We could not update that competition.'))
      setMessage(success); setRefresh((value) => value + 1); return true
    } catch (value: unknown) { setError(value instanceof Error ? value.message : 'We could not update that competition.'); return false } finally { setBusy(false) }
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    const created = await mutate('/api/users/me/knockout-competitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, inviteeIds }) }, 'Competition created and invitations sent.')
    if (created) { setName(''); setInviteeIds([]) }
  }

  return <section className="friend-section knockout-competitions" aria-labelledby="knockout-title">
    <div className="knockout-heading"><div><p className="form-kicker">Private Match Play</p><h2 id="knockout-title">Knockout competitions</h2></div><span>2–16 accepted friends</span></div>
    <p className="round-tags-intro">Invite friends, wait for every response, then start an automatic draw. The organiser records each decisive Match Play result and the winner advances.</p>
    <form className="knockout-create" onSubmit={(event) => void create(event)}><label>Competition name<input required minLength={3} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Summer Knockout" /></label><fieldset><legend>Invite competitors</legend>{friends.map((friend) => { const selected = inviteeIds.includes(friend.player.id); return <label key={friend.player.id}><input type="checkbox" checked={selected} disabled={!selected && inviteeIds.length >= 15} onChange={(event) => setInviteeIds((current) => event.target.checked ? [...current, friend.player.id] : current.filter((id) => id !== friend.player.id))} /><ProfileAvatar userId={friend.player.id} name={friend.player.name} hasImage={friend.player.hasProfileImage} /><span><strong>{friend.player.name}</strong><small>{friend.player.homeClub?.name ?? 'Home club not set'}</small></span></label> })}</fieldset><button disabled={busy || !name.trim() || inviteeIds.length === 0}>Create and invite</button></form>
    {friends.length > 15 ? <p className="knockout-note">A competition can include the organiser and up to 15 selected friends.</p> : null}
    {error ? <p className="friends-alert is-error" role="alert">{error}</p> : null}{message ? <p className="friends-alert" role="status">{message}</p> : null}
    <div className="knockout-list">{competitions.map((competition) => {
      const ownEntry = competition.participants.find((participant) => participant.userId === profileId)
      const pending = competition.participants.filter((participant) => participant.status === 'INVITED').length
      const accepted = competition.participants.filter((participant) => participant.status === 'ACCEPTED').length
      const totalRounds = Math.max(0, ...competition.matches.map((match) => match.roundNumber))
      const rounds = Array.from({ length: totalRounds }, (_, index) => competition.matches.filter((match) => match.roundNumber === index + 1))
      return <details key={competition.id} open={competition.status === 'ACTIVE' || ownEntry?.status === 'INVITED'}><summary><span><strong>{competition.name}</strong><small>Organised by {competition.organizer.name} · {accepted} accepted</small></span><span>{statusLabel(competition.status)}</span></summary><div className="knockout-body">
        {competition.champion ? <div className="knockout-champion"><span aria-hidden="true">★</span><div><small>Champion</small><strong>{competition.champion.name}</strong></div></div> : null}
        <div className="knockout-participants">{competition.participants.map((participant) => <span className={`is-${participant.status.toLowerCase()}`} key={participant.userId}>{participant.user.name}<small>{participant.status.toLowerCase()}</small></span>)}</div>
        {ownEntry?.status === 'INVITED' && competition.status === 'INVITING' ? <div className="knockout-actions"><button disabled={busy} onClick={() => void mutate(`/api/users/me/knockout-competitions/${encodeURIComponent(competition.id)}/invitation`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept' }) }, 'Invitation accepted.')}>Accept invitation</button><button className="is-secondary" disabled={busy} onClick={() => void mutate(`/api/users/me/knockout-competitions/${encodeURIComponent(competition.id)}/invitation`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'decline' }) }, 'Invitation declined.')}>Decline</button></div> : null}
        {competition.isOrganizer && competition.status === 'INVITING' ? <div className="knockout-actions"><button disabled={busy || pending > 0 || accepted < 2} onClick={() => void mutate(`/api/users/me/knockout-competitions/${encodeURIComponent(competition.id)}/start`, { method: 'POST' }, 'Draw created. The knockout has started.')}>Start draw</button><small>{pending > 0 ? `Waiting for ${pending} invitation ${pending === 1 ? 'response' : 'responses'}.` : accepted < 2 ? 'At least two players must accept.' : 'Everyone has responded. The draw is ready.'}</small></div> : null}
        {rounds.length > 0 ? <div className="knockout-bracket">{rounds.map((matches, index) => <section key={index}><h3>{knockoutRoundLabel(index + 1, totalRounds)}</h3>{matches.map((match) => <article key={match.id}><div className={match.winnerId === match.playerOneId ? 'is-winner' : ''}><span>{match.playerOne?.name ?? 'To be decided'}</span>{match.winnerId === match.playerOneId ? <strong>W</strong> : null}</div><div className={match.winnerId === match.playerTwoId ? 'is-winner' : ''}><span>{match.playerTwo?.name ?? (match.resultLabel === 'Bye' ? 'Bye' : 'To be decided')}</span>{match.winnerId === match.playerTwoId ? <strong>W</strong> : null}</div><small>{match.resultLabel ?? (match.status === 'READY' ? 'Ready to play' : 'Awaiting earlier result')}</small>{competition.isOrganizer && match.status === 'READY' ? <MatchResultForm competition={competition} match={match} busy={busy} onSaved={() => { setMessage('Match result recorded.'); setRefresh((value) => value + 1) }} /> : null}</article>)}</section>)}</div> : null}
        {competition.isOrganizer && (competition.status === 'INVITING' || competition.status === 'ACTIVE') ? <button type="button" className="is-secondary knockout-cancel" disabled={busy} onClick={() => { if (window.confirm(`Cancel ${competition.name}? Existing bracket results will remain visible as cancelled.`)) void mutate(`/api/users/me/knockout-competitions/${encodeURIComponent(competition.id)}`, { method: 'DELETE' }, 'Competition cancelled.') }}>Cancel competition</button> : null}
      </div></details>
    })}{competitions.length === 0 ? <p className="friends-empty">No knockout competitions yet.</p> : null}</div>
    <p className="knockout-note">Knockout results are a private competition record. They do not create a round, alter a scorecard, or change any player’s Handicap Index.</p>
  </section>
}
