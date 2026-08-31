import { UserRole, type UserRole as UserRoleValue } from './generated/prisma/enums.js'

type AdminProfile = {
  id: string
  authUserId: string | null
  role: UserRoleValue
}

type AdminPromotionStore = {
  findProfileByEmail(email: string): Promise<AdminProfile | null>
  findAdministrator(): Promise<AdminProfile | null>
  promoteProfile(userId: string): Promise<unknown>
  createAudit(data: {
    actorUserId: string
    action: 'USER_ROLE_PROMOTED'
    targetType: 'User'
    targetId: string
    before: { role: UserRoleValue }
    after: { role: typeof UserRole.ADMIN }
  }): Promise<unknown>
}

export class AdminPromotionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminPromotionError'
  }
}

export async function promoteAdminByEmail(
  store: AdminPromotionStore,
  email: string,
): Promise<{ userId: string; changed: boolean }> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new AdminPromotionError(
      'ADMIN_EMAIL must identify an existing linked profile',
    )
  }

  const user = await store.findProfileByEmail(normalizedEmail)

  if (!user) {
    throw new AdminPromotionError(
      'Profile not found for the configured administrator email',
    )
  }

  if (!user.authUserId) {
    throw new AdminPromotionError(
      'Administrator profile must be linked to an authentication account',
    )
  }

  if (user.role === UserRole.ADMIN) {
    return { userId: user.id, changed: false }
  }

  const existingAdmin = await store.findAdministrator()

  if (existingAdmin) {
    throw new AdminPromotionError(
      'A different administrator is already configured',
    )
  }

  await store.promoteProfile(user.id)

  await store.createAudit({
    actorUserId: user.id,
    action: 'USER_ROLE_PROMOTED',
    targetType: 'User',
    targetId: user.id,
    before: { role: user.role },
    after: { role: UserRole.ADMIN },
  })

  return { userId: user.id, changed: true }
}
