import { promoteAdminByEmail } from './admin.js'
import { prisma } from './database.js'

async function main() {
  const email = process.env.ADMIN_EMAIL

  if (!email) {
    throw new Error(
      'ADMIN_EMAIL is required for the one-time administrator promotion',
    )
  }

  const result = await prisma.$transaction((transaction) =>
    promoteAdminByEmail(
      {
        findProfileByEmail: async (profileEmail) =>
          transaction.user.findFirst({
            where: {
              email: {
                equals: profileEmail,
                mode: 'insensitive',
              },
            },
            select: {
              id: true,
              authUserId: true,
              role: true,
            },
          }),
        findAdministrator: async () =>
          transaction.user.findFirst({
            where: { role: 'ADMIN' },
            select: {
              id: true,
              authUserId: true,
              role: true,
            },
          }),
        promoteProfile: async (userId) =>
          transaction.user.update({
            where: { id: userId },
            data: { role: 'ADMIN' },
            select: { id: true, role: true },
          }),
        createAudit: async (data) =>
          transaction.adminAuditLog.create({ data }),
      },
      email,
    ),
  )

  console.log(
    result.changed
      ? 'Administrator role assigned and audited successfully.'
      : 'The configured profile is already an administrator.',
  )
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Administrator promotion failed: ${message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
