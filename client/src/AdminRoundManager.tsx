import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildAdminRoundPath,
  buildAdminRoundsPath,
  isAdminRound,
  isAdminRoundsResponse,
  type AdminRound,
  type AdminRoundsResponse,
} from './adminRoundApi.ts'
import type { AdminUser } from './adminApi.ts'

type Props = {
  user: AdminUser
  focusedRoundId: string | null
  onRoundsChanged: () => void
}

async function errorMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body &&
    typeof body.error === 'string' ? body.error : fallback
}

function AdminRoundManager({ user, focusedRoundId, onRoundsChanged }: Props) {
  const [data, setData] = useState<AdminRoundsResponse | null>(null)
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<AdminRound | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [strokes, setStrokes] = useState<number[]>([])
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!focusedRoundId) {
      return
    }

    const controller = new AbortController()

    async function loadFocusedRound() {
      try {
        const response = await authenticatedFetch(
          buildAdminRoundPath(focusedRoundId!),
          { signal: controller.signal },
        )
        if (!response.ok) {
          throw new Error(await errorMessage(response, 'Could not open the linked round.'))
        }
        const body: unknown = await response.json()
        if (!isAdminRound(body) || body.userId !== user.id) {
          throw new Error('The linked round does not belong to this player.')
        }
        selectRound(body)
      } catch (caught: unknown) {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
          setError(caught instanceof Error ? caught.message : 'Could not open the linked round.')
        }
      }
    }

    void loadFocusedRound()
    return () => controller.abort()
  }, [focusedRoundId, user.id])

  useEffect(() => {
    const controller = new AbortController()

    async function loadRounds() {
      setLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch(
          buildAdminRoundsPath(user.id, page),
          { signal: controller.signal },
        )
        if (!response.ok) {
          throw new Error(await errorMessage(response, 'Could not load rounds.'))
        }
        const body: unknown = await response.json()
        if (!isAdminRoundsResponse(body)) {
          throw new Error('The round history returned was incomplete.')
        }
        setData(body)
      } catch (caught: unknown) {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
          setError(caught instanceof Error ? caught.message : 'Could not load rounds.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadRounds()
    return () => controller.abort()
  }, [page, reload, user.id])

  function selectRound(round: AdminRound) {
    setSelected(round)
    setForm({
      datePlayed: round.datePlayed.slice(0, 10),
      timePlayed: round.timePlayed ?? '',
      category: round.category,
      competitionName: round.competitionName ?? '',
      competitionFormat: round.competitionFormat ?? '',
      numberOfPlayers: round.numberOfPlayers?.toString() ?? '',
      grossScore: round.grossScore?.toString() ?? '',
      weatherCondition: round.weatherCondition ?? 'DRY',
      pccAdjustment: round.pccAdjustment.toString(),
    })
    setStrokes(round.holeScores.map((hole) => hole.strokesTaken))
    setConfirmation('')
    setMessage('')
    setError('')
  }

  function field(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setMessage('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setSaving(true); setError(''); setMessage('')
    const competition = form.category === 'COMPETITION'
    const individual = selected.participation === 'INDIVIDUAL'
    const body = {
      datePlayed: form.datePlayed,
      ...(form.timePlayed ? { timePlayed: form.timePlayed } : {}),
      category: form.category,
      ...(competition ? {
        competitionName: form.competitionName,
        competitionFormat: form.competitionFormat,
        numberOfPlayers: Number(form.numberOfPlayers),
      } : {}),
      ...(individual ? {
        grossScore: Number(form.grossScore),
        weatherCondition: form.weatherCondition,
        pccAdjustment: Number(form.pccAdjustment),
        holeScores: selected.holeScores.map((hole, index) => ({
          holeNumber: hole.holeNumber,
          strokesTaken: strokes[index],
        })),
      } : {}),
    }
    try {
      const response = await authenticatedFetch(buildAdminRoundPath(selected.id), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await errorMessage(response, 'Could not update the round.'))
      const result: unknown = await response.json()
      if (typeof result !== 'object' || result === null || !('round' in result) || !isAdminRound(result.round)) {
        throw new Error('The updated round returned was incomplete.')
      }
      selectRound(result.round)
      setMessage('Round updated. The player’s Handicap Index was recalculated.')
      setReload((value) => value + 1)
      onRoundsChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the round.')
    } finally { setSaving(false) }
  }

  async function remove(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await authenticatedFetch(buildAdminRoundPath(selected.id), {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, 'Could not delete the round.'))
      setSelected(null); setConfirmation(''); setMessage('Round permanently deleted.')
      setReload((value) => value + 1); onRoundsChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the round.')
    } finally { setSaving(false) }
  }

  return (
    <section className="admin-round-manager" aria-labelledby="admin-rounds-title">
      <header><div><p>Playing record</p><h3 id="admin-rounds-title">Rounds</h3></div>
        <span>Handicap {data?.player.handicapIndex?.toFixed(1) ?? '—'}</span></header>
      {loading ? <p>Loading rounds…</p> : null}
      {error && !selected ? <p className="admin-account-error" role="alert">{error}</p> : null}
      {!loading && data?.rounds.length === 0 ? <p>No rounds recorded.</p> : null}
      {data?.rounds.map((round) => (
        <button className="admin-round-row" type="button" key={round.id} onClick={() => selectRound(round)}>
          <span><strong>{round.tee.course.club.name}</strong>{round.tee.course.name} · {round.tee.teeName}</span>
          <span>{round.datePlayed.slice(0, 10)}</span>
          <span>{round.participation === 'TEAM' ? 'Team record' : `Gross ${round.grossScore}`}</span>
          <span>Edit</span>
        </button>
      ))}
      {data && data.pagination.totalPages > 1 ? <nav className="admin-pagination">
        <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <span>{page} of {data.pagination.totalPages}</span>
        <button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
      </nav> : null}

      {selected ? <section className="admin-round-editor">
        <header><div><p>Round correction</p><h3>{selected.tee.course.club.name}</h3></div>
          <button type="button" onClick={() => setSelected(null)}>Close</button></header>
        <p>Course, tee and {selected.participation.toLowerCase()} participation are locked to protect rating data.</p>
        <form onSubmit={save}>
        <div className="admin-round-fields">
          <label>Date<input type="date" value={form.datePlayed} onChange={(e) => field('datePlayed', e.target.value)} /></label>
          <label>Time<input type="time" value={form.timePlayed} onChange={(e) => field('timePlayed', e.target.value)} /></label>
          {selected.participation === 'INDIVIDUAL' ? <label>Round type<select value={form.category} onChange={(e) => field('category', e.target.value)}><option value="CASUAL">Casual</option><option value="COMPETITION">Competition</option></select></label> : null}
          {form.category === 'COMPETITION' ? <>
            <label>Competition name<input value={form.competitionName} maxLength={120} onChange={(e) => field('competitionName', e.target.value)} /></label>
            <label>Format<input value={form.competitionFormat} maxLength={100} onChange={(e) => field('competitionFormat', e.target.value)} /></label>
            <label>Players<input type="number" min="1" max="10000" value={form.numberOfPlayers} onChange={(e) => field('numberOfPlayers', e.target.value)} /></label>
          </> : null}
          {selected.participation === 'INDIVIDUAL' ? <>
            <label>Gross total<input type="number" min="1" value={form.grossScore} onChange={(e) => field('grossScore', e.target.value)} /></label>
            <label>Conditions<select value={form.weatherCondition} onChange={(e) => field('weatherCondition', e.target.value)}><option value="DRY">Dry</option><option value="MOIST">Moist</option><option value="WET">Wet</option><option value="SUPER_WET">Super wet</option></select></label>
            <label>PCC<input type="number" min="-9.9" max="9.9" step="0.1" value={form.pccAdjustment} onChange={(e) => field('pccAdjustment', e.target.value)} /></label>
          </> : null}
        </div>
        {selected.participation === 'INDIVIDUAL' ? <div className="admin-round-holes">
          {selected.holeScores.map((hole, index) => <label key={hole.holeNumber}><span>Hole {hole.holeNumber}<small>Par {hole.par} · SI {hole.strokeIndex}</small></span><input type="number" min="1" value={strokes[index] ?? ''} onChange={(e) => setStrokes((current) => current.map((value, position) => position === index ? Number(e.target.value) : value))} /></label>)}
        </div> : null}
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save round corrections'}</button>
        </form>
        {error ? <p className="admin-account-error" role="alert">{error}</p> : null}
        {message ? <p className="admin-account-notice" role="status">{message}</p> : null}
        <section className="admin-round-delete"><strong>Permanently delete round</strong><p>Type DELETE to confirm. This recalculates the player’s Handicap Index and cannot be undone.</p>
          <form onSubmit={remove}><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /><button type="submit" disabled={saving || confirmation !== 'DELETE'}>Delete round</button></form>
        </section>
      </section> : null}
    </section>
  )
}

export default AdminRoundManager
