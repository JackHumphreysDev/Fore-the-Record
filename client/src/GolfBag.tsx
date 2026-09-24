import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import { GOLF_CLUB_TYPES, GOLF_CLUB_TYPE_LABELS, golfClubDisplayName, isGolfBagResponse, type GolfBagResponse, type GolfClub, type GolfClubType } from './golfBagApi.ts'
import './GolfBag.css'

type ClubForm = { type: GolfClubType; brand: string; model: string; nickname: string; loft: string; shaftFlex: string; carryDistanceYards: string }
const emptyForm: ClubForm = { type: 'DRIVER', brand: '', model: '', nickname: '', loft: '', shaftFlex: '', carryDistanceYards: '' }
function errorFrom(body: unknown, fallback: string): string { return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : fallback }
function formFor(club: GolfClub): ClubForm { return { type: club.type, brand: club.brand ?? '', model: club.model ?? '', nickname: club.nickname ?? '', loft: club.loft?.toString() ?? '', shaftFlex: club.shaftFlex ?? '', carryDistanceYards: club.carryDistanceYards?.toString() ?? '' } }

export default function GolfBag({ profileId }: { profileId: string }) {
  const [data, setData] = useState<GolfBagResponse | null>(null)
  const [form, setForm] = useState<ClubForm>(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void authenticatedFetch('/api/users/me/golf-bag', { signal: controller.signal }).then(async (response) => {
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(errorFrom(body, 'We could not load your golf bag.'))
      if (!isGolfBagResponse(body)) throw new Error('The golf bag details returned were incomplete.')
      if (!controller.signal.aborted) { setData(body); setError('') }
    }).catch((value: unknown) => { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : 'We could not load your golf bag.') })
    return () => controller.abort()
  }, [profileId, refresh])

  async function request(path: string, init: RequestInit, success: string): Promise<boolean> {
    setBusy(true); setError(''); setMessage('')
    try { const response = await authenticatedFetch(path, init); const body: unknown = response.status === 204 ? null : await response.json().catch(() => null); if (!response.ok) throw new Error(errorFrom(body, 'We could not update your golf bag.')); setMessage(success); setRefresh((value) => value + 1); return true }
    catch (value: unknown) { setError(value instanceof Error ? value.message : 'We could not update your golf bag.'); return false }
    finally { setBusy(false) }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const saved = await request(editingId ? `/api/users/me/golf-bag/${encodeURIComponent(editingId)}` : '/api/users/me/golf-bag', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }, editingId ? 'Club updated.' : 'Club added to your bag.')
    if (saved) { setForm(emptyForm); setEditingId('') }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!data) return
    const active = data.clubs.filter((club) => club.archivedAt === null)
    const destination = index + direction
    if (destination < 0 || destination >= active.length) return
    const ordered = [...active]; const [club] = ordered.splice(index, 1); ordered.splice(destination, 0, club!)
    await request('/api/users/me/golf-bag/order', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubIds: ordered.map((item) => item.id) }) }, 'Bag order saved.')
  }

  const active = data?.clubs.filter((club) => club.archivedAt === null) ?? []
  const archived = data?.clubs.filter((club) => club.archivedAt !== null) ?? []
  return <section className="golf-bag" aria-labelledby="golf-bag-title"><header><div><p className="form-kicker">Your equipment</p><h2 id="golf-bag-title">Golf bag.</h2></div><strong>{data?.activeCount ?? 0}<small>/ 14 active clubs</small></strong></header><p className="golf-bag-intro">Keep your current setup in playing order. Equipment details stay private and never alter a score or Handicap Index.</p>
    <form className="golf-club-form" onSubmit={(event) => void save(event)}><label>Club type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as GolfClubType })}>{GOLF_CLUB_TYPES.map((type) => <option key={type} value={type}>{GOLF_CLUB_TYPE_LABELS[type]}</option>)}</select></label><label>Nickname<input value={form.nickname} maxLength={80} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="e.g. Sand wedge" /></label><label>Brand<input value={form.brand} maxLength={80} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Optional" /></label><label>Model<input value={form.model} maxLength={100} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="Optional" /></label><label>Loft °<input type="number" min="0" max="90" step="0.1" value={form.loft} onChange={(event) => setForm({ ...form, loft: event.target.value })} placeholder="Optional" /></label><label>Shaft flex<input value={form.shaftFlex} maxLength={30} onChange={(event) => setForm({ ...form, shaftFlex: event.target.value })} placeholder="e.g. Stiff" /></label><label>Carry yards<input type="number" min="1" max="400" step="1" value={form.carryDistanceYards} onChange={(event) => setForm({ ...form, carryDistanceYards: event.target.value })} placeholder="Optional" /></label><div className="golf-club-form-actions"><button disabled={busy || (!editingId && (data?.activeCount ?? 0) >= 14)}>{busy ? 'Saving…' : editingId ? 'Update club' : 'Add to bag'}</button>{editingId ? <button type="button" className="secondary-button" onClick={() => { setEditingId(''); setForm(emptyForm) }}>Cancel edit</button> : null}</div></form>
    {error ? <p className="golf-bag-alert is-error" role="alert">{error}</p> : null}{message ? <p className="golf-bag-alert" role="status">{message}</p> : null}
    <div className="golf-club-list">{active.map((club, index) => <article key={club.id}><span className="golf-club-position">{index + 1}</span><div><small>{GOLF_CLUB_TYPE_LABELS[club.type]}</small><strong>{golfClubDisplayName(club)}</strong><p>{[club.loft === null ? null : `${club.loft}°`, club.shaftFlex, club.carryDistanceYards === null ? null : `${club.carryDistanceYards} yd carry`].filter(Boolean).join(' · ') || 'Optional details not added'}</p></div><div className="golf-club-controls"><button type="button" aria-label={`Move ${golfClubDisplayName(club)} earlier`} disabled={busy || index === 0} onClick={() => void move(index, -1)}>↑</button><button type="button" aria-label={`Move ${golfClubDisplayName(club)} later`} disabled={busy || index === active.length - 1} onClick={() => void move(index, 1)}>↓</button><button type="button" onClick={() => { setEditingId(club.id); setForm(formFor(club)); setMessage('') }}>Edit</button><button type="button" className="is-secondary" disabled={busy} onClick={() => void request(`/api/users/me/golf-bag/${encodeURIComponent(club.id)}/archive`, { method: 'POST' }, 'Club moved to the archive.')}>Archive</button></div></article>)}{data && active.length === 0 ? <p className="golf-bag-empty">Your active bag is empty. Add the first club above.</p> : null}</div>
    {archived.length > 0 ? <div className="golf-bag-archive"><button type="button" className="secondary-button" onClick={() => setShowArchive((value) => !value)}>{showArchive ? 'Hide archived clubs' : `Archived clubs (${archived.length})`}</button>{showArchive ? <div>{archived.map((club) => <article key={club.id}><span><strong>{golfClubDisplayName(club)}</strong><small>{GOLF_CLUB_TYPE_LABELS[club.type]}</small></span><div><button type="button" disabled={busy || (data?.activeCount ?? 0) >= 14} onClick={() => void request(`/api/users/me/golf-bag/${encodeURIComponent(club.id)}/restore`, { method: 'POST' }, 'Club restored to your active bag.')}>Restore</button><button type="button" className="is-danger" disabled={busy} onClick={() => { if (window.prompt(`Type DELETE to permanently remove ${golfClubDisplayName(club)}.`) === 'DELETE') void request(`/api/users/me/golf-bag/${encodeURIComponent(club.id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE' }) }, 'Club permanently deleted.') }}>Delete</button></div></article>)}</div> : null}</div> : null}
  </section>
}
