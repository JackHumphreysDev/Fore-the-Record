import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  inviteUserByEmailMock,
  updateUserByIdMock,
  deleteUserMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  inviteUserByEmailMock: vi.fn(),
  updateUserByIdMock: vi.fn(),
  deleteUserMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

beforeEach(() => {
  vi.resetModules()
  createClientMock.mockReset()
  inviteUserByEmailMock.mockReset()
  updateUserByIdMock.mockReset()
  deleteUserMock.mockReset()
  createClientMock.mockReturnValue({
    auth: {
      admin: {
        inviteUserByEmail: inviteUserByEmailMock,
        updateUserById: updateUserByIdMock,
        deleteUser: deleteUserMock,
      },
    },
  })
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test-only'
})

afterEach(() => {
  delete process.env.VITE_SUPABASE_URL
  delete process.env.SUPABASE_SECRET_KEY
})

describe('Supabase administrator account operations', () => {
  it('requires server-only administrator configuration', async () => {
    delete process.env.SUPABASE_SECRET_KEY
    const { inviteAuthUser, AdminAuthOperationError } = await import(
      '../src/adminAuth.js'
    )

    await expect(
      inviteAuthUser({ email: 'player@example.com', name: 'Player' }),
    ).rejects.toEqual(
      new AdminAuthOperationError(
        'configuration',
        'Administrator account management is not configured',
      ),
    )
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('sends a secure invitation with profile metadata and redirect', async () => {
    inviteUserByEmailMock.mockResolvedValueOnce({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    const { inviteAuthUser } = await import('../src/adminAuth.js')

    await expect(
      inviteAuthUser({
        email: 'player@example.com',
        name: 'Example Player',
        redirectTo: 'https://example.com/?set-password=true',
      }),
    ).resolves.toEqual({ authUserId: 'auth-user-id' })

    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'sb_secret_test-only',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    )
    expect(inviteUserByEmailMock).toHaveBeenCalledWith(
      'player@example.com',
      {
        data: {
          full_name: 'Example Player',
          profile_action: 'invited',
        },
        redirectTo: 'https://example.com/?set-password=true',
      },
    )
  })

  it('maps suspension and restoration to provider ban durations', async () => {
    updateUserByIdMock.mockResolvedValue({ error: null })
    const { setAuthUserSuspended } = await import('../src/adminAuth.js')

    await setAuthUserSuspended('auth-user-id', true)
    await setAuthUserSuspended('auth-user-id', false)

    expect(updateUserByIdMock).toHaveBeenNthCalledWith(1, 'auth-user-id', {
      ban_duration: '876000h',
    })
    expect(updateUserByIdMock).toHaveBeenNthCalledWith(2, 'auth-user-id', {
      ban_duration: 'none',
    })
  })

  it('treats an already-removed Auth account as an idempotent deletion', async () => {
    deleteUserMock.mockResolvedValueOnce({
      error: { code: 'user_not_found', status: 404 },
    })
    const { deleteAuthUser } = await import('../src/adminAuth.js')

    await expect(deleteAuthUser('auth-user-id')).resolves.toBeUndefined()
  })

  it('returns a safe rate-limit failure without exposing provider details', async () => {
    inviteUserByEmailMock.mockResolvedValueOnce({
      data: { user: null },
      error: {
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'sensitive provider response',
      },
    })
    const { inviteAuthUser, AdminAuthOperationError } = await import(
      '../src/adminAuth.js'
    )

    await expect(
      inviteAuthUser({ email: 'player@example.com', name: 'Player' }),
    ).rejects.toEqual(
      new AdminAuthOperationError(
        'rate_limit',
        'Supabase has temporarily limited invitation emails',
      ),
    )
  })
})
