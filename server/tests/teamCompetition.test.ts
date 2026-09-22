import { describe, expect, it } from 'vitest'
import { buildTeamCompetition, parseTeamCompetition } from '../src/teamCompetition.js'

const gross = (total: number) => Array.from({ length: 18 }, (_, index) => index === 17 ? total - 17 * 4 : 4)

describe('team competition scoring', () => {
  it('calculates totals and shared positions for gross scoring', () => {
    const input = parseTeamCompetition({ scoring: 'GROSS_STROKES', playerTeam: { name: 'Record Makers', holeScores: gross(72) }, opponents: [{ name: 'Visitors', members: ['Alex', 'Sam'], holeScores: gross(74) }, { name: 'Home Pair', members: ['Lee'], holeScores: gross(72) }] })
    expect(input).not.toBeNull()
    const result = buildTeamCompetition(input!, ['Jack', 'Pat'])
    expect(result.teams.map((team) => [team.name, team.total, team.position])).toEqual([['Home Pair', 72, 1], ['Record Makers', 72, 1], ['Visitors', 74, 2]])
    expect(result.teams.find((team) => team.isPlayerTeam)?.members).toEqual(['Jack', 'Pat'])
  })

  it('ranks the highest Stableford total first and rejects incomplete cards', () => {
    const input = parseTeamCompetition({ scoring: 'STABLEFORD_POINTS', playerTeam: { name: 'Home', holeScores: Array(18).fill(2) }, opponents: [{ name: 'Away', members: ['Guest'], holeScores: Array(18).fill(3) }] })
    expect(buildTeamCompetition(input!, ['Player']).teams[0]).toMatchObject({ name: 'Away', total: 54, position: 1 })
    expect(parseTeamCompetition({ scoring: 'GROSS_STROKES', playerTeam: { name: 'A', holeScores: [4] }, opponents: [] })).toBeNull()
  })
})
