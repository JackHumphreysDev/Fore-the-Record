import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'

export type AuthenticatedUser = {
  id: string
  email: string
  emailConfirmed: boolean
}

let authClient: SupabaseClient | null = null

export function getBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null
  }

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim())

  return match?.[1] ?? null
}

function getAuthClient(): SupabaseClient {
  if (authClient) {
    return authClient
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables are required',
    )
  }

  authClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return authClient
}

export async function getAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request.headers.authorization)

  if (!token) {
    return null
  }

  const {
    data: { user },
    error,
  } = await getAuthClient().auth.getUser(token)

  if (error || !user?.email) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at),
  }
}
