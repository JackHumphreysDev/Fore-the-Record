export type TeamCompetitionScoring = 'GROSS_STROKES' | 'STABLEFORD_POINTS'

export type TeamCompetitionInput = {
  scoring: TeamCompetitionScoring
  playerTeam: { name: string; holeScores: number[] }
  opponents: Array<{ name: string; members: string[]; holeScores: number[] }>
}

export type TeamCompetition = {
  scoring: TeamCompetitionScoring
  teams: Array<{
    name: string
    members: string[]
    isPlayerTeam: boolean
    holeScores: number[]
    frontNine: number
    backNine: number
    total: number
    position: number
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown, maximum = 80): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.length >= 2 && trimmed.length <= maximum ? trimmed : null
}

function scores(value: unknown, scoring: TeamCompetitionScoring): number[] | null {
  if (!Array.isArray(value) || value.length !== 18) return null
  const minimum = scoring === 'GROSS_STROKES' ? 1 : 0
  const maximum = scoring === 'GROSS_STROKES' ? 99 : 10
  return value.every((score) => Number.isInteger(score) && Number(score) >= minimum && Number(score) <= maximum)
    ? value.map(Number)
    : null
}

export function parseTeamCompetition(value: unknown): TeamCompetitionInput | null {
  if (!isRecord(value) || (value.scoring !== 'GROSS_STROKES' && value.scoring !== 'STABLEFORD_POINTS') ||
    !isRecord(value.playerTeam) || !Array.isArray(value.opponents) || value.opponents.length < 1 || value.opponents.length > 49) return null

  const playerName = text(value.playerTeam.name)
  const playerScores = scores(value.playerTeam.holeScores, value.scoring)
  if (!playerName || !playerScores) return null

  const opponents: TeamCompetitionInput['opponents'] = []
  for (const candidate of value.opponents) {
    if (!isRecord(candidate) || !Array.isArray(candidate.members) || candidate.members.length < 1 || candidate.members.length > 20) return null
    const name = text(candidate.name)
    const holeScores = scores(candidate.holeScores, value.scoring)
    const members = candidate.members.map((member) => text(member)).filter((member): member is string => member !== null)
    if (!name || !holeScores || members.length !== candidate.members.length || new Set(members.map((member) => member.toLocaleLowerCase('en-GB'))).size !== members.length) return null
    opponents.push({ name, members, holeScores })
  }
  const names = [playerName, ...opponents.map((opponent) => opponent.name)].map((name) => name.toLocaleLowerCase('en-GB'))
  if (new Set(names).size !== names.length) return null
  return { scoring: value.scoring, playerTeam: { name: playerName, holeScores: playerScores }, opponents }
}

export function buildTeamCompetition(input: TeamCompetitionInput, playerMembers: string[]): TeamCompetition {
  const rows = [
    { ...input.playerTeam, members: playerMembers, isPlayerTeam: true },
    ...input.opponents.map((opponent) => ({ ...opponent, isPlayerTeam: false })),
  ].map((team) => ({
    ...team,
    frontNine: team.holeScores.slice(0, 9).reduce((sum, score) => sum + score, 0),
    backNine: team.holeScores.slice(9).reduce((sum, score) => sum + score, 0),
    total: team.holeScores.reduce((sum, score) => sum + score, 0),
  }))
  const totals = [...new Set(rows.map((row) => row.total))].sort((left, right) =>
    input.scoring === 'GROSS_STROKES' ? left - right : right - left)
  return {
    scoring: input.scoring,
    teams: rows.map((row) => ({ ...row, position: totals.indexOf(row.total) + 1 }))
      .sort((left, right) => left.position - right.position || left.name.localeCompare(right.name)),
  }
}

export function isTeamCompetition(value: unknown): value is TeamCompetition {
  if (!isRecord(value) || (value.scoring !== 'GROSS_STROKES' && value.scoring !== 'STABLEFORD_POINTS') || !Array.isArray(value.teams) || value.teams.length < 2) return false
  return value.teams.every((team) => isRecord(team) && typeof team.name === 'string' && Array.isArray(team.members) &&
    team.members.every((member) => typeof member === 'string') && typeof team.isPlayerTeam === 'boolean' &&
    Array.isArray(team.holeScores) && team.holeScores.length === 18 && team.holeScores.every((score) => Number.isInteger(score)) &&
    Number.isInteger(team.frontNine) && Number.isInteger(team.backNine) && Number.isInteger(team.total) && Number.isInteger(team.position))
}
