import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { GroupsController } from './groups.controller'
import { RbacService } from './rbac.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockRbac = {
  listGroups: jest.fn(),
  getGroup: jest.fn(),
  createGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
  assignPermissions: jest.fn(),
  revokePermission: jest.fn(),
} as unknown as RbacService

const ctrl = new GroupsController(mockRbac)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'owner@test.com',
  roles: ['owner'],
}

beforeEach(() => jest.clearAllMocks())

describe('GroupsController', () => {
  describe('list', () => {
    it('delegates to listGroups with parsed params and wraps success', async () => {
      const serviceResult = { data: [{ id: '1', name: 'admin' }], meta: { total: 1 } }
      ;(mockRbac.listGroups as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.list('1', '20', 'admin', undefined)
      expect(mockRbac.listGroups).toHaveBeenCalledWith(1, 20, 'admin', false)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('passes includeDeleted=true when query param is "true"', async () => {
      ;(mockRbac.listGroups as jest.Mock).mockResolvedValue({ data: [], meta: {} })
      await ctrl.list('1', '10', undefined, 'true')
      expect(mockRbac.listGroups).toHaveBeenCalledWith(1, 10, undefined, true)
    })
  })

  describe('detail', () => {
    it('delegates to getGroup with BigInt id and wraps success', async () => {
      const serviceResult = { data: { id: '5', name: 'staff' } }
      ;(mockRbac.getGroup as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(5)
      expect(mockRbac.getGroup).toHaveBeenCalledWith(BigInt(5))
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      ;(mockRbac.getGroup as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.detail(999)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('create', () => {
    it('delegates to createGroup and wraps success', async () => {
      const serviceResult = { data: { id: '10', name: 'new-group' } }
      ;(mockRbac.createGroup as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { name: 'new-group', description: 'desc' } as any
      const res = await ctrl.create(dto, user)
      expect(mockRbac.createGroup).toHaveBeenCalledWith(dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('update', () => {
    it('delegates to updateGroup and wraps success', async () => {
      const serviceResult = { data: { id: '5', name: 'updated' } }
      ;(mockRbac.updateGroup as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { name: 'updated' } as any
      const res = await ctrl.update(5, dto, user)
      expect(mockRbac.updateGroup).toHaveBeenCalledWith(BigInt(5), dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('delete', () => {
    it('delegates to deleteGroup and returns void', async () => {
      ;(mockRbac.deleteGroup as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.delete(5, user)
      expect(mockRbac.deleteGroup).toHaveBeenCalledWith(BigInt(5), user.userId)
      expect(res).toBeUndefined()
    })

    it('propagates ForbiddenException (protected group)', async () => {
      ;(mockRbac.deleteGroup as jest.Mock).mockRejectedValue(new ForbiddenException())
      await expect(ctrl.delete(1, user)).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('assignPermissions', () => {
    it('delegates to assignPermissions and wraps success', async () => {
      const serviceResult = { data: { assigned: 2 } }
      ;(mockRbac.assignPermissions as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { permissions: [1, 2] } as any
      const res = await ctrl.assignPermissions(5, dto, user)
      expect(mockRbac.assignPermissions).toHaveBeenCalledWith(BigInt(5), [1, 2], user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('revokePermission', () => {
    it('delegates to revokePermission and returns void', async () => {
      ;(mockRbac.revokePermission as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.revokePermission(5, 3, user)
      expect(mockRbac.revokePermission).toHaveBeenCalledWith(BigInt(5), BigInt(3), user.userId)
      expect(res).toBeUndefined()
    })
  })
})
