import type { TeamCompetitionScoring } from './teamCompetition.ts'
import {
  newTeamOpponent,
  type TeamCompetitionDraft,
  type TeamOpponentDraft,
} from './teamCompetitionDraft.ts'

function totals(scores: string[]) { const values = scores.map(Number); return { front: values.slice(0, 9).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0), back: values.slice(9).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0), total: values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) } }

export default function TeamCompetitionEntry({ value, onChange, error }: { value: TeamCompetitionDraft; onChange: (value: TeamCompetitionDraft) => void; error?: string }) {
  const teams = [{ id: 'player', name: value.playerTeamName || 'Your team', scores: value.playerHoleScores }, ...value.opponents.map((opponent) => ({ id: opponent.id, name: opponent.name || 'Opposing team', scores: opponent.holeScores }))]
  const updateOpponent = (id: string, patch: Partial<TeamOpponentDraft>) => onChange({ ...value, opponents: value.opponents.map((opponent) => opponent.id === id ? { ...opponent, ...patch } : opponent) })
  const updateScore = (teamId: string, index: number, score: string) => {
    if (teamId === 'player') onChange({ ...value, playerHoleScores: value.playerHoleScores.map((current, position) => position === index ? score : current) })
    else { const opponent = value.opponents.find((item) => item.id === teamId); if (opponent) updateOpponent(teamId, { holeScores: opponent.holeScores.map((current, position) => position === index ? score : current) }) }
  }
  return <section className="round-team-scoring" aria-labelledby="team-scoring-title">
    <header><div><p className="form-kicker">Full competition card</p><h3 id="team-scoring-title">Score every team.</h3></div><p>Every team needs a complete 18-hole score. Positions are calculated when the round is saved.</p></header>
    <div className="round-field-row"><label className="round-field">Leaderboard scoring<select value={value.scoring} onChange={(event) => onChange({ ...value, scoring: event.target.value as TeamCompetitionScoring })}><option value="GROSS_STROKES">Gross strokes — lowest wins</option><option value="STABLEFORD_POINTS">Stableford points — highest wins</option></select></label><label className="round-field">Your team name<input maxLength={80} value={value.playerTeamName} onChange={(event) => onChange({ ...value, playerTeamName: event.target.value })} /></label></div>
    <div className="round-opponent-teams"><header><strong>Opposing teams</strong><button type="button" onClick={() => onChange({ ...value, opponents: [...value.opponents, newTeamOpponent()] })}>Add team</button></header>{value.opponents.map((opponent) => <article key={opponent.id}><label>Team name<input maxLength={80} value={opponent.name} onChange={(event) => updateOpponent(opponent.id, { name: event.target.value })} /></label><label>Players<textarea rows={2} placeholder="One player per line, or separated by commas" value={opponent.members} onChange={(event) => updateOpponent(opponent.id, { members: event.target.value })} /></label><button type="button" disabled={value.opponents.length === 1} onClick={() => onChange({ ...value, opponents: value.opponents.filter((item) => item.id !== opponent.id) })}>Remove</button></article>)}</div>
    <div className="round-team-scorecard-scroll"><table><thead><tr><th>Hole</th>{teams.map((team) => <th key={team.id}>{team.name}</th>)}</tr></thead><tbody>{Array.from({ length: 18 }, (_, index) => <tr key={index}><th>{index + 1}</th>{teams.map((team) => <td key={team.id}><input aria-label={`Hole ${index + 1} ${team.name} score`} type="number" min={value.scoring === 'GROSS_STROKES' ? 1 : 0} max={value.scoring === 'GROSS_STROKES' ? 99 : 10} value={team.scores[index]} onChange={(event) => updateScore(team.id, index, event.target.value)} /></td>)}</tr>)}</tbody><tfoot><tr><th>Front 9</th>{teams.map((team) => <td key={team.id}>{totals(team.scores).front}</td>)}</tr><tr><th>Back 9</th>{teams.map((team) => <td key={team.id}>{totals(team.scores).back}</td>)}</tr><tr><th>Total</th>{teams.map((team) => <td key={team.id}><strong>{totals(team.scores).total}</strong></td>)}</tr></tfoot></table></div>
    {error ? <p className="round-field-error" role="alert">{error}</p> : null}
    <p className="round-partners-help">Team competition scores remain record-only and never change any player’s Handicap Index.</p>
  </section>
}
