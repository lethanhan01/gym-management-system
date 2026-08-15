import { Prisma, PrismaClient } from '@prisma/client'
import {
  OBSOLETE_SYSTEM_PERMISSION_CODES,
  SYSTEM_GROUP_DESCRIPTIONS,
  SYSTEM_GROUP_NAMES,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  type SystemGroupName,
  validateSystemRbacCatalog,
} from './system-rbac-catalog'

export interface SystemRbacSyncReport {
  permissions: { created: number; metadataUpdated: number; unchanged: number; removed: number }
  groups: { created: number; reactivated: number; metadataUpdated: number; unchanged: number }
  assignments: { desired: number; created: number; skipped: number; removed: number }
}

export async function synchronizeSystemRbac(prisma: PrismaClient): Promise<SystemRbacSyncReport> {
  validateSystemRbacCatalog()

  return prisma.$transaction(
    async (tx) => {
      const cleanup = await removeObsoleteSystemPermissions(tx)
      const catalogCodes = SYSTEM_PERMISSIONS.map((permission) => permission.code)
      const existingPermissions = await tx.permission.findMany({
        where: { code: { in: catalogCodes } },
        select: { permissionId: true, code: true, name: true, description: true },
      })
      const permissionsByCode = new Map(
        existingPermissions.map((permission) => [permission.code, permission])
      )
      const permissions = {
        created: 0,
        metadataUpdated: 0,
        unchanged: 0,
        removed: cleanup.permissionsRemoved,
      }

      for (const definition of SYSTEM_PERMISSIONS) {
        const existing = permissionsByCode.get(definition.code)
        if (!existing) permissions.created += 1
        else if (
          existing.name !== definition.name ||
          existing.description !== definition.description
        )
          permissions.metadataUpdated += 1
        else permissions.unchanged += 1

        await tx.permission.upsert({
          where: { code: definition.code },
          update: { name: definition.name, description: definition.description },
          create: definition,
        })
      }

      const existingGroups = await tx.group.findMany({
        where: { name: { in: [...SYSTEM_GROUP_NAMES] } },
        select: { groupId: true, name: true, description: true, deletedAt: true },
      })
      const groupsByName = new Map(
        existingGroups.map((group) => [group.name as SystemGroupName, group])
      )
      const groups = { created: 0, reactivated: 0, metadataUpdated: 0, unchanged: 0 }
      const groupIdsByName = new Map<SystemGroupName, bigint>()

      for (const groupName of SYSTEM_GROUP_NAMES) {
        const description = SYSTEM_GROUP_DESCRIPTIONS[groupName]
        const existing = groupsByName.get(groupName)
        if (!existing) groups.created += 1
        else if (existing.deletedAt) groups.reactivated += 1
        else if (existing.description !== description) groups.metadataUpdated += 1
        else groups.unchanged += 1

        const group = await tx.group.upsert({
          where: { name: groupName },
          update: { description, deletedAt: null },
          create: { name: groupName, description },
        })
        groupIdsByName.set(groupName, group.groupId)
      }

      const syncedPermissions = await tx.permission.findMany({
        where: { code: { in: catalogCodes } },
        select: { permissionId: true, code: true },
      })
      const permissionIdsByCode = new Map(
        syncedPermissions.map((permission) => [permission.code, permission.permissionId])
      )
      const groupIds = [...groupIdsByName.values()]
      const existingAssignments = await tx.groupPermission.findMany({
        where: { groupId: { in: groupIds } },
        select: { groupId: true, permissionId: true },
      })
      const assignmentKeys = new Set(
        existingAssignments.map((assignment) => `${assignment.groupId}:${assignment.permissionId}`)
      )

      const missingAssignments: Array<{ groupId: bigint; permissionId: bigint }> = []
      let desired = 0
      for (const groupName of SYSTEM_GROUP_NAMES) {
        const groupId = groupIdsByName.get(groupName)!
        for (const permissionCode of SYSTEM_ROLE_PERMISSIONS[groupName]) {
          const permissionId = permissionIdsByCode.get(permissionCode)
          if (permissionId === undefined) {
            throw new Error(`Synced permission is missing from database: ${permissionCode}`)
          }
          desired += 1
          if (!assignmentKeys.has(`${groupId}:${permissionId}`)) {
            missingAssignments.push({ groupId, permissionId })
          }
        }
      }

      const created = missingAssignments.length
        ? (await tx.groupPermission.createMany({ data: missingAssignments, skipDuplicates: true }))
            .count
        : 0

      return {
        permissions,
        groups,
        assignments: {
          desired,
          created,
          skipped: desired - created,
          removed: cleanup.assignmentsRemoved,
        },
      }
    },
    { maxWait: 10_000, timeout: 30_000 }
  )
}

async function removeObsoleteSystemPermissions(tx: Prisma.TransactionClient) {
  const obsoletePermissions = await tx.permission.findMany({
    where: { code: { in: [...OBSOLETE_SYSTEM_PERMISSION_CODES] } },
    select: {
      permissionId: true,
      code: true,
      groups: { select: { group: { select: { name: true } } } },
    },
  })

  let assignmentsRemoved = 0
  let permissionsRemoved = 0
  for (const permission of obsoletePermissions) {
    const customGroups = permission.groups
      .map((assignment) => assignment.group.name)
      .filter((groupName) => !SYSTEM_GROUP_NAMES.includes(groupName as SystemGroupName))
    if (customGroups.length > 0) {
      throw new Error(
        `Cannot remove deprecated permission ${permission.code}; assigned to custom groups: ${customGroups.join(', ')}`
      )
    }

    assignmentsRemoved += (
      await tx.groupPermission.deleteMany({
        where: {
          permissionId: permission.permissionId,
          group: { name: { in: [...SYSTEM_GROUP_NAMES] } },
        },
      })
    ).count

    const remainingAssignments = await tx.groupPermission.count({
      where: { permissionId: permission.permissionId },
    })
    if (remainingAssignments > 0) {
      throw new Error(
        `Cannot remove deprecated permission ${permission.code}; assignments changed during sync`
      )
    }

    await tx.permission.delete({ where: { permissionId: permission.permissionId } })
    permissionsRemoved += 1
  }

  return { assignmentsRemoved, permissionsRemoved }
}
