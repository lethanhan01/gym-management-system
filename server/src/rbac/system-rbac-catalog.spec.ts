import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  SYSTEM_GROUP_NAMES,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  validateSystemRbacCatalog,
} from './system-rbac-catalog'

function controllerFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) return controllerFiles(fullPath)
    return entry.name.endsWith('.controller.ts') ? [fullPath] : []
  })
}

function requiredPermissionCodes(): string[] {
  const codes = new Set<string>()
  for (const file of controllerFiles(join(process.cwd(), 'src'))) {
    const content = readFileSync(file, 'utf8')
    for (const match of content.matchAll(/@RequirePermission\(\s*'([^']+)'\s*\)/g)) {
      codes.add(match[1])
    }
  }
  return [...codes].sort()
}

describe('system RBAC catalog', () => {
  it('contains 51 unique permissions and covers every decorated controller permission', () => {
    const catalogCodes = SYSTEM_PERMISSIONS.map((permission) => permission.code)
    const decoratedCodes = requiredPermissionCodes()

    expect(catalogCodes).toHaveLength(51)
    expect(new Set(catalogCodes).size).toBe(51)
    expect(decoratedCodes).toHaveLength(48)
    expect(decoratedCodes.every((code) => catalogCodes.includes(code))).toBe(true)
  })

  it('has valid, deduplicated mappings for every system group', () => {
    expect(() => validateSystemRbacCatalog()).not.toThrow()

    const catalogCodes = new Set(SYSTEM_PERMISSIONS.map((permission) => permission.code))
    for (const groupName of SYSTEM_GROUP_NAMES) {
      const codes = SYSTEM_ROLE_PERMISSIONS[groupName]
      expect(new Set(codes).size).toBe(codes.length)
      expect(codes.every((code) => catalogCodes.has(code))).toBe(true)
    }
  })

  it('grants the intended new and sensitive permissions', () => {
    expect(SYSTEM_ROLE_PERMISSIONS.owner).toEqual(
      SYSTEM_PERMISSIONS.map((permission) => permission.code)
    )
    expect(SYSTEM_ROLE_PERMISSIONS.owner).toContain('exercise.sync')
    expect(SYSTEM_ROLE_PERMISSIONS.staff).toEqual(
      expect.arrayContaining(['subscription.cancel', 'staff.update'])
    )
    expect(SYSTEM_ROLE_PERMISSIONS.trainer).toEqual(
      expect.arrayContaining([
        'staff.update',
        'exercise.create',
        'exercise.update',
        'exercise.delete',
        'workout_plan.create',
      ])
    )
    expect(SYSTEM_ROLE_PERMISSIONS.member).toEqual(
      expect.arrayContaining([
        'feedback.read',
        'subscription.cancel',
        'exercise.read',
        'workout_log.create',
        'workout_log.update',
      ])
    )
    expect(
      SYSTEM_GROUP_NAMES.every((groupName) =>
        SYSTEM_ROLE_PERMISSIONS[groupName].includes('notification.read')
      )
    ).toBe(true)
  })
})
