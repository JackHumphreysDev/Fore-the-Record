export type AccountSecuritySnapshot = {
  email: string
  emailVerified: boolean
  accountCreatedAt: string
  lastSignInAt: string | null
  signInMethod: string
}

type SecurityUser = {
  email?: string
  email_confirmed_at?: string
  created_at: string
  last_sign_in_at?: string
  app_metadata?: { provider?: unknown }
}

export function buildAccountSecuritySnapshot(
  user: SecurityUser,
): AccountSecuritySnapshot {
  const provider = typeof user.app_metadata?.provider === 'string'
    ? user.app_metadata.provider
    : 'email'

  return {
    email: user.email ?? '',
    emailVerified: Boolean(user.email_confirmed_at),
    accountCreatedAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    signInMethod: provider === 'email' ? 'Email and password' : provider,
  }
}

export function isGlobalSignOutConfirmation(value: string): boolean {
  return value.trim() === 'SIGN OUT'
}
