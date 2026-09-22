import type { TeamCompetitionScoring } from './teamCompetition.ts'

export type TeamOpponentDraft = {
  id: string
  name: string
  members: string
  holeScores: string[]
}

export type TeamCompetitionDraft = {
  scoring: TeamCompetitionScoring
  playerTeamName: string
  playerHoleScores: string[]
  opponents: TeamOpponentDraft[]
}

const emptyScores = () => Array.from({ length: 18 }, () => '')
let nextOpponentId = 1

export function newTeamOpponent(): TeamOpponentDraft {
  return {
    id: `opponent-${nextOpponentId++}`,
    name: '',
    members: '',
    holeScores: emptyScores(),
  }
}

export function emptyTeamCompetitionDraft(): TeamCompetitionDraft {
  return {
    scoring: 'GROSS_STROKES',
    playerTeamName: 'My team',
    playerHoleScores: emptyScores(),
    opponents: [newTeamOpponent()],
  }
}

export function parseTeamCompetitionDraft(draft: TeamCompetitionDraft) {
  const parseScores = (values: string[]) => values.map(Number)
  const scoreMinimum = draft.scoring === 'GROSS_STROKES' ? 1 : 0
  const scoreMaximum = draft.scoring === 'GROSS_STROKES' ? 99 : 10
  const validScores = (values: string[]) =>
    values.length === 18 && values.every((value) =>
      value.trim() !== '' &&
      Number.isInteger(Number(value)) &&
      Number(value) >= scoreMinimum &&
      Number(value) <= scoreMaximum)
  const members = (value: string) => value
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter(Boolean)

  if (draft.playerTeamName.trim().length < 2 || draft.playerTeamName.trim().length > 80) {
    return { error: 'Name your team using 2–80 characters.' } as const
  }
  if (!validScores(draft.playerHoleScores)) {
    return { error: 'Enter all 18 scores for your team.' } as const
  }
  if (draft.opponents.length < 1) {
    return { error: 'Add at least one opposing team.' } as const
  }
  if (draft.opponents.length > 49) {
    return { error: 'Add no more than 49 opposing teams.' } as const
  }

  const names = [draft.playerTeamName.trim()]
  const opponents = []
  let opponentPlayers = 0
  for (const opponent of draft.opponents) {
    const opponentMembers = members(opponent.members)
    if (opponent.name.trim().length < 2 || opponent.name.trim().length > 80) {
      return { error: 'Give every opposing team a name.' } as const
    }
    if (opponentMembers.length < 1 || opponentMembers.length > 20 || opponentMembers.some((name) => name.length < 2 || name.length > 80)) {
      return { error: `Add the player names for ${opponent.name.trim() || 'each opposing team'}.` } as const
    }
    if (!validScores(opponent.holeScores)) {
      return { error: `Enter all 18 scores for ${opponent.name.trim()}.` } as const
    }
    names.push(opponent.name.trim())
    opponentPlayers += opponentMembers.length
    opponents.push({
      name: opponent.name.trim(),
      members: opponentMembers,
      holeScores: parseScores(opponent.holeScores),
    })
  }

  if (new Set(names.map((name) => name.toLocaleLowerCase('en-GB'))).size !== names.length) {
    return { error: 'Every team must have a different name.' } as const
  }

  return {
    input: {
      scoring: draft.scoring,
      playerTeam: {
        name: draft.playerTeamName.trim(),
        holeScores: parseScores(draft.playerHoleScores),
      },
      opponents,
    },
    opponentPlayers,
  } as const
}
