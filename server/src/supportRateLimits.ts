export const SUPPORT_RATE_LIMIT_WINDOW_SECONDS = 60 * 60
export const SUPPORT_REQUEST_LIMIT = 5
export const SUPPORT_REPLY_LIMIT = 20

export function getSupportRateLimitWindowStart(
  now = new Date(),
): Date {
  return new Date(
    now.getTime() - SUPPORT_RATE_LIMIT_WINDOW_SECONDS * 1000,
  )
}

export function getSupportRateLimitError(
  kind: 'request' | 'reply',
): string {
  const limit =
    kind === 'request' ? SUPPORT_REQUEST_LIMIT : SUPPORT_REPLY_LIMIT
  const item = kind === 'request' ? 'support requests' : 'support replies'

  return `You have sent ${limit} ${item} within the last hour. Please wait before sending another.`
}
