import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { FeedbackService } from './feedback.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMember(overrides: object = {}) {
  return {
    memberId: 1n,
    userId: 100n,
    memberCode: 'MEM-001',
    deletedAt: null,
    user: { fullName: 'Test Member' },
    ...overrides,
  }
}

function makeFeedback(overrides: object = {}) {
  return {
    feedbackId: 10n,
    memberId: 1n,
    feedbackType: 'service',
    content: 'Great service',
    severity: 'low',
    status: 'open',
    handledByStaffId: null,
    handledAt: null,
    subjectStaffId: null,
    subjectEquipmentId: null,
    resolutionNote: null,
    createdAt: new Date('2024-01-01'),
    deletedAt: null,
    member: {
      memberId: 1n,
      memberCode: 'MEM-001',
      userId: 100n,
      user: { fullName: 'Test Member' },
    },
    handledByStaff: null,
    subjectStaff: null,
    subjectEquipment: null,
    ...overrides,
  }
}

function makeCaller(overrides: object = {}) {
  return {
    userId: 200n,
    roles: ['owner'] as any[],
    memberId: undefined as bigint | undefined,
    staffId: undefined as bigint | undefined,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  feedback: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  member: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  staff: {
    findMany: jest.fn(),
  },
  gymRoom: {
    findMany: jest.fn(),
  },
  equipment: {
    findMany: jest.fn(),
  },
  trainingSession: {
    findMany: jest.fn(),
  },
}

const mockAudit = { log: jest.fn() }
const mockNotifications = {
  safeNotifyUser: jest.fn(),
  safeNotifyManyUsers: jest.fn(),
  safeNotifyGroups: jest.fn(),
}
const mockLineMessaging = {
  safePushFeedbackResponded: jest.fn().mockResolvedValue(true),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FeedbackService', () => {
  let service: FeedbackService

  beforeEach(() => {
    service = new FeedbackService(
      mockPrisma as any,
      mockAudit as any,
      mockNotifications as any,
      mockLineMessaging as any
    )
    jest.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe('list', () => {
    beforeEach(() => {
      mockPrisma.feedback.findMany.mockResolvedValue([makeFeedback()])
      mockPrisma.feedback.count.mockResolvedValue(1)
    })

    it('owner lists all feedback without memberId restriction', async () => {
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.list({} as any, caller)

      expect(result.data).toHaveLength(1)
      const whereArg = mockPrisma.feedback.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBeUndefined()
    })

    it('member restricts list to own memberId', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await service.list({} as any, caller)

      const whereArg = mockPrisma.feedback.findMany.mock.calls[0][0].where
      expect(whereArg.memberId).toBe(1n)
    })

    it('member without memberId in profile throws ForbiddenException', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: undefined })

      await expect(service.list({} as any, caller)).rejects.toThrow(ForbiddenException)
    })

    it('returns correct pagination meta', async () => {
      mockPrisma.feedback.count.mockResolvedValue(30)
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.list({ page: 2, pageSize: 10 } as any, caller)

      expect(result.meta).toEqual(
        expect.objectContaining({ page: 2, pageSize: 10, totalItems: 30 })
      )
    })
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  describe('get', () => {
    it('throws NotFoundException when feedback does not exist', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.get(999n, caller)).rejects.toThrow(NotFoundException)
    })

    it('owner can view any feedback', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback())
      const caller = makeCaller({ roles: ['owner'] })

      const result = await service.get(10n, caller)

      expect((result.data as any).feedbackId).toBe('10')
    })

    it('member can view own feedback', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ memberId: 1n }))
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      const result = await service.get(10n, caller)

      expect((result.data as any).feedbackId).toBe('10')
    })

    it('member cannot view another member feedback', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ memberId: 99n }))
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await expect(service.get(10n, caller)).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('member cannot create feedback for another member', async () => {
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await expect(
        service.create({ memberId: '99', feedbackType: 'service', content: 'X' } as any, caller)
      ).rejects.toThrow(ForbiddenException)
    })

    it('staff must provide memberId', async () => {
      const caller = makeCaller({ roles: ['staff'] })

      await expect(
        service.create({ feedbackType: 'service', content: 'X' } as any, caller)
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await expect(
        service.create({ feedbackType: 'service', content: 'X' } as any, caller)
      ).rejects.toThrow(BadRequestException)
    })

    it('feedbackType=staff with subjectEquipmentId throws BadRequestException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await expect(
        service.create(
          { feedbackType: 'staff', content: 'X', subjectEquipmentId: '5' } as any,
          caller
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('feedbackType=equipment with subjectStaffId throws BadRequestException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await expect(
        service.create(
          { feedbackType: 'equipment', content: 'X', subjectStaffId: '5' } as any,
          caller
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('feedbackType=service with subjectStaffId throws BadRequestException', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await expect(
        service.create(
          { feedbackType: 'service', content: 'X', subjectStaffId: '5' } as any,
          caller
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('happy path: creates feedback and calls audit.log', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.feedback.create.mockResolvedValue(makeFeedback())
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      const result = await service.create(
        { feedbackType: 'service', content: 'Great service' } as any,
        caller
      )

      expect(mockPrisma.feedback.create).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback.create' })
      )
      expect(mockNotifications.safeNotifyGroups).toHaveBeenCalledWith(
        ['owner', 'staff'],
        expect.objectContaining({
          type: 'feedback.created',
          resourceType: 'feedback',
          resourceId: '10',
          dedupeKey: 'feedback:10:created',
        }),
        { excludeActorUserId: caller.userId }
      )
      expect((result.data as any).feedbackId).toBe('10')
    })

    it('auto-routes rating 5 to status resolved and severity low', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.feedback.create.mockImplementation((args) =>
        Promise.resolve(makeFeedback({ ...args.data, feedbackId: 55n }))
      )
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await service.create(
        { feedbackType: 'staff', content: 'Great trainer!', rating: 5, subjectStaffId: '2' } as any,
        caller
      )

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rating: 5,
            status: 'resolved',
            severity: 'low',
          }),
        })
      )
    })

    it('auto-routes rating 2 to status open and severity high', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.feedback.create.mockImplementation((args) =>
        Promise.resolve(makeFeedback({ ...args.data, feedbackId: 56n }))
      )
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await service.create(
        { feedbackType: 'facility', content: 'Broken treadmill', rating: 2, subjectRoomId: '3' } as any,
        caller
      )

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rating: 2,
            status: 'open',
            severity: 'high',
          }),
        })
      )
    })
  })

  describe('anonymity masking', () => {
    it('masks member information when feedback is anonymous and caller is the target trainer', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(
        makeFeedback({
          isAnonymous: true,
          subjectStaffId: 5n,
          member: { memberId: 1n, memberCode: 'MEM-001', user: { fullName: 'Secret Member' } },
        })
      )
      const trainerCaller = makeCaller({ roles: ['trainer'], staffId: 5n })
      const result = await service.get(10n, trainerCaller)

      expect(result.data.member.fullName).toBe('Hội viên ẩn danh')
      expect(result.data.member.memberCode).toBe('ANONYMOUS')
    })

    it('does not mask member information for owner or author', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(
        makeFeedback({
          isAnonymous: true,
          subjectStaffId: 5n,
          memberId: 1n,
          member: { memberId: 1n, memberCode: 'MEM-001', user: { fullName: 'Secret Member' } },
        })
      )
      const ownerCaller = makeCaller({ roles: ['owner'] })
      const result = await service.get(10n, ownerCaller)

      expect(result.data.member.fullName).toBe('Secret Member')
      expect(result.data.member.memberCode).toBe('MEM-001')
    })
  })

  describe('getFeedbackOptions', () => {
    it('returns trainers, rooms, equipment and quick tags', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        { staffId: 2n, staffCode: 'STF-002', user: { fullName: 'Trainer John', email: 'j@test.com', phone: '0123' } },
      ])
      mockPrisma.member.findUnique.mockResolvedValue({ primaryTrainerId: 2n })
      mockPrisma.trainingSession.findMany.mockResolvedValue([])
      mockPrisma.gymRoom.findMany.mockResolvedValue([
        { roomId: 1n, roomCode: 'ROOM-1', name: 'Main Gym', roomType: 'Gym' },
      ])
      mockPrisma.equipment.findMany.mockResolvedValue([
        { equipmentId: 10n, equipmentCode: 'EQ-01', name: 'Treadmill', roomId: 1n },
      ])

      const res = await service.getFeedbackOptions(1n)
      expect(res.trainers.assigned.length).toBe(1)
      expect(res.rooms.length).toBe(1)
      expect(res.equipment.length).toBe(1)
      expect(res.quickTags.staff.positive.length).toBeGreaterThan(0)
    })
  })

  // -------------------------------------------------------------------------
  // softDelete
  // -------------------------------------------------------------------------

  describe('softDelete', () => {
    it('throws NotFoundException when feedback does not exist', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['owner'] })

      await expect(service.softDelete(999n, caller)).rejects.toThrow(NotFoundException)
    })

    it('member cannot delete another member feedback', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ memberId: 99n }))
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await expect(service.softDelete(10n, caller)).rejects.toThrow(ForbiddenException)
    })

    it('happy path: sets deletedAt and calls audit.log', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ memberId: 1n }))
      mockPrisma.feedback.update.mockResolvedValue(undefined)
      const caller = makeCaller({ roles: ['member'], memberId: 1n })

      await service.softDelete(10n, caller)

      expect(mockPrisma.feedback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { feedbackId: 10n },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback.delete' })
      )
    })
  })

  // -------------------------------------------------------------------------
  // assign
  // -------------------------------------------------------------------------

  describe('assign', () => {
    it('throws NotFoundException when feedback does not exist', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await expect(service.assign(999n, {} as any, caller)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when feedback is already resolved', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ status: 'resolved' }))
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await expect(service.assign(10n, {} as any, caller)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when in_progress and assigning to different staff', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(
        makeFeedback({ status: 'in_progress', handledByStaffId: 3n })
      )
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await expect(service.assign(10n, { handledByStaffId: '7' } as any, caller)).rejects.toThrow(
        ConflictException
      )
    })

    it('happy path: assigns to caller staffId and returns in_progress feedback', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ status: 'open' }))
      const updated = makeFeedback({
        status: 'in_progress',
        handledByStaffId: 5n,
        handledByStaff: { staffId: 5n, user: { fullName: 'Staff One' } },
      })
      mockPrisma.feedback.update.mockResolvedValue(updated)
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      const result = await service.assign(10n, {} as any, caller)

      expect(mockPrisma.feedback.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback.assign' })
      )
      expect((result.data as any).status).toBe('in_progress')
    })
  })

  // -------------------------------------------------------------------------
  // updateStatus
  // -------------------------------------------------------------------------

  describe('updateStatus', () => {
    it('throws NotFoundException when feedback does not exist', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(null)
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await expect(
        service.updateStatus(999n, { status: 'resolved' } as any, caller)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when feedback is already closed', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ status: 'rejected' }))
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await expect(
        service.updateStatus(10n, { status: 'resolved' } as any, caller)
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException on open→resolved (must pass through in_progress)', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ status: 'open' }))
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await expect(
        service.updateStatus(10n, { status: 'resolved', resolutionNote: 'Fixed' } as any, caller)
      ).rejects.toThrow(ConflictException)
    })

    it('throws BadRequestException when resolving without resolutionNote', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ status: 'in_progress' }))
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await expect(
        service.updateStatus(10n, { status: 'resolved' } as any, caller)
      ).rejects.toThrow(BadRequestException)
    })

    it('happy path in_progress→resolved: calls audit.log feedback.resolve', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ status: 'in_progress' }))
      const updated = makeFeedback({
        status: 'resolved',
        handledAt: new Date('2024-01-10'),
        handledByStaff: { staffId: 5n, user: { fullName: 'Staff One' } },
      })
      mockPrisma.feedback.update.mockResolvedValue(updated)
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      const result = await service.updateStatus(
        10n,
        { status: 'resolved', resolutionNote: 'Issue fixed' } as any,
        caller
      )

      expect(mockPrisma.feedback.update).toHaveBeenCalled()
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback.resolve' })
      )
      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        100n,
        expect.objectContaining({ type: 'feedback.resolved' })
      )
      expect(mockLineMessaging.safePushFeedbackResponded).toHaveBeenCalledWith(10n)
      expect((result.data as any).status).toBe('resolved')
    })

    it('in_progress→rejected: calls audit.log feedback.reject and triggers safePushFeedbackResponded', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(makeFeedback({ status: 'in_progress' }))
      const updated = makeFeedback({ status: 'rejected', handledAt: new Date('2024-01-10') })
      mockPrisma.feedback.update.mockResolvedValue(updated)
      const caller = makeCaller({ roles: ['staff'], staffId: 5n })

      await service.updateStatus(
        10n,
        { status: 'rejected', resolutionNote: 'Not valid' } as any,
        caller
      )

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback.reject' })
      )
      expect(mockNotifications.safeNotifyUser).toHaveBeenCalledWith(
        100n,
        expect.objectContaining({ type: 'feedback.rejected' })
      )
      expect(mockLineMessaging.safePushFeedbackResponded).toHaveBeenCalledWith(10n)
    })
  })
})
