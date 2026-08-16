import { PrismaClient } from '@prisma/client'
import {
  SYSTEM_GROUP_DESCRIPTIONS,
  SYSTEM_GROUP_NAMES,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from './system-rbac-catalog'
import { synchronizeSystemRbac } from './system-rbac-sync'

type PermissionRow = {
  permissionId: bigint
  code: string
  name: string
  description: string | null
}
type GroupRow = {
  groupId: bigint
  name: string
  description: string | null
  deletedAt: Date | null
}

const SYSTEM_PERMISSIONS_BY_CODE = new Map(
  SYSTEM_PERMISSIONS.map((permission) => [permission.code, permission])
)

function createMemoryPrisma() {
  const permissions = new Map<string, PermissionRow>()
  const groups = new Map<string, GroupRow>()
  const assignments = new Set<string>()
  const deletes = {
    permissionDelete: jest.fn(),
    permissionDeleteMany: jest.fn(),
    groupDelete: jest.fn(),
    groupDeleteMany: jest.fn(),
    assignmentDelete: jest.fn(),
    assignmentDeleteMany: jest.fn(),
  }
  let permissionId = 1n
  let groupId = 1n

  const permissionAssignments = (id: bigint) =>
    [...assignments].flatMap((key) => {
      const [assignedGroupId, assignedPermissionId] = key.split(':')
      if (BigInt(assignedPermissionId) !== id) return []
      const group = [...groups.values()].find(
        (candidate) => candidate.groupId === BigInt(assignedGroupId)
      )
      return group ? [{ group: { name: group.name } }] : []
    })

  const tx = {
    permission: {
      findMany: jest.fn(
        async (args: { where: { code: { in: string[] } }; select?: { groups?: unknown } }) => {
          const requested = new Set<string>(args.where.code.in)
          return [...permissions.values()]
            .filter((row) => requested.has(row.code))
            .map((row) =>
              args.select?.groups
                ? { ...row, groups: permissionAssignments(row.permissionId) }
                : row
            )
        }
      ),
      upsert: jest.fn(
        async (args: {
          where: { code: string }
          update: Pick<PermissionRow, 'name' | 'description'>
          create: Omit<PermissionRow, 'permissionId'>
        }) => {
          const code = args.where.code as string
          const current = permissions.get(code)
          if (current) {
            current.name = args.update.name
            current.description = args.update.description
            return current
          }
          const created: PermissionRow = { permissionId: permissionId++, ...args.create }
          permissions.set(code, created)
          return created
        }
      ),
      delete: jest.fn(async (args: { where: { permissionId: bigint } }) => {
        const row = [...permissions.values()].find(
          (candidate) => candidate.permissionId === args.where.permissionId
        )
        if (row) permissions.delete(row.code)
        deletes.permissionDelete(args)
      }),
      deleteMany: deletes.permissionDeleteMany,
    },
    group: {
      findMany: jest.fn(async (args: { where: { name: { in: string[] } } }) => {
        const requested = new Set<string>(args.where.name.in)
        return [...groups.values()].filter((row) => requested.has(row.name))
      }),
      upsert: jest.fn(
        async (args: {
          where: { name: string }
          update: Pick<GroupRow, 'description' | 'deletedAt'>
          create: Pick<GroupRow, 'name' | 'description'>
        }) => {
          const name = args.where.name as string
          const current = groups.get(name)
          if (current) {
            current.description = args.update.description
            current.deletedAt = args.update.deletedAt
            return current
          }
          const created: GroupRow = { groupId: groupId++, ...args.create, deletedAt: null }
          groups.set(name, created)
          return created
        }
      ),
      delete: deletes.groupDelete,
      deleteMany: deletes.groupDeleteMany,
    },
    groupPermission: {
      findMany: jest.fn(async (args: { where: { groupId: { in: bigint[] } } }) => {
        const requestedGroupIds = new Set<bigint>(args.where.groupId.in)
        return [...assignments].flatMap((key) => {
          const [groupIdValue, permissionIdValue] = key.split(':')
          const currentGroupId = BigInt(groupIdValue)
          return requestedGroupIds.has(currentGroupId)
            ? [{ groupId: currentGroupId, permissionId: BigInt(permissionIdValue) }]
            : []
        })
      }),
      createMany: jest.fn(
        async (args: { data: Array<{ groupId: bigint; permissionId: bigint }> }) => {
          let count = 0
          for (const row of args.data) {
            const key = `${row.groupId}:${row.permissionId}`
            if (!assignments.has(key)) {
              assignments.add(key)
              count += 1
            }
          }
          return { count }
        }
      ),
      deleteMany: jest.fn(
        async (args: { where: { permissionId: bigint; group: { name: { in: string[] } } } }) => {
          const allowedGroups = new Set(args.where.group.name.in)
          let count = 0
          for (const key of [...assignments]) {
            const [assignedGroupId, assignedPermissionId] = key.split(':')
            const group = [...groups.values()].find(
              (candidate) => candidate.groupId === BigInt(assignedGroupId)
            )
            if (
              BigInt(assignedPermissionId) === args.where.permissionId &&
              group &&
              allowedGroups.has(group.name)
            ) {
              assignments.delete(key)
              count += 1
            }
          }
          deletes.assignmentDeleteMany(args)
          return { count }
        }
      ),
      count: jest.fn(
        async (args: { where: { permissionId: bigint } }) =>
          [...assignments].filter((key) => BigInt(key.split(':')[1]) === args.where.permissionId)
            .length
      ),
      delete: deletes.assignmentDelete,
    },
  }
  const prisma = {
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
  } as unknown as PrismaClient

  const seedPermission = (code: string) => {
    const definition = SYSTEM_PERMISSIONS_BY_CODE.get(code)
    const row: PermissionRow = {
      permissionId: permissionId++,
      code,
      name: definition?.name ?? code,
      description: definition?.description ?? null,
    }
    permissions.set(code, row)
    return row
  }
  const seedGroup = (name: string, description = name) => {
    const row: GroupRow = { groupId: groupId++, name, description, deletedAt: null }
    groups.set(name, row)
    return row
  }
  const assign = (name: string, code: string) => {
    const group = groups.get(name)!
    const permission = permissions.get(code)!
    assignments.add(`${group.groupId}:${permission.permissionId}`)
  }

  return { prisma, permissions, groups, assignments, deletes, seedPermission, seedGroup, assign }
}

const expectedAssignments = SYSTEM_GROUP_NAMES.reduce(
  (total, groupName) => total + SYSTEM_ROLE_PERMISSIONS[groupName].length,
  0
)

describe('synchronizeSystemRbac', () => {
  it('creates the catalog and mapping idempotently without delete operations', async () => {
    const memory = createMemoryPrisma()

    const first = await synchronizeSystemRbac(memory.prisma)
    const second = await synchronizeSystemRbac(memory.prisma)

    expect(first.permissions).toEqual({ created: 52, metadataUpdated: 0, unchanged: 0, removed: 0 })
    expect(first.groups).toEqual({ created: 4, reactivated: 0, metadataUpdated: 0, unchanged: 0 })
    expect(first.assignments).toEqual({
      desired: expectedAssignments,
      created: expectedAssignments,
      skipped: 0,
      removed: 0,
    })
    expect(second.permissions).toEqual({
      created: 0,
      metadataUpdated: 0,
      unchanged: 52,
      removed: 0,
    })
    expect(second.groups).toEqual({ created: 0, reactivated: 0, metadataUpdated: 0, unchanged: 4 })
    expect(second.assignments).toEqual({
      desired: expectedAssignments,
      created: 0,
      skipped: expectedAssignments,
      removed: 0,
    })
    expect(memory.permissions.size).toBe(52)
    expect(memory.groups.size).toBe(4)
    expect(memory.assignments.size).toBe(expectedAssignments)
    expect(Object.values(memory.deletes).every((spy) => spy.mock.calls.length === 0)).toBe(true)
  })

  it('reactivates only the matching system group and leaves custom data intact', async () => {
    const memory = createMemoryPrisma()
    memory.groups.set('member', {
      groupId: 12n,
      name: 'member',
      description: 'old member description',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    memory.groups.set('custom_group', {
      groupId: 99n,
      name: 'custom_group',
      description: 'custom description',
      deletedAt: null,
    })
    memory.permissions.set('custom.permission', {
      permissionId: 900n,
      code: 'custom.permission',
      name: 'Custom permission',
      description: 'custom',
    })
    memory.assignments.add('99:900')

    const report = await synchronizeSystemRbac(memory.prisma)

    expect(report.groups.reactivated).toBe(1)
    expect(memory.groups.get('member')?.deletedAt).toBeNull()
    expect(memory.groups.get('custom_group')).toMatchObject({
      description: 'custom description',
      deletedAt: null,
    })
    expect(memory.assignments.has('99:900')).toBe(true)
    expect(memory.permissions.get('custom.permission')).toMatchObject({ name: 'Custom permission' })
  })

  it('reconciles the audited legacy snapshot and removes only notification.send', async () => {
    const memory = createMemoryPrisma()
    const missingFromLegacy = new Set([
      'subscription.cancel',
      'attendance.self-checkin',
      'notification.read',
      'exercise.read',
      'exercise.create',
      'exercise.update',
      'exercise.delete',
      'workout_plan.create',
      'workout_plan.update',
      'workout_plan.delete',
      'workout_log.read',
      'workout_log.create',
      'workout_log.update',
    ])
    for (const permission of SYSTEM_PERMISSIONS) {
      if (!missingFromLegacy.has(permission.code)) memory.seedPermission(permission.code)
    }
    memory.seedPermission('notification.send')
    for (const groupName of SYSTEM_GROUP_NAMES) {
      memory.seedGroup(groupName, SYSTEM_GROUP_DESCRIPTIONS[groupName])
    }

    const legacyMissing: Record<(typeof SYSTEM_GROUP_NAMES)[number], string[]> = {
      owner: [...missingFromLegacy],
      staff: ['staff.update', 'subscription.cancel', 'notification.read'],
      trainer: [
        'staff.update',
        'notification.read',
        'exercise.read',
        'exercise.create',
        'exercise.update',
        'exercise.delete',
        'workout_plan.create',
        'workout_plan.update',
        'workout_plan.delete',
      ],
      member: [
        'subscription.cancel',
        'attendance.self-checkin',
        'feedback.read',
        'notification.read',
        'exercise.read',
        'workout_plan.create',
        'workout_plan.update',
        'workout_plan.delete',
        'workout_log.read',
        'workout_log.create',
        'workout_log.update',
      ],
    }
    for (const groupName of SYSTEM_GROUP_NAMES) {
      for (const code of SYSTEM_ROLE_PERMISSIONS[groupName]) {
        if (!legacyMissing[groupName].includes(code)) memory.assign(groupName, code)
      }
    }
    memory.assign('owner', 'notification.send')
    memory.assign('staff', 'notification.send')

    const first = await synchronizeSystemRbac(memory.prisma)
    const second = await synchronizeSystemRbac(memory.prisma)

    expect(first.permissions).toEqual({
      created: 13,
      metadataUpdated: 0,
      unchanged: 39,
      removed: 1,
    })
    expect(first.assignments).toEqual({ desired: 126, created: 36, skipped: 90, removed: 2 })
    expect(second.permissions).toEqual({
      created: 0,
      metadataUpdated: 0,
      unchanged: 52,
      removed: 0,
    })
    expect(second.assignments).toEqual({ desired: 126, created: 0, skipped: 126, removed: 0 })
    expect(memory.permissions.has('notification.send')).toBe(false)
    expect(memory.permissions.size).toBe(52)
    expect(memory.assignments.size).toBe(126)
  })

  it('refuses cleanup before changing data when a custom group uses notification.send', async () => {
    const memory = createMemoryPrisma()
    memory.seedPermission('notification.send')
    memory.seedGroup('custom_group', 'custom description')
    memory.assign('custom_group', 'notification.send')

    await expect(synchronizeSystemRbac(memory.prisma)).rejects.toThrow(
      'assigned to custom groups: custom_group'
    )

    expect(memory.permissions.size).toBe(1)
    expect(memory.permissions.has('notification.send')).toBe(true)
    expect(memory.assignments.size).toBe(1)
    expect(memory.deletes.permissionDelete).not.toHaveBeenCalled()
    expect(memory.deletes.assignmentDeleteMany).not.toHaveBeenCalled()
  })
})
