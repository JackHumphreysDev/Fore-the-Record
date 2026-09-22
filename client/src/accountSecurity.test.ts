import { describe, expect, it } from 'vitest'
import {
  buildAccountSecuritySnapshot,
  isGlobalSignOutConfirmation,
} from './accountSecurity.ts'

describe('account security helpers', () => {
  it('builds safe security details from the authenticated identity', () => {
    expect(buildAccountSecuritySnapshot({
      email: 'player@example.com',
      email_confirmed_at: '2026-09-01T10:00:00Z',
      created_at: '2026-08-01T10:00:00Z',
      last_sign_in_at: '2026-09-22T08:30:00Z',
      app_metadata: { provider: 'email' },
    })).toEqual({
      email: 'player@example.com',
      emailVerified: true,
      accountCreatedAt: '2026-08-01T10:00:00Z',
      lastSignInAt: '2026-09-22T08:30:00Z',
      signInMethod: 'Email and password',
    })
  })

  it('requires the exact global sign-out confirmation', () => {
    expect(isGlobalSignOutConfirmation('SIGN OUT')).toBe(true)
    expect(isGlobalSignOutConfirmation(' sign out ')).toBe(false)
  })
})
