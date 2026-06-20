import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { PaymentMethod } from '@prisma/client'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { RenewSubscriptionDto } from './dto/renew-subscription.dto'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'

const mockService = {
  createSubscription: jest.fn(),
  listSubscriptions: jest.fn(),
  listByMember: jest.fn(),
  cancelSubscription: jest.fn(),
  renewSubscription: jest.fn(),
  getSubscription: jest.fn(),
} as unknown as SubscriptionsService

const ctrl = new SubscriptionsController(mockService)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'staff@test.com',
  roles: ['staff'],
}

beforeEach(() => jest.clearAllMocks())

describe('SubscriptionsController', () => {
  describe('create', () => {
    it('delegates to createSubscription and wraps success', async () => {
      const serviceResult = { data: { id: '20', packageId: '5' } }
      ;(mockService.createSubscription as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { packageId: 5, memberId: 10 } as any
      const res = await ctrl.create(dto, user)
      expect(mockService.createSubscription).toHaveBeenCalledWith(dto, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      (mockService.createSubscription as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.create({} as any, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('list', () => {
    it('delegates to listSubscriptions and wraps success', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockService.listSubscriptions as jest.Mock).mockResolvedValue(serviceResult)
      const query = { status: 'active' } as any
      const res = await ctrl.list(query, user)
      expect(mockService.listSubscriptions).toHaveBeenCalledWith(query, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('listByMember', () => {
    it('delegates to listByMember with BigInt memberId', async () => {
      const serviceResult = { data: [{ id: '10' }] }
      ;(mockService.listByMember as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.listByMember(15, user)
      expect(mockService.listByMember).toHaveBeenCalledWith(BigInt(15), user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates ForbiddenException', async () => {
      (mockService.listByMember as jest.Mock).mockRejectedValue(new ForbiddenException())
      await expect(ctrl.listByMember(15, user)).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('cancel', () => {
    it('delegates to cancelSubscription and wraps success', async () => {
      const serviceResult = { data: { id: '7', status: 'cancelled' } }
      ;(mockService.cancelSubscription as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.cancel(7, {}, user)
      expect(mockService.cancelSubscription).toHaveBeenCalledWith(BigInt(7), user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      (mockService.cancelSubscription as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.cancel(999, {}, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('renew', () => {
    const renewDto: RenewSubscriptionDto = { method: PaymentMethod.cash }

    it('delegates to renewSubscription and wraps success', async () => {
      const serviceResult = { data: { id: '8', status: 'active' } }
      ;(mockService.renewSubscription as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.renew(8, renewDto, user)
      expect(mockService.renewSubscription).toHaveBeenCalledWith(BigInt(8), renewDto, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates exception', async () => {
      (mockService.renewSubscription as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.renew(999, renewDto, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('detail', () => {
    it('delegates to getSubscription and wraps success', async () => {
      const serviceResult = { data: { id: '9', packageId: '3' } }
      ;(mockService.getSubscription as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(9, user)
      expect(mockService.getSubscription).toHaveBeenCalledWith(BigInt(9), user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      (mockService.getSubscription as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.detail(999, user)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
