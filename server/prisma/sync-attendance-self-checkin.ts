import { PrismaClient } from '@prisma/client'
import { getRuntimeDatabaseUrl } from '../src/prisma/database-url'

const PERMISSION = {
  code: 'attendance.self-checkin',
  name: 'Hoi vien tu check-in',
  description: 'Hoi vien tu check-in bang QR trong ung dung',
}

const MEMBER_GROUP = {
  name: 'member',
  description:
    'Hoi vien: su dung dich vu - theo doi goi tap, lich tap, tien do va gui phan hoi ' +
    '(UC04 tu gia han, UC05, UC06 xem ket qua, UC07).',
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasourceUrl: getRuntimeDatabaseUrl() })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const permission = await tx.permission.upsert({
        where: { code: PERMISSION.code },
        update: {
          name: PERMISSION.name,
          description: PERMISSION.description,
        },
        create: PERMISSION,
      })

      const group = await tx.group.upsert({
        where: { name: MEMBER_GROUP.name },
        update: {
          description: MEMBER_GROUP.description,
          deletedAt: null,
        },
        create: MEMBER_GROUP,
      })

      const existing = await tx.groupPermission.findUnique({
        where: {
          groupId_permissionId: {
            groupId: group.groupId,
            permissionId: permission.permissionId,
          },
        },
      })

      if (!existing) {
        await tx.groupPermission.create({
          data: {
            groupId: group.groupId,
            permissionId: permission.permissionId,
          },
        })
      }

      return {
        groupId: group.groupId.toString(),
        permissionId: permission.permissionId.toString(),
        createdAssignment: !existing,
      }
    })

    // eslint-disable-next-line no-console
    console.log('[sync] attendance.self-checkin is assigned to member group:', result)
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[sync] failed:', error)
  process.exitCode = 1
})
