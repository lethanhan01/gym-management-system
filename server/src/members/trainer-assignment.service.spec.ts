import { TrainerAssignmentService } from './trainer-assignment.service'

const mockPrisma = {
  member: { findFirst: jest.fn(), update: jest.fn() },
  staff: { findFirst: jest.fn(), findMany: jest.fn() },
}

const mockAudit = { log: jest.fn() }

function makeMember(overrides: object = {}) {
  return { memberId: 10n, userId: 1n, primaryTrainerId: null, deletedAt: null, subscriptions: [], ...overrides }
}

function makeTrainer(overrides: object = {}) {
  return {
    staffId: 5n,
    staffCode: 'PT-001',
    position: 'trainer',
    deletedAt: null,
    user: { fullName: 'Trainer A', ...{} },
    ...overrides,
  }
}

describe('TrainerAssignmentService', () => {
  let service: TrainerAssignmentService

  beforeEach(() => {
    service = new TrainerAssignmentService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
    mockAudit.log.mockReturnValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // assignTrainer
  // ---------------------------------------------------------------------------

  describe('assignTrainer', () => {
    it('throws NotFoundException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.assignTrainer(10n, 5, 1n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    })

    it('throws BadRequestException when trainerId provided but trainer not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.assignTrainer(10n, 5, 1n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })

    it('clears trainer when trainerId is null', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember({ primaryTrainerId: 5n }))
      mockPrisma.member.update.mockResolvedValue({ memberId: 10n, primaryTrainerId: null })

      const result = await service.assignTrainer(10n, null, 1n)

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { primaryTrainerId: null } })
      )
      expect(result.data.primaryTrainerId).toBeNull()
      expect(result.data.primaryTrainerName).toBeNull()
    })

    it('assigns trainer and returns updated data', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember())
      mockPrisma.staff.findFirst.mockResolvedValue(makeTrainer())
      mockPrisma.member.update.mockResolvedValue({ memberId: 10n, primaryTrainerId: 5n })

      const result = await service.assignTrainer(10n, 5, 1n)

      expect(result.data.primaryTrainerId).toBe('5')
      expect(result.data.primaryTrainerName).toBe('Trainer A')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'member.assign-trainer' })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getAvailableTrainers
  // ---------------------------------------------------------------------------

  describe('getAvailableTrainers', () => {
    it('returns list of trainer/pt staff', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        makeTrainer(),
        makeTrainer({ staffId: 6n, staffCode: 'PT-002', position: 'pt', user: { fullName: 'Trainer B' } }),
      ])

      const result = await service.getAvailableTrainers()

      expect(result.data).toHaveLength(2)
      expect(result.data[0].staffId).toBe('5')
      expect(result.data[1].staffId).toBe('6')
    })
  })

  // ---------------------------------------------------------------------------
  // selfAssignTrainer
  // ---------------------------------------------------------------------------

  describe('selfAssignTrainer', () => {
    it('throws NotFoundException when member not found by userId', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.selfAssignTrainer(1n, 5)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    })

    it('throws ForbiddenException when active subscription does not include PT', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(
        makeMember({ subscriptions: [{ package: { includesPt: false } }] })
      )

      await expect(service.selfAssignTrainer(1n, 5)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('throws ForbiddenException when no active subscription at all', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember({ subscriptions: [] }))

      await expect(service.selfAssignTrainer(1n, 5)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    })

    it('throws BadRequestException when trainer not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(
        makeMember({ subscriptions: [{ package: { includesPt: true } }] })
      )
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.selfAssignTrainer(1n, 5)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'FK_CONSTRAINT' }),
      })
    })

    it('assigns trainer when subscription includes PT', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(
        makeMember({ memberId: 10n, subscriptions: [{ package: { includesPt: true } }] })
      )
      mockPrisma.staff.findFirst.mockResolvedValue(makeTrainer())
      mockPrisma.member.update.mockResolvedValue({ memberId: 10n, primaryTrainerId: 5n })

      const result = await service.selfAssignTrainer(1n, 5)

      expect(result.data.primaryTrainerId).toBe('5')
      expect(result.data.trainerName).toBe('Trainer A')
    })

    it('clears trainer when trainerId is null', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(makeMember({ memberId: 10n }))
      mockPrisma.member.update.mockResolvedValue({ memberId: 10n, primaryTrainerId: null })

      const result = await service.selfAssignTrainer(1n, null)

      expect(result.data.primaryTrainerId).toBeNull()
    })
  })
})
