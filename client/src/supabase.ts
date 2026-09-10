import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

function getSupabaseConfiguration(): {
  supabaseUrl: string
  publishableKey: string
} {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'Authentication is not configured. Add the Supabase URL and publishable key.',
    )
  }

  return { supabaseUrl, publishableKey }
}

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const { supabaseUrl, publishableKey } = getSupabaseConfiguration()

  supabaseClient = createClient(supabaseUrl, publishableKey)

  return supabaseClient
}

export function createCredentialVerificationClient(): SupabaseClient {
  const { supabaseUrl, publishableKey } = getSupabaseConfiguration()

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
