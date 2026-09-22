import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isCoursePersonalBestsData,
  type CoursePersonalBest,
  type CoursePersonalBestsData,
  type PersonalBestScore,
} from './coursePersonalBestsApi.ts'
import './CoursePersonalBests.css'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`))
}

function formatToPar(value: number | null): string {
  if (value === null) return ''
  if (value === 0) return 'E'
  return value > 0 ? `+${value}` : String(value)
}

function RecordCard({ label, record, suffix = '' }: {
  label: string
  record: PersonalBestScore | null
  suffix?: string
}) {
  return <article className="course-best-card"><span>{label}</span>{record ? <>
    <strong>{record.score}{suffix}</strong>
    {record.toPar !== null ? <em>{formatToPar(record.toPar)} to par</em> : null}
    <small>Set {formatDate(record.datePlayed)}</small>
  </> : <><strong>—</strong><small>No qualifying score yet</small></>}</article>
}

async function errorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
    ? body.error
    : 'We could not load your course records.'
}

function CoursePersonalBests({ profileId }: { profileId: string }) {
  const [data, setData] = useState<CoursePersonalBestsData | null>(null)
  const [selectedTeeId, setSelectedTeeId] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError('')
      try {
        const response = await authenticatedFetch('/api/users/me/course-personal-bests', { signal: controller.signal })
        if (!response.ok) throw new Error(await errorMessage(response))
        const body: unknown = await response.json()
        if (!isCoursePersonalBestsData(body)) throw new Error('The course records returned were incomplete.')
        if (!controller.signal.aborted) {
          setData(body)
          setSelectedTeeId((current) => body.courses.some((course) => course.teeId === current)
            ? current
            : body.courses[0]?.teeId ?? '')
        }
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'We could not load your course records.')
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, profileId])

  const selected = useMemo<CoursePersonalBest | null>(() =>
    data?.courses.find((course) => course.teeId === selectedTeeId) ?? null,
  [data, selectedTeeId])

  return <section className="course-personal-bests" aria-labelledby="course-bests-title">
    <header className="course-bests-heading"><div><p className="form-kicker">Records made one course at a time</p><h2 id="course-bests-title">Course personal bests.</h2></div><p>Your lowest scores and strongest Stableford rounds, kept separately for every tee you have played.</p></header>
    {error ? <div className="course-bests-state" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : null}
    {!error && !data ? <div className="course-bests-state" aria-live="polite">Finding your course records…</div> : null}
    {!error && data?.courses.length === 0 ? <div className="course-bests-state"><strong>No course records yet.</strong><p>Log a verified individual round with hole-by-hole scores to set your first personal best.</p></div> : null}
    {!error && selected ? <>
      <div className="course-bests-picker"><label>Course and tee<select value={selectedTeeId} onChange={(event) => setSelectedTeeId(event.target.value)}>{data?.courses.map((course) => <option value={course.teeId} key={course.teeId}>{course.clubName} — {course.courseName} — {course.teeName}</option>)}</select></label><p><strong>{selected.rounds}</strong> qualifying {selected.rounds === 1 ? 'round' : 'rounds'}</p></div>
      <div className="course-bests-summary">
        <RecordCard label="Lowest 18-hole gross" record={selected.lowestGross} />
        <RecordCard label="Highest 18-hole Stableford" record={selected.highestStableford} suffix=" pts" />
        <RecordCard label="Best Front 9" record={selected.frontNine} />
        <RecordCard label="Best Back 9" record={selected.backNine} />
      </div>
      <section className="course-hole-bests" aria-labelledby="hole-bests-title"><header><h3 id="hole-bests-title">Best score by hole</h3><p>Picked-up holes are excluded.</p></header>{selected.holes.length ? <div className="course-hole-grid">{selected.holes.map((hole) => <article key={hole.holeNumber}><span>Hole {hole.holeNumber}</span><strong>{hole.score}</strong><em>{formatToPar(hole.toPar)} · Par {hole.par}</em><small>{formatDate(hole.datePlayed)}</small></article>)}</div> : <p>No completed hole scores are available for this tee yet.</p>}</section>
      <p className="course-bests-note">Only verified individual rounds count. Gross and nine-hole records exclude any card or segment containing a pickup; valid Stableford totals can still set a points record.</p>
    </> : null}
  </section>
}

export default CoursePersonalBests
