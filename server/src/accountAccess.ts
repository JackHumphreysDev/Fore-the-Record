import { prisma } from './database.js'
import type { UserStatus } from './generated/prisma/enums.js'

export async function getAccountStatusByAuthUserId(
  authUserId: string,
): Promise<UserStatus | null> {
  const profile = await prisma.user.findUnique({
    where: { authUserId },
    select: { status: true },
  })

  return profile?.status ?? null
}
