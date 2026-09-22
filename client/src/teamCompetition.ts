export type TeamCompetitionScoring = 'GROSS_STROKES' | 'STABLEFORD_POINTS'
export type TeamCompetition = { scoring: TeamCompetitionScoring; teams: Array<{ name: string; members: string[]; isPlayerTeam: boolean; holeScores: number[]; frontNine: number; backNine: number; total: number; position: number }> }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
export function isTeamCompetition(value: unknown): value is TeamCompetition {
  if (!isRecord(value) || (value.scoring !== 'GROSS_STROKES' && value.scoring !== 'STABLEFORD_POINTS') || !Array.isArray(value.teams) || value.teams.length < 2) return false
  return value.teams.filter((team) => isRecord(team) && team.isPlayerTeam === true).length === 1 && value.teams.every((team) => isRecord(team) && typeof team.name === 'string' && Array.isArray(team.members) && team.members.every((member) => typeof member === 'string') && typeof team.isPlayerTeam === 'boolean' && Array.isArray(team.holeScores) && team.holeScores.length === 18 && team.holeScores.every((score) => Number.isInteger(score)) && Number.isInteger(team.frontNine) && Number.isInteger(team.backNine) && Number.isInteger(team.total) && Number.isInteger(team.position))
}
export function teamPositionLabel(position: number): string {
  const remainder = position % 100
  if (remainder >= 11 && remainder <= 13) return `${position}th`
  if (position % 10 === 1) return `${position}st`
  if (position % 10 === 2) return `${position}nd`
  if (position % 10 === 3) return `${position}rd`
  return `${position}th`
}
