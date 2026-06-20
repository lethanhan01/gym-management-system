import { Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type Role = 'owner' | 'staff' | 'trainer' | 'member'

export interface UserWithRoles extends User {
  roles: Role[]
  memberId?: bigint | null
}

/**
 * Service quan ly tai khoan (su dung boi AuthModule va cac module nghiep vu).
 * Roles cua user duoc lay tu join: users -> user_groups -> groups
 * (vai tro group.name la 1 trong 4 vai tro: owner | staff | trainer | member).
 *
 * Tat ca method deu filter deleted_at IS NULL — user da soft-delete khong duoc tra ve.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tim user theo email kem danh sach role (de issue JWT). Khong tra user da xoa. */
  async findByEmailWithRoles(email: string): Promise<UserWithRoles | null> {
    const row = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        groups: { include: { group: true } },
      },
    })
    if (!row) return null

    const { groups, ...user } = row
    return {
      ...user,
      roles: groups.map((ug) => ug.group.name as Role),
    }
  }

  /** Tim user theo lineId kem danh sach role (de issue JWT cho LINE login). Khong tra user da xoa. */
  async findByLineIdWithRoles(lineId: string): Promise<UserWithRoles | null> {
    const row = await this.prisma.user.findFirst({
      where: { lineId, deletedAt: null },
      include: {
        groups: { include: { group: true } },
      },
    })
    if (!row) return null

    const { groups, ...user } = row
    return {
      ...user,
      roles: groups.map((ug) => ug.group.name as Role),
    }
  }

  /** Tim user theo user_id kem roles (dung trong endpoint /me). Khong tra user da xoa. */
  async findByIdWithRoles(userId: bigint): Promise<UserWithRoles | null> {
    const row = await this.prisma.user.findFirst({
      where: { userId, deletedAt: null },
      include: {
        groups: { include: { group: true } },
        member: { select: { memberId: true } },
      },
    })
    if (!row) return null

    const { groups, member, ...user } = row
    return {
      ...user,
      roles: groups.map((ug) => ug.group.name as Role),
      memberId: member?.memberId ?? null,
    }
  }
}
