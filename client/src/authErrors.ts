const AUTH_ERROR_MESSAGES: Record<string, string> = {
  over_email_send_rate_limit:
    'Too many emails have been requested. Please wait before trying again.',
  over_request_rate_limit:
    'Too many requests were made. Please wait a few minutes and try again.',
  session_not_found:
    'This reset link is invalid or has expired. Request a new link.',
}

function getAuthErrorCode(error: unknown): string | null {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    typeof error.code !== 'string'
  ) {
    return null
  }

  return error.code
}

export function getAuthErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error)

  return code && AUTH_ERROR_MESSAGES[code]
    ? AUTH_ERROR_MESSAGES[code]
    : 'We could not complete that request. Please try again.'
}
