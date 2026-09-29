import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import { isPerformanceSummaryData, type PerformanceSummaryData } from './performanceApi.ts'
import { isPersonalMilestonesData, type PersonalMilestonesData } from './personalMilestonesApi.ts'
import { isPlayerGoalsResponse, type PlayerGoalsResponse } from './playerGoalsApi.ts'
import { isHistoryRound, type HistoryRound } from './roundRecordValidation.ts'
import ledgerGreen from './assets/ledger-green-engraving.png'

type OverviewData = { performance: PerformanceSummaryData; milestones: PersonalMilestonesData; goals: PlayerGoalsResponse; rounds: HistoryRound[] }
type Props = {
  profile: { id: string; handicapIndex: number | null; homeClub: { name: string } | null }
  onGoals: () => void
  onAccount: () => void
  onHistory: (roundId?: string) => void
}

const shortDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(value))

export default function ProfileOverview({ profile, onGoals, onAccount, onHistory }: Props) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        setError('')
        const responses = await Promise.all(['performance-summary', 'personal-milestones', 'goals', 'rounds'].map((endpoint) => authenticatedFetch(`/api/users/me/${endpoint}`, { signal: controller.signal })))
        if (responses.some((response) => !response.ok)) throw new Error('We could not load your overview. Please try again.')
        const [performance, milestones, goals, rounds]: unknown[] = await Promise.all(responses.map((response) => response.json()))
        if (!isPerformanceSummaryData(performance) || !isPersonalMilestonesData(milestones) || !isPlayerGoalsResponse(goals) || !Array.isArray(rounds) || !rounds.every(isHistoryRound)) throw new Error('Your overview returned incomplete information.')
        if (!controller.signal.aborted) setData({ performance, milestones, goals, rounds })
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'We could not load your overview.')
      }
    }
    void load()
    return () => controller.abort()
  }, [profile.id, profile.handicapIndex, attempt])
  if (error) return <div className="dashboard-card" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(attempt + 1)}>Try again</button></div>
  if (!data) return <div className="dashboard-card" role="status">Reading your playing record…</div>
  const { performance, milestones, goals, rounds } = data
  const recent = [...performance.recentDifferentials].reverse()
  const values = recent.map((round) => round.scoreDifferential)
  const min = Math.min(0, ...values) - 2
  const max = Math.max(1, ...values) + 2
  const chartX = (i: number) => 40 + (recent.length === 1 ? 220 : i * 440 / (recent.length - 1))
  const chartY = (value: number) => 135 - (value - min) / (max - min) * 105
  const goal = goals.goals.find((item) => !item.isComplete) ?? goals.goals[0]
  return <>
    <dl className="dashboard-metrics">
      <div><dt>Handicap Index</dt><dd>{profile.handicapIndex?.toFixed(1) ?? '—'}</dd></div>
      <div><dt>Rounds played</dt><dd>{performance.roundsLogged}</dd></div>
      <div><dt>Best gross</dt><dd>{milestones.personalBests.lowestGrossScore?.value ?? '—'}</dd></div>
      <div><dt>Best differential</dt><dd>{performance.bestDifferential?.toFixed(1) ?? '—'}</dd></div>
    </dl>
    <div className="overview-grid">
      <section className="dashboard-card overview-trend"><h2>Recent differentials</h2>
        {recent.length ? <>
          <svg viewBox="0 0 520 180" role="img" aria-label={recent.map((round) => `${shortDate(round.datePlayed)}: ${round.scoreDifferential.toFixed(1)}`).join('; ')}>
            {[0, 1, 2].map((i) => <line key={i} x1="30" x2="490" y1={30 + i * 52.5} y2={30 + i * 52.5} className="chart-grid" />)}
            <polyline points={recent.map((round, i) => `${chartX(i)},${chartY(round.scoreDifferential)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />
            {recent.map((round, i) => <g key={round.roundId}><circle cx={chartX(i)} cy={chartY(round.scoreDifferential)} r="5" fill="currentColor" /><text x={chartX(i)} y={chartY(round.scoreDifferential) - 12} textAnchor="middle">{round.scoreDifferential.toFixed(1)}</text><text x={chartX(i)} y="166" textAnchor="middle">{shortDate(round.datePlayed)}</text></g>)}
          </svg><p className="dashboard-muted">Your latest verified score differentials, oldest to newest.</p>
        </> : <p>Record an eligible round to start seeing your progress.</p>}
      </section>
      <section className="dashboard-card overview-goal"><h2>Your next target</h2>
        {goal ? <><h3>{goal.title}</h3><p>Current {goal.currentValue ?? '—'} · Target {goal.targetValue}</p><progress max={100} value={goal.progressPercent} aria-label={`${goal.title} progress`} /><p>{goal.progressPercent}% complete</p></> : <><p>Set a goal for your next round.</p><p className="dashboard-muted">Choose a target and track it against your playing record.</p></>}
        <button type="button" onClick={onGoals}>{goal ? 'Manage goals' : 'Choose a goal'} →</button>
      </section>
      <section className="dashboard-card overview-recent"><header><h2>Recent rounds</h2><button type="button" onClick={() => onHistory()}>View history →</button></header>
        {rounds.length ? <ul className="overview-rounds">{rounds.slice(0, 3).map((round) => <li key={round.id}><button type="button" onClick={() => onHistory(round.id)}><time>{shortDate(round.datePlayed)}</time><span><strong>{round.tee.course.club.name}</strong><small>{round.tee.teeName} · {round.holeCount} holes</small></span><strong>{round.participation === 'TEAM' ? 'Team' : round.grossScore ?? '—'}</strong><span aria-hidden="true">→</span></button></li>)}</ul> : <p>Your saved rounds will appear here.</p>}
      </section>
      <div className="overview-side">
        <section className="dashboard-card"><h2>Milestones</h2><p><strong className="dashboard-number">{milestones.achievements.filter((item) => item.achievedAt).length}</strong> milestones earned</p><button type="button" onClick={onGoals}>Goals & achievements →</button></section>
        <section className="dashboard-card"><h2>Home club</h2><p>{profile.homeClub?.name ?? 'Not set'}</p><button type="button" onClick={onAccount}>{profile.homeClub ? 'Manage home club' : 'Choose a club'} →</button></section>
      </div>
    </div>
    <img className="dashboard-engraving" src={ledgerGreen} alt="" aria-hidden="true" />
  </>
}
