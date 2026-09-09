import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isPersonalMilestonesData,
  type PersonalBest,
  type PersonalMilestonesData,
  type ProgressMilestone,
} from './personalMilestonesApi.ts'
import './PersonalMilestones.css'

type PersonalMilestonesProps = {
  profileId: string
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function formatBest(best: PersonalBest | null, decimals = 0): string {
  return best === null ? '—' : best.value.toFixed(decimals)
}

function getProgressLabel(milestone: ProgressMilestone): string {
  if (milestone.achievedAt) {
    return `Earned ${formatDate(milestone.achievedAt)}`
  }

  if (milestone.id.startsWith('gross-below-')) {
    return milestone.current > 0
      ? `Best ${milestone.current} · target below ${milestone.target}`
      : `Target below ${milestone.target}`
  }

  return `${Math.min(milestone.current, milestone.target)} of ${milestone.target}`
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
    ? body.error
    : 'We could not load your milestones.'
}

function PersonalMilestones({ profileId }: PersonalMilestonesProps) {
  const [data, setData] = useState<PersonalMilestonesData | null>(null)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadMilestones() {
      setError('')

      try {
        const response = await authenticatedFetch(
          '/api/users/me/personal-milestones',
          { signal: controller.signal },
        )

        if (!response.ok) throw new Error(await readError(response))
        const body: unknown = await response.json()

        if (!isPersonalMilestonesData(body)) {
          throw new Error('The milestone details returned were incomplete.')
        }

        if (!controller.signal.aborted) setData(body)
      } catch (loadError: unknown) {
        if (controller.signal.aborted) return
        setData(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'We could not load your milestones.',
        )
      }
    }

    void loadMilestones()
    return () => controller.abort()
  }, [loadAttempt, profileId])

  if (error) {
    return (
      <section className="personal-milestones milestone-state" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
          Try again
        </button>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="personal-milestones milestone-state" aria-live="polite">
        Reading your milestones…
      </section>
    )
  }

  const totals = [
    ['Holes played', data.totals.holesPlayed],
    ['Total shots', data.totals.totalShots],
    ['Yards covered', data.totals.yardsCovered],
    ['Eagles', data.totals.eagles],
    ['Birdies', data.totals.birdies],
    ['Pars', data.totals.pars],
    ['Bogeys', data.totals.bogeys],
  ] as const
  const bests = [
    ['Lowest gross', formatBest(data.personalBests.lowestGrossScore), data.personalBests.lowestGrossScore],
    ['Best differential', formatBest(data.personalBests.lowestDifferential, 1), data.personalBests.lowestDifferential],
    ['Lowest Handicap Index', formatBest(data.personalBests.lowestHandicapIndex, 1), data.personalBests.lowestHandicapIndex],
  ] as const

  return (
    <section className="personal-milestones" aria-labelledby="milestones-title">
      <header>
        <div>
          <p className="form-kicker">Your golfing story</p>
          <h3 id="milestones-title">Personal milestones</h3>
        </div>
        <span>{data.achievements.filter(({ achievedAt }) => achievedAt).length} earned</span>
      </header>

      <dl className="milestone-totals">
        {totals.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value.toLocaleString('en-GB')}</dd>
          </div>
        ))}
      </dl>
      <p className="milestone-yardage-note">
        Yardage includes recorded distances only; missing course yardages are not estimated.
      </p>

      <div className="milestone-bests">
        {bests.map(([label, value, best]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{best ? formatDate(best.achievedAt) : 'Waiting for a verified round'}</span>
          </article>
        ))}
      </div>

      <div className="milestone-achievements">
        {data.achievements.map((milestone) => {
          const achieved = milestone.achievedAt !== null
          return (
            <article className={achieved ? 'is-achieved' : 'is-locked'} key={milestone.id}>
              <span className="milestone-icon" aria-hidden="true">{achieved ? '✓' : '○'}</span>
              <div>
                <strong>{milestone.title}</strong>
                <p>{milestone.description}</p>
                <small>{getProgressLabel(milestone)}</small>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default PersonalMilestones
