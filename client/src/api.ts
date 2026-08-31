import { getSupabaseClient } from './supabase.ts'

export function fetchWithAccessToken(
  accessToken: string,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)

  headers.set('Authorization', `Bearer ${accessToken}`)

  return fetch(input, { ...init, headers })
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
    error,
  } = await getSupabaseClient().auth.getSession()

  if (error || !session) {
    throw new Error('Your session has ended. Sign in and try again.')
  }

  return fetchWithAccessToken(session.access_token, input, init)
}
