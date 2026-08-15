import { NotFoundException } from '@nestjs/common'
import { FeedbackController } from './feedback.controller'
import { FeedbackService } from './feedback.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockFeedback = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  assign: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
} as unknown as FeedbackService

const ctrl = new FeedbackController(mockFeedback)

const user: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'staff@test.com',
  roles: ['staff'],
  staffId: BigInt(10),
  memberId: undefined,
}

const memberUser: AuthenticatedUser = {
  userId: BigInt(2),
  email: 'member@test.com',
  roles: ['member'],
  memberId: BigInt(5),
}

beforeEach(() => jest.clearAllMocks())

describe('FeedbackController', () => {
  describe('list', () => {
    it('delegates to feedback.list with caller context and wraps success', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockFeedback.list as jest.Mock).mockResolvedValue(serviceResult)
      const dto = {} as any
      const res = await ctrl.list(dto, user)
      expect(mockFeedback.list).toHaveBeenCalledWith(dto, {
        userId: user.userId,
        roles: user.roles,
        memberId: user.memberId,
        staffId: user.staffId,
      })
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('detail', () => {
    it('delegates to feedback.get with BigInt id and caller context', async () => {
      const serviceResult = { data: { id: '3', content: 'Great!' } }
      ;(mockFeedback.get as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(3, memberUser)
      expect(mockFeedback.get).toHaveBeenCalledWith(BigInt(3), {
        userId: memberUser.userId,
        roles: memberUser.roles,
        memberId: memberUser.memberId,
      })
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      ;(mockFeedback.get as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.detail(999, memberUser)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('create', () => {
    it('delegates to feedback.create and wraps success', async () => {
      const serviceResult = { data: { id: '20', content: 'Feedback' } }
      ;(mockFeedback.create as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { content: 'Feedback', rating: 5, type: 'general' } as any
      const res = await ctrl.create(dto, memberUser)
      expect(mockFeedback.create).toHaveBeenCalledWith(dto, {
        userId: memberUser.userId,
        roles: memberUser.roles,
        memberId: memberUser.memberId,
      })
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('assign', () => {
    it('delegates to feedback.assign and wraps success', async () => {
      const serviceResult = { data: { id: '3', handledByStaffId: '10' } }
      ;(mockFeedback.assign as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { staffId: 10 } as any
      const res = await ctrl.assign(3, dto, user)
      expect(mockFeedback.assign).toHaveBeenCalledWith(BigInt(3), dto, {
        userId: user.userId,
        roles: user.roles,
        staffId: user.staffId,
      })
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('updateStatus', () => {
    it('delegates to feedback.updateStatus and wraps success', async () => {
      const serviceResult = { data: { id: '3', status: 'resolved' } }
      ;(mockFeedback.updateStatus as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { status: 'resolved' } as any
      const res = await ctrl.updateStatus(3, dto, user)
      expect(mockFeedback.updateStatus).toHaveBeenCalledWith(BigInt(3), dto, {
        userId: user.userId,
        roles: user.roles,
        staffId: user.staffId,
      })
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('softDelete', () => {
    it('delegates to feedback.softDelete and returns success', async () => {
      ;(mockFeedback.softDelete as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.softDelete(3, memberUser)
      expect(mockFeedback.softDelete).toHaveBeenCalledWith(BigInt(3), {
        userId: memberUser.userId,
        roles: memberUser.roles,
        memberId: memberUser.memberId,
      })
      expect(res).toEqual({ success: true })
    })
  })
})
