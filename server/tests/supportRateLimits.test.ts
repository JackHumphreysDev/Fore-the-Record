import { describe, expect, it } from 'vitest'
import {
  getSupportRateLimitError,
  getSupportRateLimitWindowStart,
  SUPPORT_RATE_LIMIT_WINDOW_SECONDS,
  SUPPORT_REPLY_LIMIT,
  SUPPORT_REQUEST_LIMIT,
} from '../src/supportRateLimits.js'

describe('support rate limits', () => {
  it('should use a one-hour rolling window', () => {
    const now = new Date('2026-09-09T12:30:00.000Z')

    expect(getSupportRateLimitWindowStart(now).toISOString()).toBe(
      '2026-09-09T11:30:00.000Z',
    )
    expect(SUPPORT_RATE_LIMIT_WINDOW_SECONDS).toBe(3600)
  })

  it('should provide clear request and reply limit messages', () => {
    expect(getSupportRateLimitError('request')).toBe(
      `You have sent ${SUPPORT_REQUEST_LIMIT} support requests within the last hour. Please wait before sending another.`,
    )
    expect(getSupportRateLimitError('reply')).toBe(
      `You have sent ${SUPPORT_REPLY_LIMIT} support replies within the last hour. Please wait before sending another.`,
    )
  })
})
