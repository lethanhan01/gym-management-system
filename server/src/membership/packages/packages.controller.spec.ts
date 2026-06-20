import { NotFoundException } from '@nestjs/common'
import { PackagesController } from './packages.controller'
import { PackagesService } from './packages.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'

const mockService = {
  listPackages: jest.fn(),
  getPackage: jest.fn(),
  createPackage: jest.fn(),
  updatePackage: jest.fn(),
  updatePackageStatus: jest.fn(),
  deletePackage: jest.fn(),
} as unknown as PackagesService

const ctrl = new PackagesController(mockService)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'owner@test.com',
  roles: ['owner'],
}

beforeEach(() => jest.clearAllMocks())

describe('PackagesController', () => {
  describe('list', () => {
    it('delegates to listPackages and wraps success', async () => {
      const serviceResult = { data: [{ id: '1', name: 'Basic' }], meta: { total: 1 } }
      ;(mockService.listPackages as jest.Mock).mockResolvedValue(serviceResult)
      const query = { status: 'active' } as any
      const res = await ctrl.list(query, user)
      expect(mockService.listPackages).toHaveBeenCalledWith(query, user.roles)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates exception from service', async () => {
      (mockService.listPackages as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.list({} as any, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('detail', () => {
    it('delegates to getPackage with BigInt id and hasManage=true for owner', async () => {
      const serviceResult = { data: { id: '5', name: 'Premium' } }
      ;(mockService.getPackage as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(5, user)
      expect(mockService.getPackage).toHaveBeenCalledWith(BigInt(5), true)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('passes hasManage=false for member role', async () => {
      (mockService.getPackage as jest.Mock).mockResolvedValue({ data: {} })
      const memberUser: AuthenticatedUser = {
        userId: BigInt(2),
        email: 'm@t.com',
        roles: ['member'],
      }
      await ctrl.detail(3, memberUser)
      expect(mockService.getPackage).toHaveBeenCalledWith(BigInt(3), false)
    })

    it('propagates NotFoundException', async () => {
      (mockService.getPackage as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.detail(99, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('create', () => {
    it('delegates to createPackage and wraps success', async () => {
      const serviceResult = { data: { id: '10', name: 'Gold' } }
      ;(mockService.createPackage as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { name: 'Gold', price: 500000, durationDays: 30 } as any
      const res = await ctrl.create(dto, user)
      expect(mockService.createPackage).toHaveBeenCalledWith(dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates ConflictException', async () => {
      const { ConflictException } = await import('@nestjs/common')
      ;(mockService.createPackage as jest.Mock).mockRejectedValue(new ConflictException())
      await expect(ctrl.create({} as any, user)).rejects.toBeInstanceOf(ConflictException)
    })
  })

  describe('update', () => {
    it('delegates to updatePackage and wraps success', async () => {
      const serviceResult = { data: { id: '5', name: 'Updated' } }
      ;(mockService.updatePackage as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { name: 'Updated' } as any
      const res = await ctrl.update(5, dto, user)
      expect(mockService.updatePackage).toHaveBeenCalledWith(BigInt(5), dto, user.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      (mockService.updatePackage as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.update(999, {} as any, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('updateStatus', () => {
    it('delegates to updatePackageStatus and wraps success', async () => {
      const serviceResult = { data: { id: '5', status: 'inactive' } }
      ;(mockService.updatePackageStatus as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { status: 'inactive' as any }
      const res = await ctrl.updateStatus(5, dto, user)
      expect(mockService.updatePackageStatus).toHaveBeenCalledWith(
        BigInt(5),
        'inactive',
        user.userId
      )
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('delete', () => {
    it('delegates to deletePackage and returns void', async () => {
      (mockService.deletePackage as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.delete(5, user)
      expect(mockService.deletePackage).toHaveBeenCalledWith(BigInt(5), user.userId)
      expect(res).toBeUndefined()
    })

    it('propagates NotFoundException', async () => {
      (mockService.deletePackage as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.delete(999, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
