import { Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type Role = 'owner' | 'staff' | 'trainer' | 'member'

export interface UserWithRoles extends User {
  roles: Role[]
}

/**
 * Service quan ly tai khoan (su dung boi AuthModule va cac module nghiep vu).
 * Roles cua user duoc lay tu join: users -> user_groups -> groups
 * (vai tro group.name la 1 trong 4 vai tro: owner | staff | trainer | member).
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tim user theo email kem danh sach role (de issue JWT). */
  async findByEmailWithRoles(email: string): Promise<UserWithRoles | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
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

  /** Tim user theo user_id kem roles (dung trong endpoint /me). */
  async findByIdWithRoles(userId: bigint): Promise<UserWithRoles | null> {
    const row = await this.prisma.user.findUnique({
      where: { userId },
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
}
