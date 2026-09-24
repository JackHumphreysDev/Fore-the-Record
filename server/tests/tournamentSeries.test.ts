import { describe, expect, it } from 'vitest'
import { parseSeries, parseSeriesEvent, parseSeriesResults } from '../src/tournamentSeries.js'
const id = '11111111-1111-4111-8111-111111111111'
describe('tournament series validation', () => {
  it('normalizes a series', () => expect(parseSeries({ name: ' Summer  Tour ', description: ' Weekly  golf ', inviteeIds: [id] })).toEqual({ name: 'Summer Tour', description: 'Weekly golf', inviteeIds: [id] }))
  it('validates dated events', () => expect(parseSeriesEvent({ name: 'Round One', playedOn: '2026-09-30' }).playedOn.toISOString()).toBe('2026-09-30T00:00:00.000Z'))
  it('accepts flexible points', () => expect(parseSeriesResults([{ userId: id, position: 1, points: 12.5 }])[0]).toEqual({ userId: id, position: 1, points: 12.5 }))
  it('rejects duplicate players', () => expect(() => parseSeriesResults([{ userId: id, position: 1, points: 10 }, { userId: id, position: 2, points: 8 }])).toThrow('each accepted player once'))
})
