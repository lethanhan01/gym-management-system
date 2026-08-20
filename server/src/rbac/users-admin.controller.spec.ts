import { ForbiddenException } from '@nestjs/common'
import { UsersAdminController } from './users-admin.controller'
import { RbacService } from './rbac.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { ListUsersDto } from './dto/list-users.dto'
import { AssignGroupDto } from './dto/assign-group.dto'
import { UpdateUserDto } from './dto/update-user.dto'

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
      jest.mocked(mockRbac.listUsers).mockResolvedValue(serviceResult as never)
      const query = { page: 1, pageSize: 20 } as ListUsersDto
      const res = await ctrl.list(query)
      expect(mockRbac.listUsers).toHaveBeenCalledWith(query)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('detail', () => {
    it('returns own profile without permission check (self bypass)', async () => {
      const serviceResult = { data: { id: '1', email: 'owner@test.com' } }
      jest.mocked(mockRbac.getUser).mockResolvedValue(serviceResult as never)
      const res = await ctrl.detail(1, owner)
      expect(mockPrisma.userGroup.findMany).not.toHaveBeenCalled()
      expect(mockRbac.getUser).toHaveBeenCalledWith(BigInt(1))
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('throws ForbiddenException when accessing other user without permission', async () => {
      jest.mocked(mockPrisma.userGroup.findMany).mockResolvedValue([])
      await expect(ctrl.detail(99, staff)).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('allows access to other user when permission exists', async () => {
      const serviceResult = { data: { id: '99', email: 'other@test.com' } }
      jest.mocked(mockPrisma.userGroup.findMany).mockResolvedValue([
        {
          group: {
            permissions: [{ permission: { code: 'user.read' } }],
          },
        },
      ] as never)
      jest.mocked(mockRbac.getUser).mockResolvedValue(serviceResult as never)
      const res = await ctrl.detail(99, staff)
      expect(mockRbac.getUser).toHaveBeenCalledWith(BigInt(99))
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('assignGroup', () => {
    it('delegates to assignUserGroup and wraps success', async () => {
      const serviceResult = { data: { userId: '5', groupId: '2' } }
      jest.mocked(mockRbac.assignUserGroup).mockResolvedValue(serviceResult as never)
      const dto: AssignGroupDto = { groupId: '2' }
      const res = await ctrl.assignGroup(5, dto, owner)
      expect(mockRbac.assignUserGroup).toHaveBeenCalledWith(BigInt(5), BigInt(2), owner.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('update', () => {
    it('allows self-update without permission check', async () => {
      const serviceResult = { data: { id: '1' } }
      jest.mocked(mockRbac.updateUser).mockResolvedValue(serviceResult as never)
      const dto = { fullName: 'Updated' } as UpdateUserDto
      const res = await ctrl.update(1, dto, owner)
      expect(mockPrisma.userGroup.findMany).not.toHaveBeenCalled()
      expect(mockRbac.updateUser).toHaveBeenCalledWith(BigInt(1), dto, owner.userId, true)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('throws ForbiddenException when updating other user without permission', async () => {
      jest.mocked(mockPrisma.userGroup.findMany).mockResolvedValue([])
      await expect(ctrl.update(99, {} as UpdateUserDto, staff)).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('delegates to deleteUser with hard=false when hard query param is undefined', async () => {
      jest.mocked(mockRbac.deleteUser).mockResolvedValue(undefined as never)
      const res = await ctrl.delete(5, undefined, owner)
      expect(mockRbac.deleteUser).toHaveBeenCalledWith(BigInt(5), owner.userId, false)
      expect(res).toBeUndefined()
    })

    it('delegates to deleteUser with hard=true when hard query param is true', async () => {
      jest.mocked(mockRbac.deleteUser).mockResolvedValue(undefined as never)
      const res = await ctrl.delete(5, 'true', owner)
      expect(mockRbac.deleteUser).toHaveBeenCalledWith(BigInt(5), owner.userId, true)
      expect(res).toBeUndefined()
    })
  })
})
