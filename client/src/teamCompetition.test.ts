import { describe, expect, it } from 'vitest'
import { isTeamCompetition, teamPositionLabel } from './teamCompetition.ts'
import { emptyTeamCompetitionDraft, parseTeamCompetitionDraft } from './teamCompetitionDraft.ts'
describe('team competition helpers', () => {
  it('validates derived team leaderboards', () => {
    expect(isTeamCompetition({ scoring: 'GROSS_STROKES', teams: [{ name: 'A', members: ['Jack'], isPlayerTeam: true, holeScores: Array(18).fill(4), frontNine: 36, backNine: 36, total: 72, position: 1 }, { name: 'B', members: ['Sam'], isPlayerTeam: false, holeScores: Array(18).fill(5), frontNine: 45, backNine: 45, total: 90, position: 2 }] })).toBe(true)
    expect(isTeamCompetition({ scoring: 'GROSS_STROKES', teams: [] })).toBe(false)
  })
  it('formats leaderboard positions', () => { expect([1, 2, 3, 4, 11, 22].map(teamPositionLabel)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '22nd']) })
  it('turns a complete form draft into an API request', () => {
    const draft = emptyTeamCompetitionDraft()
    draft.playerTeamName = 'Home'
    draft.playerHoleScores = Array(18).fill('4')
    draft.opponents[0] = { ...draft.opponents[0], name: 'Away', members: 'Alex, Sam', holeScores: Array(18).fill('5') }
    expect(parseTeamCompetitionDraft(draft)).toMatchObject({
      input: {
        scoring: 'GROSS_STROKES',
        playerTeam: { name: 'Home', holeScores: Array(18).fill(4) },
        opponents: [{ name: 'Away', members: ['Alex', 'Sam'], holeScores: Array(18).fill(5) }],
      },
      opponentPlayers: 2,
    })
  })
})
