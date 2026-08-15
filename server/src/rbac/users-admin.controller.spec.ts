import { ForbiddenException } from '@nestjs/common'
import { UsersAdminController } from './users-admin.controller'
import { RbacService } from './rbac.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockRbac = {
  listUsers: jest.fn(),
  getUser: jest.fn(),
  getUserGroups: jest.fn(),
  assignUserGroup: jest.fn(),
  revokeUserGroup: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
} as unknown as RbacService

const mockPrisma = {
  userGroup: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService

const ctrl = new UsersAdminController(mockRbac, mockPrisma)

const owner: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'owner@test.com',
  roles: ['owner'],
}

const staff: AuthenticatedUser = {
  userId: BigInt(2),
  email: 'staff@test.com',
  roles: ['staff'],
}

beforeEach(() => jest.clearAllMocks())

describe('UsersAdminController', () => {
  describe('list', () => {
    it('delegates to listUsers and wraps success', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockRbac.listUsers as jest.Mock).mockResolvedValue(serviceResult)
      const query = { page: 1, pageSize: 20 } as any
      const res = await ctrl.list(query)
      expect(mockRbac.listUsers).toHaveBeenCalledWith(query)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('detail', () => {
    it('returns own profile without permission check (self bypass)', async () => {
      const serviceResult = { data: { id: '1', email: 'owner@test.com' } }
      ;(mockRbac.getUser as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(1, owner)
      expect(mockPrisma.userGroup.findMany).not.toHaveBeenCalled()
      expect(mockRbac.getUser).toHaveBeenCalledWith(BigInt(1))
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('throws ForbiddenException when accessing other user without permission', async () => {
      (mockPrisma.userGroup.findMany as jest.Mock).mockResolvedValue([])
      await expect(ctrl.detail(99, staff)).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('allows access to other user when permission exists', async () => {
      const serviceResult = { data: { id: '99', email: 'other@test.com' } }
      ;(mockPrisma.userGroup.findMany as jest.Mock).mockResolvedValue([
        {
          group: {
            permissions: [{ permission: { code: 'user.read' } }],
          },
        },
      ])
      ;(mockRbac.getUser as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(99, staff)
      expect(mockRbac.getUser).toHaveBeenCalledWith(BigInt(99))
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('assignGroup', () => {
    it('delegates to assignUserGroup and wraps success', async () => {
      const serviceResult = { data: { userId: '5', groupId: '2' } }
      ;(mockRbac.assignUserGroup as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { groupId: 2 } as any
      const res = await ctrl.assignGroup(5, dto, owner)
      expect(mockRbac.assignUserGroup).toHaveBeenCalledWith(BigInt(5), BigInt(2), owner.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('update', () => {
    it('allows self-update without permission check', async () => {
      const serviceResult = { data: { id: '1' } }
      ;(mockRbac.updateUser as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { fullName: 'Updated' } as any
      const res = await ctrl.update(1, dto, owner)
      expect(mockPrisma.userGroup.findMany).not.toHaveBeenCalled()
      expect(mockRbac.updateUser).toHaveBeenCalledWith(BigInt(1), dto, owner.userId, true)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('throws ForbiddenException when updating other user without permission', async () => {
      (mockPrisma.userGroup.findMany as jest.Mock).mockResolvedValue([])
      await expect(ctrl.update(99, {} as any, staff)).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('delegates to deleteUser and returns void', async () => {
      (mockRbac.deleteUser as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.delete(5, owner)
      expect(mockRbac.deleteUser).toHaveBeenCalledWith(BigInt(5), owner.userId)
      expect(res).toBeUndefined()
    })
  })
})
