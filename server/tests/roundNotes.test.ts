import { describe, expect, it } from 'vitest'
import {
  parseRoundNotes,
  ROUND_NOTES_MAX_LENGTH,
  RoundNotesValidationError,
} from '../src/roundNotes.js'

describe('round notes', () => {
  it('normalizes optional and blank notes', () => {
    expect(parseRoundNotes(undefined)).toBeNull()
    expect(parseRoundNotes(null)).toBeNull()
    expect(parseRoundNotes('   ')).toBeNull()
    expect(parseRoundNotes('  Great putting today.  ')).toBe('Great putting today.')
  })

  it('preserves line breaks inside a note', () => {
    expect(parseRoundNotes('Front nine was steady.\nBack nine improved.')).toBe(
      'Front nine was steady.\nBack nine improved.',
    )
  })

  it('rejects non-text and oversized values', () => {
    expect(() => parseRoundNotes(42)).toThrow(RoundNotesValidationError)
    expect(() => parseRoundNotes('x'.repeat(ROUND_NOTES_MAX_LENGTH + 1))).toThrow(
      `Round notes must be ${ROUND_NOTES_MAX_LENGTH.toLocaleString('en-GB')} characters or fewer`,
    )
  })
})
