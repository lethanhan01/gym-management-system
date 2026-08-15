import { NotFoundException } from '@nestjs/common'
import { MembersController } from './members.controller'
import { MembersService } from './members.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'

const mockService = {
  getMember: jest.fn(),
  updateMember: jest.fn(),
  getAvailableTrainers: jest.fn(),
  selfAssignTrainer: jest.fn(),
  recordSelfProgress: jest.fn(),
  createMember: jest.fn(),
  selfRegister: jest.fn(),
  listMembers: jest.fn(),
  getMemberForCaller: jest.fn(),
  updateMemberForCaller: jest.fn(),
  deleteMember: jest.fn(),
  assignTrainer: jest.fn(),
} as unknown as MembersService

const ctrl = new MembersController(mockService)

const memberUser: AuthenticatedUser = {
  userId: BigInt(1),
  email: 'member@test.com',
  roles: ['member'],
  memberId: BigInt(2),
}

const ownerUser: AuthenticatedUser = {
  userId: BigInt(10),
  email: 'owner@test.com',
  roles: ['owner'],
}

beforeEach(() => jest.clearAllMocks())

describe('MembersController', () => {
  describe('getMe', () => {
    it('delegates to getMember with user.memberId', async () => {
      const serviceResult = { data: { id: '2', name: 'Test' } }
      ;(mockService.getMember as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.getMe(memberUser)
      expect(mockService.getMember).toHaveBeenCalledWith(memberUser.memberId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('throws NotFoundException when user has no memberId', async () => {
      await expect(ctrl.getMe(ownerUser)).rejects.toBeInstanceOf(NotFoundException)
      expect(mockService.getMember).not.toHaveBeenCalled()
    })
  })

  describe('updateMe', () => {
    it('delegates to updateMember with user.memberId', async () => {
      const serviceResult = { data: { id: '2' } }
      ;(mockService.updateMember as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { phone: '0912345678' } as any
      const res = await ctrl.updateMe(dto, memberUser)
      expect(mockService.updateMember).toHaveBeenCalledWith(
        memberUser.memberId,
        dto,
        memberUser.userId
      )
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('throws NotFoundException when user has no memberId', async () => {
      await expect(ctrl.updateMe({} as any, ownerUser)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('getAvailableTrainers', () => {
    it('delegates to getAvailableTrainers and wraps success', async () => {
      const serviceResult = { data: [{ id: '3', name: 'PT1' }] }
      ;(mockService.getAvailableTrainers as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.getAvailableTrainers()
      expect(mockService.getAvailableTrainers).toHaveBeenCalled()
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('selfAssignTrainer', () => {
    it('delegates with trainerId from body', async () => {
      const serviceResult = { data: { trainerId: '5' } }
      ;(mockService.selfAssignTrainer as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.selfAssignTrainer({ trainerId: 5 }, memberUser)
      expect(mockService.selfAssignTrainer).toHaveBeenCalledWith(memberUser.userId, 5)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('passes null when trainerId is not in body', async () => {
      ;(mockService.selfAssignTrainer as jest.Mock).mockResolvedValue({ data: {} })
      await ctrl.selfAssignTrainer({}, memberUser)
      expect(mockService.selfAssignTrainer).toHaveBeenCalledWith(memberUser.userId, null)
    })
  })

  describe('recordSelfProgress', () => {
    it('delegates to recordSelfProgress with user.memberId', async () => {
      const serviceResult = { data: { id: '50' } }
      ;(mockService.recordSelfProgress as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { weight: 70, height: 175 } as any
      const res = await ctrl.recordSelfProgress(dto, memberUser)
      expect(mockService.recordSelfProgress).toHaveBeenCalledWith(memberUser.memberId, dto)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('throws NotFoundException when user has no memberId', async () => {
      await expect(ctrl.recordSelfProgress({} as any, ownerUser)).rejects.toBeInstanceOf(
        NotFoundException
      )
    })
  })

  describe('create', () => {
    it('delegates to createMember and wraps success', async () => {
      const serviceResult = { data: { id: '100' } }
      ;(mockService.createMember as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { fullName: 'New Member', email: 'new@test.com' } as any
      const res = await ctrl.create(dto, ownerUser)
      expect(mockService.createMember).toHaveBeenCalledWith(dto, ownerUser.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('selfRegister', () => {
    it('delegates to selfRegister (no user) and wraps success', async () => {
      const serviceResult = { data: { id: '101' } }
      ;(mockService.selfRegister as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { email: 'self@test.com', password: 'Pass123!' } as any
      const res = await ctrl.selfRegister(dto)
      expect(mockService.selfRegister).toHaveBeenCalledWith(dto)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('list', () => {
    it('delegates to listMembers with query and user', async () => {
      const serviceResult = { data: [], meta: { total: 0 } }
      ;(mockService.listMembers as jest.Mock).mockResolvedValue(serviceResult)
      const query = { page: 1 } as any
      const res = await ctrl.list(query, ownerUser)
      expect(mockService.listMembers).toHaveBeenCalledWith(query, ownerUser)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('detail', () => {
    it('delegates to getMemberForCaller with BigInt id', async () => {
      const serviceResult = { data: { id: '30' } }
      ;(mockService.getMemberForCaller as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.detail(30, ownerUser)
      expect(mockService.getMemberForCaller).toHaveBeenCalledWith(BigInt(30), ownerUser)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException', async () => {
      ;(mockService.getMemberForCaller as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.detail(999, ownerUser)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('update', () => {
    it('delegates to updateMemberForCaller and wraps success', async () => {
      const serviceResult = { data: { id: '30' } }
      ;(mockService.updateMemberForCaller as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { phone: '0900000000' } as any
      const res = await ctrl.update(30, dto, ownerUser)
      expect(mockService.updateMemberForCaller).toHaveBeenCalledWith(BigInt(30), dto, ownerUser)
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('delete', () => {
    it('delegates to deleteMember and returns void', async () => {
      ;(mockService.deleteMember as jest.Mock).mockResolvedValue(undefined)
      const res = await ctrl.delete(30, ownerUser)
      expect(mockService.deleteMember).toHaveBeenCalledWith(BigInt(30), ownerUser.userId)
      expect(res).toBeUndefined()
    })

    it('propagates NotFoundException', async () => {
      ;(mockService.deleteMember as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(ctrl.delete(999, ownerUser)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('assignTrainer', () => {
    it('delegates to assignTrainer and wraps success', async () => {
      const serviceResult = { data: { trainerId: '5' } }
      ;(mockService.assignTrainer as jest.Mock).mockResolvedValue(serviceResult)
      const dto = { trainerId: 5 } as any
      const res = await ctrl.assignTrainer(30, dto, ownerUser)
      expect(mockService.assignTrainer).toHaveBeenCalledWith(BigInt(30), 5, ownerUser.userId)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates NotFoundException for missing trainer', async () => {
      ;(mockService.assignTrainer as jest.Mock).mockRejectedValue(new NotFoundException())
      await expect(
        ctrl.assignTrainer(30, { trainerId: 999 } as any, ownerUser)
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
