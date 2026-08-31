import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage } from './authErrors.ts'

function createAuthError(code: string, status = 400): Error {
  return Object.assign(new Error('Raw provider error'), { code, status })
}

describe('getAuthErrorMessage', () => {
  it('explains when too many authentication emails were requested', () => {
    expect(
      getAuthErrorMessage(createAuthError('over_email_send_rate_limit', 429)),
    ).toBe(
      'Too many emails have been requested. Please wait before trying again.',
    )
  })

  it('explains when the client made too many authentication requests', () => {
    expect(
      getAuthErrorMessage(createAuthError('over_request_rate_limit', 429)),
    ).toBe(
      'Too many requests were made. Please wait a few minutes and try again.',
    )
  })

  it('explains when a password-reset session is missing or expired', () => {
    expect(getAuthErrorMessage(createAuthError('session_not_found'))).toBe(
      'This reset link is invalid or has expired. Request a new link.',
    )
  })

  it('does not expose an unexpected provider error', () => {
    expect(getAuthErrorMessage(new Error('Internal provider details'))).toBe(
      'We could not complete that request. Please try again.',
    )
  })
})
