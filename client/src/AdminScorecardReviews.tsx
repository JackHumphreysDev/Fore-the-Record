import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isAdminScorecardReviewsResponse,
  type AdminScorecardReview,
  type AdminScorecardReviewHole,
} from './adminApi.ts'
import './AdminScorecardReviews.css'

type HoleDraft = {
  holeNumber: number
  par: string
  strokeIndex: string
  yardage: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)
  return isRecord(body) && typeof body.error === 'string' ? body.error : fallback
}

function toDraft(holes: AdminScorecardReviewHole[]): HoleDraft[] {
  return holes.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: String(hole.par),
    strokeIndex: String(hole.strokeIndex),
    yardage: hole.yardage === null ? '' : String(hole.yardage),
  }))
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function AdminScorecardReviews() {
  const [reviews, setReviews] = useState<AdminScorecardReview[]>([])
  const [drafts, setDrafts] = useState<Record<string, HoleDraft[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [busyReviewId, setBusyReviewId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadReviews() {
      setIsLoading(true)
      setError('')

      try {
        const response = await authenticatedFetch(
          '/api/admin/scorecard-reviews',
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            await readError(response, 'We could not load scorecard reviews.'),
          )
        }

        const body: unknown = await response.json()

        if (!isAdminScorecardReviewsResponse(body)) {
          throw new Error('The scorecard review list returned was incomplete.')
        }

        setReviews(body.reviews)
        setDrafts(
          Object.fromEntries(
            body.reviews.map((review) => [review.id, toDraft(review.holes)]),
          ),
        )
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return
        }

        setError(
          caught instanceof Error
            ? caught.message
            : 'We could not load scorecard reviews.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadReviews()
    return () => controller.abort()
  }, [attempt])

  function updateHole(
    reviewId: string,
    holeNumber: number,
    field: keyof Omit<HoleDraft, 'holeNumber'>,
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [reviewId]: (current[reviewId] ?? []).map((hole) =>
        hole.holeNumber === holeNumber ? { ...hole, [field]: value } : hole,
      ),
    }))
    setError('')
    setNotice('')
  }

  async function decide(reviewId: string, action: 'APPROVE' | 'REJECT') {
    const draft = drafts[reviewId] ?? []
    const holes = draft.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: Number(hole.par),
      strokeIndex: Number(hole.strokeIndex),
      ...(hole.yardage.trim() === ''
        ? {}
        : { yardage: Number(hole.yardage) }),
    }))

    if (action === 'APPROVE') {
      const strokeIndexes = new Set(holes.map((hole) => hole.strokeIndex))
      const invalid =
        holes.length !== 18 ||
        strokeIndexes.size !== 18 ||
        holes.some(
          (hole) =>
            !Number.isInteger(hole.par) ||
            hole.par < 2 ||
            hole.par > 7 ||
            !Number.isInteger(hole.strokeIndex) ||
            hole.strokeIndex < 1 ||
            hole.strokeIndex > 18 ||
            ('yardage' in hole &&
              (!Number.isInteger(hole.yardage) || Number(hole.yardage) <= 0)),
        )

      if (invalid) {
        setError(
          'Check all 18 holes: par must be 2–7, stroke indexes 1–18 must each appear once, and any yardage must be positive.',
        )
        return
      }
    } else if (!window.confirm('Reject this scorecard? The round will remain saved but will not count towards the player’s Handicap Index.')) {
      return
    }

    setBusyReviewId(reviewId)
    setError('')
    setNotice('')

    try {
      const response = await authenticatedFetch(
        `/api/admin/scorecard-reviews/${encodeURIComponent(reviewId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            action === 'APPROVE' ? { action, holes } : { action },
          ),
        },
      )

      if (!response.ok) {
        throw new Error(
          await readError(response, 'We could not update this scorecard.'),
        )
      }

      setReviews((current) =>
        current.filter((review) => review.id !== reviewId),
      )
      setNotice(
        action === 'APPROVE'
          ? 'Scorecard approved. The saved round and player Handicap Index were recalculated without changing their strokes.'
          : 'Scorecard rejected. The round remains excluded from the Handicap Index.',
      )
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We could not update this scorecard.',
      )
    } finally {
      setBusyReviewId('')
    }
  }

  return (
    <section className="admin-panel admin-scorecard-reviews" aria-labelledby="scorecard-reviews-title">
      <div className="admin-panel-heading">
        <div>
          <p>Player-entered course data</p>
          <h2 id="scorecard-reviews-title">Scorecards awaiting review</h2>
        </div>
        <span>{reviews.length} pending</span>
      </div>

      <p className="admin-scorecard-intro">
        Check or amend par, stroke index and optional yardage. Player strokes are locked. Use the submissions queue to ask the player for more information.
      </p>

      {error ? <p className="admin-scorecard-feedback admin-scorecard-error" role="alert">{error}</p> : null}
      {notice ? <p className="admin-scorecard-feedback" role="status">{notice}</p> : null}

      {isLoading ? (
        <div className="admin-state" role="status">Loading scorecard reviews…</div>
      ) : reviews.length === 0 ? (
        <p className="admin-empty">No manually entered scorecards need review.</p>
      ) : (
        <div className="admin-scorecard-list">
          {reviews.map((review) => {
            const draft = drafts[review.id] ?? []
            const strokesByHole = new Map(
              review.round.holeScores.map((score) => [score.holeNumber, score.strokesTaken]),
            )

            return (
              <article key={review.id} className="admin-scorecard-card">
                <header>
                  <div>
                    <small>{review.tee.course.club.name}</small>
                    <h3>{review.tee.course.name} · {review.tee.teeName}</h3>
                    <p>{review.submission.user.name} · {review.submission.user.email}</p>
                  </div>
                  <dl>
                    <div><dt>Played</dt><dd>{formatDate(review.round.datePlayed)}</dd></div>
                    <div><dt>Gross</dt><dd>{review.round.grossScore}</dd></div>
                    <div><dt>Provisional</dt><dd>{review.round.scoreDifferential.toFixed(1)}</dd></div>
                  </dl>
                </header>

                <div className="admin-scorecard-table-scroll">
                  <table>
                    <thead><tr><th>Hole</th><th>Par</th><th>SI</th><th>Yards</th><th>Player strokes</th></tr></thead>
                    <tbody>
                      {draft.map((hole) => (
                        <tr key={hole.holeNumber}>
                          <th scope="row">{hole.holeNumber}</th>
                          <td><input aria-label={`Hole ${hole.holeNumber} par`} type="number" min="2" max="7" value={hole.par} onChange={(event) => updateHole(review.id, hole.holeNumber, 'par', event.target.value)} /></td>
                          <td><input aria-label={`Hole ${hole.holeNumber} stroke index`} type="number" min="1" max="18" value={hole.strokeIndex} onChange={(event) => updateHole(review.id, hole.holeNumber, 'strokeIndex', event.target.value)} /></td>
                          <td><input aria-label={`Hole ${hole.holeNumber} yardage`} type="number" min="1" placeholder="—" value={hole.yardage} onChange={(event) => updateHole(review.id, hole.holeNumber, 'yardage', event.target.value)} /></td>
                          <td><strong>{strokesByHole.get(hole.holeNumber) ?? '—'}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <footer>
                  <button type="button" className="admin-scorecard-reject" disabled={Boolean(busyReviewId)} onClick={() => void decide(review.id, 'REJECT')}>Reject card</button>
                  <button type="button" disabled={Boolean(busyReviewId)} onClick={() => void decide(review.id, 'APPROVE')}>{busyReviewId === review.id ? 'Saving…' : 'Approve scorecard'}</button>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {!isLoading && error && reviews.length === 0 ? (
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
      ) : null}
    </section>
  )
}

export default AdminScorecardReviews
