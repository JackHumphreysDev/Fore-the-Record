import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import { isAchievementsResponse, type AchievementCategory, type AchievementsResponse } from './achievementsApi.ts'
import './AchievementsBadges.css'

type StatusFilter = 'ALL' | 'EARNED' | 'IN_PROGRESS' | 'LOCKED'
type CategoryFilter = 'ALL' | AchievementCategory
type Props = { profileId: string; onOpenRound: (roundId: string) => void }

const categoryNames: Record<AchievementCategory, string> = {
  PROGRESS: 'Playing progress', SCORING: 'Scoring', COMPETITION: 'Competition & games', EXPLORATION: 'Course exploration', CONSISTENCY: 'Consistency',
}
const icons: Record<string, string> = { rounds: '◉', holes: '⚑', competition: '★', friends: '◆', score: '↓', birdie: '−1', eagle: '−2', stableford: '+', courses: '⌖', streak: '↗', handicap: 'HI' }

function earnedDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

function progress(item: AchievementsResponse['achievements'][number]) {
  if (item.achievedAt) return 100
  if (item.current <= 0) return 0
  return Math.min(99, Math.round((item.direction === 'UP' ? item.current / item.target : item.target / item.current) * 100))
}

function progressLabel(item: AchievementsResponse['achievements'][number]) {
  if (item.achievedAt) return `Earned ${earnedDate(item.achievedAt)}`
  if (item.direction === 'DOWN') return item.current > 0 ? `Best ${item.current} · target below ${item.target}` : `Target below ${item.target}`
  return `${Math.min(item.current, item.target).toLocaleString('en-GB')} of ${item.target.toLocaleString('en-GB')}`
}

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : 'We could not load your achievements.'
}

export default function AchievementsBadges({ profileId, onOpenRound }: Props) {
  const [data, setData] = useState<AchievementsResponse | null>(null)
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [category, setCategory] = useState<CategoryFilter>('ALL')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError('')
      try {
        const response = await authenticatedFetch('/api/users/me/achievements', { signal: controller.signal })
        if (!response.ok) throw new Error(await readError(response))
        const body: unknown = await response.json()
        if (!isAchievementsResponse(body)) throw new Error('The achievement details returned were incomplete.')
        if (!controller.signal.aborted) setData(body)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'We could not load your achievements.')
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, profileId])

  const visible = useMemo(() => (data?.achievements ?? []).filter((item) => {
    if (category !== 'ALL' && item.category !== category) return false
    if (status === 'EARNED') return item.achievedAt !== null
    if (status === 'IN_PROGRESS') return item.achievedAt === null && item.current > 0
    if (status === 'LOCKED') return item.achievedAt === null && item.current === 0
    return true
  }), [category, data, status])

  return <section className="achievements-badges" aria-labelledby="achievements-title">
    <header><div><p className="form-kicker">The honours board</p><h2 id="achievements-title">Achievements and badges.</h2><p>Every badge is calculated from your verified individual playing record.</p></div>{data ? <div className="achievement-summary"><strong>{data.summary.earned}</strong><span>of {data.summary.total} earned</span><small>{data.summary.inProgress} in progress</small></div> : null}</header>
    <div className="achievement-filters">
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="ALL">All badges</option><option value="EARNED">Earned</option><option value="IN_PROGRESS">In progress</option><option value="LOCKED">Not started</option></select></label>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)}><option value="ALL">All categories</option>{Object.entries(categoryNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {error ? <div className="achievement-state" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : null}
    {!error && !data ? <div className="achievement-state" aria-live="polite">Reading the honours board…</div> : null}
    {data && visible.length === 0 ? <div className="achievement-state">No badges match these filters.</div> : null}
    {data && visible.length > 0 ? <div className="achievement-grid">{visible.map((item) => <article key={item.id} className={item.achievedAt ? 'is-earned' : item.current > 0 ? 'is-progress' : 'is-locked'}>
      <div className="achievement-badge" aria-hidden="true">{icons[item.icon] ?? '•'}</div>
      <div className="achievement-copy"><span>{categoryNames[item.category]}</span><h3>{item.title}</h3><p>{item.description}</p><div className="achievement-progress" aria-label={`${progress(item)}% complete`}><i style={{ width: `${progress(item)}%` }} /></div><small>{progressLabel(item)}</small>{item.qualifyingRoundId ? <button type="button" onClick={() => onOpenRound(item.qualifyingRoundId!)}>Open qualifying round →</button> : null}</div>
    </article>)}</div> : null}
    <p className="achievement-note">Team, pending, and rejected cards cannot unlock badges. Picked-up holes never receive invented scores, and badges do not change your Handicap Index.</p>
  </section>
}
