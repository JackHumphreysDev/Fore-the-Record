import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type AdminAuthFailureReason =
  | 'configuration'
  | 'conflict'
  | 'rate_limit'
  | 'provider'

export class AdminAuthOperationError extends Error {
  constructor(
    readonly reason: AdminAuthFailureReason,
    message: string,
  ) {
    super(message)
    this.name = 'AdminAuthOperationError'
  }
}

let adminAuthClient: SupabaseClient | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getAdminAuthClient(): SupabaseClient {
  if (adminAuthClient) {
    return adminAuthClient
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !secretKey) {
    throw new AdminAuthOperationError(
      'configuration',
      'Administrator account management is not configured',
    )
  }

  adminAuthClient = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return adminAuthClient
}

function throwAdminAuthError(error: unknown): never {
  const code = isRecord(error) && typeof error.code === 'string'
    ? error.code
    : ''
  const status = isRecord(error) && typeof error.status === 'number'
    ? error.status
    : null
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (code === 'over_email_send_rate_limit' || status === 429) {
    throw new AdminAuthOperationError(
      'rate_limit',
      'Supabase has temporarily limited invitation emails',
    )
  }

  if (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    throw new AdminAuthOperationError(
      'conflict',
      'An authentication account already uses this email address',
    )
  }

  throw new AdminAuthOperationError(
    'provider',
    'Supabase could not complete the account change',
  )
}

export async function inviteAuthUser(input: {
  email: string
  name: string
  redirectTo?: string
}): Promise<{ authUserId: string }> {
  const { data, error } = await getAdminAuthClient().auth.admin.inviteUserByEmail(
    input.email,
    {
      data: { full_name: input.name, profile_action: 'invited' },
      ...(input.redirectTo ? { redirectTo: input.redirectTo } : {}),
    },
  )

  if (error) {
    throwAdminAuthError(error)
  }

  if (!data.user?.id) {
    throw new AdminAuthOperationError(
      'provider',
      'Supabase returned an incomplete invited account',
    )
  }

  return { authUserId: data.user.id }
}

export async function updateAuthUserEmail(
  authUserId: string,
  email: string,
): Promise<void> {
  const { error } = await getAdminAuthClient().auth.admin.updateUserById(
    authUserId,
    { email },
  )

  if (error) {
    throwAdminAuthError(error)
  }
}

export async function setAuthUserSuspended(
  authUserId: string,
  suspended: boolean,
): Promise<void> {
  const { error } = await getAdminAuthClient().auth.admin.updateUserById(
    authUserId,
    { ban_duration: suspended ? '876000h' : 'none' },
  )

  if (error) {
    throwAdminAuthError(error)
  }
}

export async function deleteAuthUser(authUserId: string): Promise<void> {
  const { error } = await getAdminAuthClient().auth.admin.deleteUser(authUserId)

  if (error) {
    const code = isRecord(error) && typeof error.code === 'string'
      ? error.code
      : ''

    if (code === 'user_not_found') {
      return
    }

    throwAdminAuthError(error)
  }
}
