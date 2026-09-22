import { teamPositionLabel, type TeamCompetition } from './teamCompetition.ts'
import './TeamCompetitionCard.css'

export default function TeamCompetitionCard({ competition, compact = false }: { competition: TeamCompetition; compact?: boolean }) {
  const unit = competition.scoring === 'GROSS_STROKES' ? 'strokes' : 'points'
  return <section className={compact ? 'team-competition-card team-competition-card-compact' : 'team-competition-card'} aria-label="Team competition leaderboard">
    <header><div><span>Competition leaderboard</span><strong>{competition.scoring === 'GROSS_STROKES' ? 'Gross strokes' : 'Stableford points'}</strong></div><small>{competition.teams.length} teams · {competition.teams.reduce((sum, team) => sum + team.members.length, 0)} players</small></header>
    <div className="team-leaderboard-scroll"><table><thead><tr><th>Pos</th><th>Team</th><th>Players</th><th>Front 9</th><th>Back 9</th><th>Total</th></tr></thead><tbody>{competition.teams.map((team) => <tr className={team.isPlayerTeam ? 'team-leaderboard-player' : ''} key={team.name}><td>{teamPositionLabel(team.position)}</td><th>{team.name}{team.isPlayerTeam ? <small>Your team</small> : null}</th><td>{team.members.join(', ')}</td><td>{team.frontNine}</td><td>{team.backNine}</td><td><strong>{team.total}</strong> {unit}</td></tr>)}</tbody></table></div>
    {!compact ? <div className="team-hole-card-scroll"><table><thead><tr><th>Team</th>{Array.from({ length: 18 }, (_, index) => <th key={index}>{index + 1}</th>)}<th>Total</th></tr></thead><tbody>{competition.teams.map((team) => <tr className={team.isPlayerTeam ? 'team-leaderboard-player' : ''} key={team.name}><th>{team.name}</th>{team.holeScores.map((score, index) => <td key={index}>{score}</td>)}<td><strong>{team.total}</strong></td></tr>)}</tbody></table></div> : null}
  </section>
}
