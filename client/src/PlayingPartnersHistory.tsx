import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isPlayingPartnersHistoryResponse,
  type PartnerResult,
  type PlayingPartnersHistoryResponse,
} from './playingPartnersHistoryApi.ts'
import './PlayingPartnersHistory.css'

type PlayingPartnersHistoryProps = {
  profileId: string
  onOpenRound: (roundId: string) => void
}

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

function resultLabel(result: PartnerResult): string {
  if (result === 'WON') return 'Won'
  if (result === 'LOST') return 'Lost'
  if (result === 'TIED') return 'Tied'
  return 'No result'
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
    ? body.error
    : 'We could not load your playing-partner history.'
}

export default function PlayingPartnersHistory({ profileId, onOpenRound }: PlayingPartnersHistoryProps) {
  const [data, setData] = useState<PlayingPartnersHistoryResponse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'ALL' | 'FRIEND' | 'GUEST'>('ALL')

  useEffect(() => {
    const controller = new AbortController()
    async function loadHistory() {
      setIsLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch('/api/users/me/playing-partners-history', { signal: controller.signal })
        if (!response.ok) throw new Error(await readError(response))
        const body: unknown = await response.json()
        if (!isPlayingPartnersHistoryResponse(body)) throw new Error('The playing-partner history returned was incomplete.')
        if (!controller.signal.aborted) setData(body)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'We could not load your playing-partner history.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void loadHistory()
    return () => controller.abort()
  }, [profileId])

  const partners = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return (data?.partners ?? []).filter((partner) => {
      if (kind !== 'ALL' && partner.kind !== kind) return false
      return !term || partner.name.toLocaleLowerCase().includes(term) ||
        partner.homeClub?.name.toLocaleLowerCase().includes(term) ||
        partner.courses.some((course) => `${course.clubName} ${course.courseName}`.toLocaleLowerCase().includes(term))
    })
  }, [data, kind, search])

  return <section className="friend-section playing-partners" aria-labelledby="playing-partners-title">
    <div className="playing-partners-heading">
      <div>
        <p className="playing-partners-kicker">Your playing record</p>
        <h2 id="playing-partners-title">Playing partners history</h2>
        <p>See when and where you played with linked friends and named guests. Private scores, notes, and scorecards stay hidden.</p>
      </div>
      {data ? <dl className="playing-partners-overview">
        <div><dt>Partners</dt><dd>{data.summary.partners}</dd></div>
        <div><dt>Friends</dt><dd>{data.summary.friends}</dd></div>
        <div><dt>Guest players</dt><dd>{data.summary.guests}</dd></div>
        <div><dt>Appearances</dt><dd>{data.summary.partnerAppearances}</dd></div>
      </dl> : null}
    </div>

    {isLoading ? <p className="friends-empty">Loading your playing partners…</p> : null}
    {error ? <p className="friends-alert is-error" role="alert">{error}</p> : null}
    {!isLoading && !error && data?.partners.length === 0 ? <p className="friends-empty">Playing partners will appear here after you save a round with a linked friend or named guest.</p> : null}

    {data && data.partners.length > 0 ? <>
      <div className="playing-partners-filters">
        <label>Search history<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Partner, club, or course" /></label>
        <label>Player type<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="ALL">All players</option><option value="FRIEND">Linked friends</option><option value="GUEST">Guest players</option></select></label>
      </div>
      {partners.length === 0 ? <p className="friends-empty">No playing partners match these filters.</p> : <div className="playing-partners-list">
        {partners.map((partner) => <details key={partner.key} className="playing-partner-card">
          <summary>
            <div><strong>{partner.name}</strong><span>{partner.kind === 'FRIEND' ? partner.homeClub?.name ?? 'Linked friend' : 'Guest player'}</span></div>
            <div className="playing-partner-summary"><span>{partner.roundsPlayed} {partner.roundsPlayed === 1 ? 'round' : 'rounds'}</span><span>{partner.wins}W · {partner.losses}L · {partner.ties}T</span><span>Last played {formatDate(partner.lastPlayed)}</span></div>
          </summary>
          <div className="playing-partner-detail">
            <dl className="playing-partner-facts">
              <div><dt>First played</dt><dd>{formatDate(partner.firstPlayed)}</dd></div>
              <div><dt>Latest round</dt><dd>{formatDate(partner.lastPlayed)}</dd></div>
              <div><dt>No result recorded</dt><dd>{partner.roundsWithoutResult}</dd></div>
            </dl>
            <div className="playing-partner-breakdown">
              <div><h3>Shared courses</h3><ul>{partner.courses.map((course) => <li key={course.courseId}><span>{course.clubName} · {course.courseName}</span><strong>{course.rounds}</strong></li>)}</ul></div>
              <div><h3>Formats</h3><ul>{partner.formats.map((format) => <li key={format.name}><span>{format.name}</span><strong>{format.rounds}</strong></li>)}</ul></div>
            </div>
            <div className="playing-partner-rounds">
              <h3>Rounds together</h3>
              {partner.rounds.map((round) => <article key={round.roundId}>
                <div><strong>{round.clubName} · {round.courseName}</strong><span>{formatDate(round.datePlayed)} · {round.teeName} tee · {round.holeCount === 9 ? round.nineHoleSegment === 'BACK_NINE' ? 'Back 9' : 'Front 9' : '18 holes'}</span><span>{round.format} · {resultLabel(round.result)}</span></div>
                {round.ownedByPlayer ? <button type="button" className="is-secondary" onClick={() => onOpenRound(round.roundId)}>Open in History</button> : <small>Recorded by {round.recordedBy}</small>}
              </article>)}
            </div>
          </div>
        </details>)}
      </div>}
    </> : null}
  </section>
}
