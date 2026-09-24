import { describe, expect, it } from 'vitest'
import { parseGolfBagOrder, parseGolfClubInput } from '../src/golfBag.js'

describe('golf bag validation', () => {
  it('normalizes a complete club record', () => expect(parseGolfClubInput({ type: 'WEDGE', brand: ' Titleist ', model: ' Vokey  SM10 ', nickname: ' Sand wedge ', loft: '56.0', shaftFlex: 'Wedge', carryDistanceYards: '95' })).toEqual({ type: 'WEDGE', brand: 'Titleist', model: 'Vokey SM10', nickname: 'Sand wedge', loft: 56, shaftFlex: 'Wedge', carryDistanceYards: 95 }))
  it('keeps every optional detail nullable', () => expect(parseGolfClubInput({ type: 'PUTTER', nickname: '   ' })).toEqual({ type: 'PUTTER', brand: null, model: null, nickname: null, loft: null, shaftFlex: null, carryDistanceYards: null }))
  it('rejects impossible lofts and carries', () => { expect(() => parseGolfClubInput({ type: 'IRON', loft: 91 })).toThrow('loft'); expect(() => parseGolfClubInput({ type: 'IRON', carryDistanceYards: 0 })).toThrow('carry distance') })
  it('requires one unique ordering entry per active club', () => { const one = '10000000-0000-4000-8000-000000000000'; const two = '20000000-0000-4000-8000-000000000000'; expect(parseGolfBagOrder([one, two])).toEqual([one, two]); expect(() => parseGolfBagOrder([one, one])).toThrow('every active club') })
})
