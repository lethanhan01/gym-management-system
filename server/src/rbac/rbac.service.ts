import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../common/audit/audit.service'
import {
  IPermissionCacheProvider,
  PERMISSION_CACHE_PROVIDER,
} from '../common/interfaces/permission-cache.interface'
import { CreateGroupDto } from './dto/create-group.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { ListUsersDto } from './dto/list-users.dto'

const SYSTEM_GROUPS = new Set(['owner', 'staff', 'trainer', 'member'])

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(PERMISSION_CACHE_PROVIDER) private readonly permCache: IPermissionCacheProvider,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // PERMISSIONS (read-only catalog)
  // ──────────────────────────────────────────────────────────────

  async listPermissions(page: number, pageSize: number, resource?: string) {
    const where = resource ? { code: { startsWith: `${resource}.` } } : {}
    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { code: 'asc' },
      }),
      this.prisma.permission.count({ where }),
    ])
    return {
      data: data.map(this.serializePermission),
      meta: { page, pageSize, total },
    }
  }

  async getPermission(id: bigint) {
    const p = await this.prisma.permission.findUnique({ where: { permissionId: id } })
    if (!p) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Permission không tồn tại' })
    return { data: this.serializePermission(p) }
  }

  // ──────────────────────────────────────────────────────────────
  // GROUPS
  // ──────────────────────────────────────────────────────────────

  async listGroups(page: number, pageSize: number, search?: string, includeDeleted = false) {
    const where: Prisma.GroupWhereInput = {}
    if (!includeDeleted) where.deletedAt = null
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]

    const [rows, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { users: true, permissions: true } },
          permissions: {
            include: { permission: true },
          },
        },
        orderBy: { groupId: 'asc' },
      }),
      this.prisma.group.count({ where }),
    ])

    return {
      data: rows.map((g) => ({
        groupId: g.groupId.toString(),
        name: g.name,
        description: g.description,
        memberCount: g._count.users,
        permissionCount: g._count.permissions,
        permissions: g.permissions
          .map((gp) => this.serializePermission(gp.permission))
          .sort((a, b) => a.code.localeCompare(b.code)),
        createdAt: null,
        deletedAt: g.deletedAt,
      })),
      meta: { page, pageSize, total },
    }
  }

  async getGroup(id: bigint) {
    const g = await this.prisma.group.findFirst({
      where: { groupId: id, deletedAt: null },
      include: {
        _count: { select: { users: true } },
        permissions: { include: { permission: true } },
      },
    })
    if (!g) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Group không tồn tại' })
    return {
      data: {
        groupId: g.groupId.toString(),
        name: g.name,
        description: g.description,
        memberCount: g._count.users,
        permissions: g.permissions.map((gp) => this.serializePermission(gp.permission)),
        deletedAt: g.deletedAt,
      },
    }
  }

  async createGroup(dto: CreateGroupDto, actorUserId: bigint) {
    if (SYSTEM_GROUPS.has(dto.name)) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: ['name reserved for system group'] })
    }

    const permIds = await this.resolvePermissionCodes(dto.permissions ?? [])

    const group = await this.prisma.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name: dto.name,
          description: dto.description,
          permissions: permIds.length
            ? { create: permIds.map((id) => ({ permissionId: id })) }
            : undefined,
        },
        include: {
          _count: { select: { users: true } },
          permissions: { include: { permission: true } },
        },
      })
      return g
    })

    this.audit.log({
      actorUserId,
      action: 'group.create',
      resourceType: 'group',
      resourceId: group.groupId.toString(),
      afterData: { name: group.name, permissions: dto.permissions ?? [] },
    })

    return {
      data: {
        groupId: group.groupId.toString(),
        name: group.name,
        description: group.description,
        memberCount: group._count.users,
        permissions: group.permissions.map((gp) => this.serializePermission(gp.permission)),
        deletedAt: null,
      },
    }
  }

  async updateGroup(id: bigint, dto: UpdateGroupDto, actorUserId: bigint) {
    const existing = await this.prisma.group.findFirst({ where: { groupId: id, deletedAt: null } })
    if (!existing) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Group không tồn tại' })

    if (dto.name && SYSTEM_GROUPS.has(existing.name) && dto.name !== existing.name) {
      throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: ['cannot rename system group'] })
    }

    const updated = await this.prisma.group.update({
      where: { groupId: id },
      data: { name: dto.name, description: dto.description },
      include: {
        _count: { select: { users: true } },
        permissions: { include: { permission: true } },
      },
    })

    this.audit.log({
      actorUserId,
      action: 'group.update',
      resourceType: 'group',
      resourceId: id.toString(),
      beforeData: { name: existing.name, description: existing.description },
      afterData: { name: updated.name, description: updated.description },
    })

    return {
      data: {
        groupId: updated.groupId.toString(),
        name: updated.name,
        description: updated.description,
        memberCount: updated._count.users,
        permissions: updated.permissions.map((gp) => this.serializePermission(gp.permission)),
        deletedAt: updated.deletedAt,
      },
    }
  }

  async deleteGroup(id: bigint, actorUserId: bigint) {
    const g = await this.prisma.group.findFirst({
      where: { groupId: id, deletedAt: null },
      include: { _count: { select: { users: true } } },
    })
    if (!g) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Group không tồn tại' })
    if (SYSTEM_GROUPS.has(g.name)) throw new ConflictException({ success: false, code: 'GROUP_IS_SYSTEM', message: 'Không thể xóa system group' })
    if (g._count.users > 0) throw new ConflictException({ success: false, code: 'GROUP_HAS_USERS', message: 'Group còn user được gán — hãy remove user trước' })

    await this.prisma.group.update({ where: { groupId: id }, data: { deletedAt: new Date() } })
    this.audit.log({ actorUserId, action: 'group.delete', resourceType: 'group', resourceId: id.toString() })
  }

  async assignPermissions(groupId: bigint, permissionIds: string[], actorUserId: bigint) {
    const g = await this.prisma.group.findFirst({ where: { groupId, deletedAt: null } })
    if (!g) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Group không tồn tại' })

    const bigintIds = permissionIds.map((id) => BigInt(id))
    const existing = await this.prisma.groupPermission.findMany({ where: { groupId } })
    const existingIds = new Set(existing.map((e) => e.permissionId.toString()))

    const toAdd = bigintIds.filter((id) => !existingIds.has(id.toString()))
    if (toAdd.length > 0) {
      await this.prisma.groupPermission.createMany({
        data: toAdd.map((permissionId) => ({ groupId, permissionId })),
      })
      await this.permCache.delete(groupId.toString())
    }

    const permMap = await this.prisma.permission.findMany({ where: { permissionId: { in: bigintIds } } })
    const codeMap = new Map(permMap.map((p) => [p.permissionId.toString(), p.code]))
    const added = toAdd.map((id) => codeMap.get(id.toString()) ?? '')
    const skipped = bigintIds.filter((id) => existingIds.has(id.toString())).map((id) => codeMap.get(id.toString()) ?? '')

    if (added.length > 0) {
      this.audit.log({ actorUserId, action: 'group.assign-permission', resourceType: 'group', resourceId: groupId.toString(), afterData: { added } })
    }

    return { data: { groupId: groupId.toString(), added, skipped } }
  }

  async revokePermission(groupId: bigint, permissionId: bigint, actorUserId: bigint) {
    const row = await this.prisma.groupPermission.findUnique({
      where: { groupId_permissionId: { groupId, permissionId } },
    })
    if (!row) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Permission chưa được gán cho group này' })

    await this.prisma.groupPermission.delete({
      where: { groupId_permissionId: { groupId, permissionId } },
    })
    await this.permCache.delete(groupId.toString())
    this.audit.log({ actorUserId, action: 'group.revoke-permission', resourceType: 'group', resourceId: groupId.toString(), afterData: { permissionId: permissionId.toString() } })
  }

  // ──────────────────────────────────────────────────────────────
  // USERS (admin view)
  // ──────────────────────────────────────────────────────────────

  async listUsers(q: ListUsersDto) {
    const { page = 1, pageSize = 20, search, groupId, role, status, includeDeleted = false, sort = 'created_at:desc' } = q

    const where: Prisma.UserWhereInput = {}
    if (!includeDeleted) where.deletedAt = null
    if (status) where.status = status
    if (search) where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
    if (groupId) {
      where.groups = { some: { groupId: BigInt(groupId) } }
    } else if (role) {
      where.groups = { some: { group: { name: role } } }
    }

    const [field, dir] = (sort ?? 'created_at:desc').split(':')
    const orderBy = { [this.toCamel(field ?? 'created_at')]: dir === 'asc' ? 'asc' : 'desc' } as Prisma.UserOrderByWithRelationInput

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { groups: { include: { group: true } } },
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      data: rows.map((u) => ({
        userId: u.userId.toString(),
        email: u.email,
        fullName: u.fullName,
        phone: u.phone ?? null,
        status: u.status,
        emailVerifiedAt: u.emailVerifiedAt,
        roles: u.groups.map((ug) => ug.group.name),
        createdAt: u.createdAt,
        deletedAt: u.deletedAt,
      })),
      meta: { page, pageSize, total },
    }
  }

  async getUser(id: bigint) {
    const u = await this.prisma.user.findFirst({
      where: { userId: id, deletedAt: null },
      include: {
        groups: { include: { group: { include: { _count: { select: { permissions: true } } } } } },
        member: true,
        staff: true,
      },
    })
    if (!u) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'User không tồn tại' })

    return {
      data: {
        userId: u.userId.toString(),
        email: u.email,
        fullName: u.fullName,
        phone: u.phone ?? null,
        status: u.status,
        emailVerifiedAt: u.emailVerifiedAt,
        avatarFileId: u.avatarFileId?.toString() ?? null,
        roles: u.groups.map((ug) => ug.group.name),
        groups: u.groups.map((ug) => ({
          groupId: ug.group.groupId.toString(),
          name: ug.group.name,
        })),
        member: u.member
          ? {
              memberId: u.member.memberId.toString(),
              memberCode: u.member.memberCode,
              dateOfBirth: u.member.dateOfBirth,
              primaryTrainerId: u.member.primaryTrainerId?.toString() ?? null,
            }
          : null,
        staff: u.staff
          ? { staffId: u.staff.staffId.toString(), staffCode: u.staff.staffCode, position: u.staff.position }
          : null,
        createdAt: u.createdAt,
        deletedAt: u.deletedAt,
      },
    }
  }

  async getUserGroups(userId: bigint) {
    const rows = await this.prisma.userGroup.findMany({
      where: { userId },
      include: {
        group: { include: { _count: { select: { permissions: true } } } },
      },
    })
    return {
      data: rows.map((ug) => ({
        groupId: ug.group.groupId.toString(),
        name: ug.group.name,
        description: ug.group.description,
        permissionCount: ug.group._count.permissions,
      })),
    }
  }

  async assignUserGroup(userId: bigint, groupId: bigint, actorUserId: bigint) {
    const user = await this.prisma.user.findFirst({ where: { userId, deletedAt: null } })
    if (!user) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'User không tồn tại' })

    const group = await this.prisma.group.findFirst({ where: { groupId, deletedAt: null } })
    if (!group) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'groupId không tồn tại' })

    const existing = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (existing) return { data: { userId: userId.toString(), groupId: groupId.toString(), groupName: group.name, wasAlreadyAssigned: true } }

    await this.prisma.userGroup.create({ data: { userId, groupId } })
    await this.permCache.delete(userId.toString())

    this.audit.log({ actorUserId, action: 'user.assign-group', resourceType: 'user', resourceId: userId.toString(), afterData: { groupId: groupId.toString(), groupName: group.name } })

    return { data: { userId: userId.toString(), groupId: groupId.toString(), groupName: group.name, wasAlreadyAssigned: false } }
  }

  async revokeUserGroup(userId: bigint, groupId: bigint, actorUserId: bigint) {
    const row = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!row) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Assignment không tồn tại' })

    const count = await this.prisma.userGroup.count({ where: { userId } })
    if (count <= 1) throw new ConflictException({ success: false, code: 'USER_NEEDS_AT_LEAST_ONE_GROUP', message: 'User phải có ít nhất 1 group — assign group khác trước' })

    await this.prisma.userGroup.delete({ where: { userId_groupId: { userId, groupId } } })
    await this.permCache.delete(userId.toString())
    this.audit.log({ actorUserId, action: 'user.revoke-group', resourceType: 'user', resourceId: userId.toString(), afterData: { groupId: groupId.toString() } })
  }

  async updateUser(id: bigint, dto: UpdateUserDto, actorUserId: bigint, isSelf: boolean) {
    const user = await this.prisma.user.findFirst({ where: { userId: id, deletedAt: null } })
    if (!user) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'User không tồn tại' })

    if (isSelf && dto.status) throw new BadRequestException({ success: false, code: 'FORBIDDEN', message: 'Không thể tự cập nhật status' })

    const data: Prisma.UserUncheckedUpdateInput = {}
    if (dto.fullName !== undefined) data.fullName = dto.fullName
    if (dto.phone !== undefined) data.phone = dto.phone
    if (dto.status !== undefined) data.status = dto.status
    if (dto.avatarFileId !== undefined) data.avatarFileId = BigInt(dto.avatarFileId)

    const updated = await this.prisma.user.update({
      where: { userId: id },
      data,
      include: { groups: { include: { group: true } } },
    })

    this.audit.log({
      actorUserId,
      action: 'user.update',
      resourceType: 'user',
      resourceId: id.toString(),
      beforeData: { fullName: user.fullName, phone: user.phone, status: user.status },
      afterData: { fullName: updated.fullName, phone: updated.phone, status: updated.status },
    })

    return {
      data: {
        userId: updated.userId.toString(),
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone ?? null,
        status: updated.status,
        roles: updated.groups.map((ug) => ug.group.name),
      },
    }
  }

  async deleteUser(id: bigint, actorUserId: bigint) {
    if (id === actorUserId) throw new ConflictException({ success: false, code: 'USER_IS_SELF', message: 'Không thể tự xóa tài khoản của mình' })

    const user = await this.prisma.user.findFirst({
      where: { userId: id, deletedAt: null },
      include: { groups: { include: { group: true } }, member: true, staff: true },
    })
    if (!user) throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'User không tồn tại' })

    const isOwner = user.groups.some((ug) => ug.group.name === 'owner')
    if (isOwner) {
      const ownerCount = await this.prisma.userGroup.count({
        where: { group: { name: 'owner' }, user: { deletedAt: null } },
      })
      if (ownerCount <= 1) throw new ConflictException({ success: false, code: 'USER_IS_LAST_OWNER', message: 'Không thể xóa owner duy nhất còn lại' })
    }

    const now = new Date()
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { userId: id }, data: { deletedAt: now } })
      if (user.member) await tx.member.update({ where: { memberId: user.member.memberId }, data: { deletedAt: now } })
      if (user.staff) await tx.staff.update({ where: { staffId: user.staff.staffId }, data: { deletedAt: now } })
    })

    await this.permCache.delete(id.toString())
    this.audit.log({ actorUserId, action: 'user.delete', resourceType: 'user', resourceId: id.toString(), beforeData: { email: user.email, fullName: user.fullName } })
  }

  // ──────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────

  private async resolvePermissionCodes(codes: string[]): Promise<bigint[]> {
    if (codes.length === 0) return []
    const rows = await this.prisma.permission.findMany({ where: { code: { in: codes } } })
    const found = new Set(rows.map((r) => r.code))
    const unknown = codes.filter((c) => !found.has(c))
    if (unknown.length > 0) throw new BadRequestException({ success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: unknown.map((c) => `unknown permission: ${c}`) })
    return rows.map((r) => r.permissionId)
  }

  private serializePermission(p: { permissionId: bigint; code: string; name: string; description: string | null }) {
    return { permissionId: p.permissionId.toString(), code: p.code, name: p.name, description: p.description }
  }

  private toCamel(snake: string) {
    return snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  }
}
