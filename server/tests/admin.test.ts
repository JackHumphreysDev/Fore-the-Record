import { describe, expect, it, vi } from 'vitest'
import {
  AdminPromotionError,
  promoteAdminByEmail,
} from '../src/admin.js'

function createStore() {
  return {
    findProfileByEmail: vi.fn(),
    findAdministrator: vi.fn(),
    promoteProfile: vi.fn(),
    createAudit: vi.fn(),
  }
}

describe('promoteAdminByEmail', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const authUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

  it('should promote a linked player and create an audit record', async () => {
    const store = createStore()
    store.findProfileByEmail.mockResolvedValue({
      id: userId,
      authUserId,
      role: 'PLAYER',
    })
    store.findAdministrator.mockResolvedValue(null)
    store.promoteProfile.mockResolvedValue({ id: userId, role: 'ADMIN' })

    const result = await promoteAdminByEmail(
      store,
      '  Admin@Example.com  ',
    )

    expect(result).toEqual({ userId, changed: true })
    expect(store.findProfileByEmail).toHaveBeenCalledWith(
      'admin@example.com',
    )
    expect(store.findAdministrator).toHaveBeenCalledOnce()
    expect(store.promoteProfile).toHaveBeenCalledWith(userId)
    expect(store.createAudit).toHaveBeenCalledWith({
      actorUserId: userId,
      action: 'USER_ROLE_PROMOTED',
      targetType: 'User',
      targetId: userId,
      before: { role: 'PLAYER' },
      after: { role: 'ADMIN' },
    })
  })

  it('should fail when no profile matches the configured email', async () => {
    const store = createStore()
    store.findProfileByEmail.mockResolvedValue(null)

    await expect(
      promoteAdminByEmail(store, 'admin@example.com'),
    ).rejects.toEqual(
      new AdminPromotionError(
        'Profile not found for the configured administrator email',
      ),
    )
    expect(store.promoteProfile).not.toHaveBeenCalled()
    expect(store.createAudit).not.toHaveBeenCalled()
  })

  it('should fail when the matching profile is not linked to Supabase Auth', async () => {
    const store = createStore()
    store.findProfileByEmail.mockResolvedValue({
      id: userId,
      authUserId: null,
      role: 'PLAYER',
    })

    await expect(
      promoteAdminByEmail(store, 'admin@example.com'),
    ).rejects.toEqual(
      new AdminPromotionError(
        'Administrator profile must be linked to an authentication account',
      ),
    )
    expect(store.promoteProfile).not.toHaveBeenCalled()
    expect(store.createAudit).not.toHaveBeenCalled()
  })

  it('should leave an existing administrator unchanged', async () => {
    const store = createStore()
    store.findProfileByEmail.mockResolvedValue({
      id: userId,
      authUserId,
      role: 'ADMIN',
    })

    const result = await promoteAdminByEmail(store, 'admin@example.com')

    expect(result).toEqual({ userId, changed: false })
    expect(store.findAdministrator).not.toHaveBeenCalled()
    expect(store.promoteProfile).not.toHaveBeenCalled()
    expect(store.createAudit).not.toHaveBeenCalled()
  })

  it('should refuse to replace a different existing administrator', async () => {
    const store = createStore()
    store.findProfileByEmail.mockResolvedValue({
      id: userId,
      authUserId,
      role: 'PLAYER',
    })
    store.findAdministrator.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      authUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      role: 'ADMIN',
    })

    await expect(
      promoteAdminByEmail(store, 'admin@example.com'),
    ).rejects.toEqual(
      new AdminPromotionError(
        'A different administrator is already configured',
      ),
    )
    expect(store.promoteProfile).not.toHaveBeenCalled()
    expect(store.createAudit).not.toHaveBeenCalled()
  })
})
