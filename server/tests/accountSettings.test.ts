import { describe, expect, it } from 'vitest'
import {
  normalizeAccountEmail,
  normalizeProfileName,
  parseProfileName,
} from '../src/accountSettings.js'

describe('account settings validation', () => {
  it('normalizes spacing in a valid player name', () => {
    expect(normalizeProfileName("  Jack   O'Brien-Smith  ")).toBe(
      "Jack O'Brien-Smith",
    )
    expect(parseProfileName('  Tiger   Woods  ')).toBe('Tiger Woods')
  })

  it('rejects invalid or excessively long player names', () => {
    expect(() => parseProfileName('J')).toThrow('Enter your full name')
    expect(() => parseProfileName('Jack <script>')).toThrow(
      'Use letters, spaces, apostrophes, hyphens, or full stops only',
    )
    expect(() => parseProfileName('a'.repeat(101))).toThrow(
      'Your full name must be 100 characters or fewer',
    )
  })

  it('normalizes valid emails and rejects invalid values', () => {
    expect(normalizeAccountEmail('  Jack@Example.COM ')).toBe(
      'jack@example.com',
    )
    expect(normalizeAccountEmail('jack@example')).toBeNull()
    expect(normalizeAccountEmail(null)).toBeNull()
  })
})
