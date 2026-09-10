import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  isPlayerGoalsResponse,
  PLAYER_GOAL_OPTIONS,
  type PlayerGoal,
  type PlayerGoalsResponse,
  type PlayerGoalType,
} from './playerGoalsApi.ts'
import './PlayerGoals.css'

type PlayerGoalsProps = { profileId: string }

async function readError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
    ? body.error
    : fallback
}

function formatValue(value: number | null, type: PlayerGoalType): string {
  if (value === null) return 'Awaiting a qualifying round'
  return type === 'HANDICAP_INDEX'
    ? value.toFixed(1)
    : value.toLocaleString('en-GB')
}

function formatTargetDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00.000Z'))
}

function GoalCard({
  goal,
  busyType,
  onRemove,
}: {
  goal: PlayerGoal
  busyType: string
  onRemove: (goal: PlayerGoal) => void
}) {
  return (
    <article
      className={
        goal.isComplete ? 'player-goal-card is-complete' : 'player-goal-card'
      }
    >
      <header>
        <div>
          <small>{goal.isComplete ? 'Goal reached' : 'In progress'}</small>
          <h4>{goal.title}</h4>
        </div>
        <button
          type="button"
          className="player-goal-remove"
          disabled={busyType === goal.type}
          onClick={() => onRemove(goal)}
        >
          {busyType === goal.type ? 'Removing…' : 'Remove'}
        </button>
      </header>

      <div className="player-goal-values">
        <span>
          Current
          <strong>{formatValue(goal.currentValue, goal.type)}</strong>
        </span>
        <span>
          Target
          <strong>{formatValue(goal.targetValue, goal.type)}</strong>
        </span>
      </div>

      <div
        className="player-goal-progress"
        role="progressbar"
        aria-label={goal.title + ' progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={goal.progressPercent}
      >
        <span style={{ width: goal.progressPercent + '%' }} />
      </div>
      <footer>
        <span>{goal.progressPercent}% complete</span>
        <span>
          {goal.targetDate
            ? 'Target date ' + formatTargetDate(goal.targetDate)
            : 'No target date'}
        </span>
      </footer>
    </article>
  )
}

function PlayerGoals({ profileId }: PlayerGoalsProps) {
  const [data, setData] = useState<PlayerGoalsResponse | null>(null)
  const [type, setType] = useState<PlayerGoalType>('HANDICAP_INDEX')
  const [targetValue, setTargetValue] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyType, setBusyType] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const selectedOption = useMemo(
    () => PLAYER_GOAL_OPTIONS.find((option) => option.type === type)!,
    [type],
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadGoals() {
      setError('')
      try {
        const response = await authenticatedFetch('/api/users/me/goals', {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(
            await readError(response, 'We could not load your goals.'),
          )
        }
        const body: unknown = await response.json()
        if (!isPlayerGoalsResponse(body)) {
          throw new Error('The goal details returned were incomplete.')
        }
        if (!controller.signal.aborted) setData(body)
      } catch (loadError: unknown) {
        if (controller.signal.aborted) return
        setData(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'We could not load your goals.',
        )
      }
    }

    void loadGoals()
    return () => controller.abort()
  }, [loadAttempt, profileId])

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyType(type)
    setError('')
    setMessage('')
    try {
      const response = await authenticatedFetch(
        '/api/users/me/goals/' + encodeURIComponent(type),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetValue, targetDate: targetDate || null }),
        },
      )
      if (!response.ok) {
        throw new Error(await readError(response, 'We could not save that goal.'))
      }
      setMessage('Your goal has been saved.')
      setTargetValue('')
      setTargetDate('')
      setLoadAttempt((value) => value + 1)
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'We could not save that goal.',
      )
    } finally {
      setBusyType('')
    }
  }

  async function removeGoal(goal: PlayerGoal) {
    setBusyType(goal.type)
    setError('')
    setMessage('')
    try {
      const response = await authenticatedFetch(
        '/api/users/me/goals/' + encodeURIComponent(goal.type),
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw new Error(
          await readError(response, 'We could not remove that goal.'),
        )
      }
      setMessage(goal.title + ' goal removed.')
      setLoadAttempt((value) => value + 1)
    } catch (removeError: unknown) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'We could not remove that goal.',
      )
    } finally {
      setBusyType('')
    }
  }

  return (
    <section className="player-goals" aria-labelledby="player-goals-title">
      <header>
        <div>
          <p className="form-kicker">Your next target</p>
          <h3 id="player-goals-title">Player goals</h3>
        </div>
        <span>{data?.goals.length ?? 0} set</span>
      </header>

      <p className="player-goals-intro">
        Choose a target and Fore the Record will update its progress from your
        verified playing record. Saving the same goal type replaces its target.
      </p>

      <form className="player-goal-form" onSubmit={saveGoal}>
        <label>
          Goal
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as PlayerGoalType)
              setError('')
              setMessage('')
            }}
          >
            {PLAYER_GOAL_OPTIONS.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target
          <input
            type="number"
            required
            min={selectedOption.minimum}
            max={selectedOption.maximum}
            step={selectedOption.step}
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
          />
        </label>
        <label>
          <span>Target date <em>(optional)</em></span>
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
        </label>
        <button type="submit" disabled={busyType !== ''}>
          {busyType === type ? 'Saving…' : 'Save goal'}
        </button>
      </form>

      {error ? (
        <p className="player-goal-alert is-error" role="alert">
          {error}{' '}
          {data === null ? (
            <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
              Try again
            </button>
          ) : null}
        </p>
      ) : null}
      {message ? (
        <p className="player-goal-alert" role="status">
          {message}
        </p>
      ) : null}

      {data === null && !error ? (
        <p className="player-goal-state" aria-live="polite">
          Reading your goals…
        </p>
      ) : data?.goals.length === 0 ? (
        <p className="player-goal-state">
          No goals set yet. Choose your first target above.
        </p>
      ) : (
        <div className="player-goal-list">
          {data?.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              busyType={busyType}
              onRemove={(selectedGoal) => void removeGoal(selectedGoal)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default PlayerGoals
