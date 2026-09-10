import { describe, expect, it } from 'vitest'
import {
  normalizeEmail,
  normalizeName,
  validateEmail,
  validateName,
} from './accountSettingsApi.ts'

describe('account settings browser validation', () => {
  it('normalizes names and email addresses', () => {
    expect(normalizeName('  Tiger   Woods ')).toBe('Tiger Woods')
    expect(normalizeEmail(' Jack@Example.COM ')).toBe('jack@example.com')
  })

  it('returns specific name validation messages', () => {
    expect(validateName('')).toBe('Enter your full name')
    expect(validateName('Jack 2')).toContain('Use letters')
    expect(validateName('Jack Humphreys')).toBe('')
  })

  it('validates email addresses', () => {
    expect(validateEmail('you@gmail.coom')).toBe('')
    expect(validateEmail('you@gmail')).toBe('Enter a valid email address')
    expect(validateEmail('you @gmail.com')).toBe('Enter a valid email address')
  })
})
