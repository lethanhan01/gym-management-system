import { NotFoundException } from '@nestjs/common'
import { PermissionsController } from './permissions.controller'
import { RbacService } from './rbac.service'

const mockRbac = {
  listPermissions: jest.fn(),
  getPermission: jest.fn(),
} as unknown as RbacService

const ctrl = new PermissionsController(mockRbac)

beforeEach(() => jest.clearAllMocks())

describe('PermissionsController', () => {
  describe('list', () => {
    it('delegates to listPermissions and wraps success', async () => {
      const serviceResult = { data: [{ id: '1', code: 'user.read' }], meta: { total: 1 } }
      ;(mockRbac.listPermissions as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.list('1', '20', 'user')
      expect(mockRbac.listPermissions).toHaveBeenCalledWith(1, 20, 'user')
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates exception from service', async () => {
      (mockRbac.listPermissions as jest.Mock).mockRejectedValue(new Error('DB error'))
      await expect(ctrl.list('1', '20', undefined)).rejects.toThrow('DB error')
    })
  })

  describe('detail', () => {
    it('delegates to getPermission with BigInt id and wraps success', async () => {
      const serviceResult = { data: { id: '5', code: 'rbac.manage' } }
      ;(mockRbac.getPermission as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(5)
      expect(mockRbac.getPermission).toHaveBeenCalledWith(BigInt(5))
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      (mockRbac.getPermission as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.detail(999)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
