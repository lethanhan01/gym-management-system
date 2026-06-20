import { NotFoundException } from '@nestjs/common'
import { PaymentsController, PaymentAccountsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockService = {
  createPayment: jest.fn(),
  listPayments: jest.fn(),
  listPaymentAccounts: jest.fn(),
  createPaymentAccount: jest.fn(),
  setDefaultPaymentAccount: jest.fn(),
  removePaymentAccount: jest.fn(),
} as unknown as PaymentsService

const ctrl = new PaymentsController(mockService)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'staff@test.com',
  roles: ['staff'],
}

beforeEach(() => jest.clearAllMocks())

describe('PaymentsController', () => {
  describe('create', () => {
    it('delegates to createPayment and wraps success', async () => {
      const serviceResult = { data: { id: '30', amount: '500000' } }
      ;(mockService.createPayment as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { subscriptionId: 10, amount: 500000, method: 'cash' } as any
      const res = await ctrl.create(dto, user)
      expect(mockService.createPayment).toHaveBeenCalledWith(dto, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException when subscription not found', async () => {
      (mockService.createPayment as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.create({} as any, user)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('propagates BadRequestException for duplicate payment', async () => {
      const { BadRequestException } = await import('@nestjs/common')
      ;(mockService.createPayment as jest.Mock).mockRejectedValue(new BadRequestException())
      await expect(ctrl.create({} as any, user)).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('list', () => {
    it('delegates to listPayments and wraps success', async () => {
      const serviceResult = { data: [{ id: '30' }], meta: { total: 1 } }
      ;(mockService.listPayments as jest.Mock).mockResolvedValue(serviceResult)
      const query = { subscriptionId: '10' } as any
      const res = await ctrl.list(query, user)
      expect(mockService.listPayments).toHaveBeenCalledWith(query, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('returns empty list when no payments found', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockService.listPayments as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.list({} as any, user)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates exception', async () => {
      const { InternalServerErrorException } = await import('@nestjs/common')
      ;(mockService.listPayments as jest.Mock).mockRejectedValue(new InternalServerErrorException())
      await expect(ctrl.list({} as any, user)).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })
})

const paCtrl = new PaymentAccountsController(mockService)

const memberUser: AuthenticatedUser = {
  userId: BigInt(2),
  email: 'member@test.com',
  roles: ['member'],
  memberId: BigInt(5),
}

const staffUser: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'staff@test.com',
  roles: ['staff'],
  memberId: undefined,
}

const otherMember: AuthenticatedUser = {
  userId: BigInt(3),
  email: 'other@test.com',
  roles: ['member'],
  memberId: BigInt(99),
}

describe('PaymentAccountsController', () => {
  describe('list', () => {
    it('returns list for self (member)', async () => {
      const serviceResult = [{ id: 1, type: 'bank' }]
      ;(mockService.listPaymentAccounts as jest.Mock).mockResolvedValue(serviceResult)
      const res = await paCtrl.list(5, memberUser)
      expect(mockService.listPaymentAccounts).toHaveBeenCalledWith(BigInt(5))
      expect(res).toEqual(serviceResult)
    })

    it('allows staff to view any member accounts', async () => {
      const serviceResult = [{ id: 2, type: 'momo' }]
      ;(mockService.listPaymentAccounts as jest.Mock).mockResolvedValue(serviceResult)
      const res = await paCtrl.list(5, staffUser)
      expect(mockService.listPaymentAccounts).toHaveBeenCalledWith(BigInt(5))
      expect(res).toEqual(serviceResult)
    })

    it('throws NotFoundException when member accesses other member accounts', async () => {
      await expect(paCtrl.list(5, otherMember)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('create', () => {
    it('delegates to service.createPaymentAccount for self', async () => {
      const serviceResult = { id: 10, type: 'bank' }
      ;(mockService.createPaymentAccount as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { type: 'bank', accountNumber: '123' } as any
      const res = await paCtrl.create(5, dto, memberUser)
      expect(mockService.createPaymentAccount).toHaveBeenCalledWith(BigInt(5), dto)
      expect(res).toEqual(serviceResult)
    })
  })

  describe('setDefault', () => {
    it('delegates to service.setDefaultPaymentAccount', async () => {
      const serviceResult = { id: 10, isDefault: true }
      ;(mockService.setDefaultPaymentAccount as jest.Mock).mockResolvedValue(serviceResult)
      const res = await paCtrl.setDefault(5, 10, memberUser)
      expect(mockService.setDefaultPaymentAccount).toHaveBeenCalledWith(BigInt(5), 10)
      expect(res).toEqual(serviceResult)
    })
  })

  describe('remove', () => {
    it('delegates to service.removePaymentAccount', async () => {
      (mockService.removePaymentAccount as jest.Mock).mockResolvedValue(undefined)
      const res = await paCtrl.remove(5, 10, memberUser)
      expect(mockService.removePaymentAccount).toHaveBeenCalledWith(BigInt(5), 10)
      expect(res).toBeUndefined()
    })
  })
})
