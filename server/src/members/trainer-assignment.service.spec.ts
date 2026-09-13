import { TrainerAssignmentService } from './trainer-assignment.service'

const mockPrisma = {
  member: { findFirst: jest.fn(), update: jest.fn() },
  staff: { findFirst: jest.fn(), findMany: jest.fn() },
  feedback: { findMany: jest.fn(), count: jest.fn() },
}

const mockAudit = { log: jest.fn() }

function makeMember(overrides: object = {}) {
  return {
    memberId: 10n,
    userId: 1n,
    primaryTrainerId: null,
    deletedAt: null,
    subscriptions: [],
    ...overrides,
  }
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
    it('returns list of trainer/pt staff with ratings and profile details', async () => {
      mockPrisma.staff.findMany.mockResolvedValue([
        makeTrainer({
          specialty: 'Fat Loss',
          experienceYears: 5,
          bio: 'Great coach',
        }),
        makeTrainer({
          staffId: 6n,
          staffCode: 'PT-002',
          position: 'pt',
          user: { fullName: 'Trainer B', avatarFileId: null },
        }),
      ])
      mockPrisma.feedback.findMany.mockResolvedValue([
        { subjectStaffId: 5n, rating: 5, tags: ['Nhiệt tình', 'Kỹ thuật tốt'] },
        { subjectStaffId: 5n, rating: 4, tags: ['Nhiệt tình'] },
      ])

      const result = await service.getAvailableTrainers()

      expect(result.data).toHaveLength(2)
      expect(result.data[0].staffId).toBe('5')
      expect(result.data[0].ratingAverage).toBe(4.5)
      expect(result.data[0].totalReviews).toBe(2)
      expect(result.data[0].topTags).toEqual(['Nhiệt tình', 'Kỹ thuật tốt'])
      expect(result.data[0].specialty).toBe('Fat Loss')
      expect(result.data[0].experienceYears).toBe(5)
      expect(result.data[1].staffId).toBe('6')
      expect(result.data[1].ratingAverage).toBeNull()
      expect(result.data[1].totalReviews).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // getTrainerReviews
  // ---------------------------------------------------------------------------

  describe('getTrainerReviews', () => {
    it('throws NotFoundException when trainer does not exist', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      await expect(service.getTrainerReviews(99n)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    })

    it('returns stats and paginated reviews with anonymity masking', async () => {
      mockPrisma.staff.findFirst.mockResolvedValue(
        makeTrainer({
          specialty: 'Bodybuilding',
          experienceYears: 7,
          bio: 'Expert coach',
        })
      )
      mockPrisma.feedback.findMany
        .mockResolvedValueOnce([
          { rating: 5, tags: ['Tận tâm'] },
          { rating: 4, tags: ['Tận tâm', 'Đúng giờ'] },
        ])
        .mockResolvedValueOnce([
          {
            feedbackId: 101n,
            rating: 5,
            content: 'Tuyệt vời',
            tags: ['Tận tâm'],
            isAnonymous: true,
            createdAt: new Date('2026-08-01T10:00:00Z'),
            member: { user: { fullName: 'Secret Member', avatarFileId: 99n } },
          },
          {
            feedbackId: 102n,
            rating: 4,
            content: 'Rất tốt',
            tags: ['Đúng giờ'],
            isAnonymous: false,
            createdAt: new Date('2026-08-02T10:00:00Z'),
            member: { user: { fullName: 'Public Member', avatarFileId: null } },
          },
        ])
      mockPrisma.feedback.count.mockResolvedValue(2)

      const result = await service.getTrainerReviews(5n, { page: 1, pageSize: 5 })

      expect(result.data.trainer.staffId).toBe('5')
      expect(result.data.trainer.specialty).toBe('Bodybuilding')
      expect(result.data.stats.ratingAverage).toBe(4.5)
      expect(result.data.stats.totalReviews).toBe(2)
      expect(result.data.stats.ratingCounts['5']).toBe(1)
      expect(result.data.stats.ratingCounts['4']).toBe(1)
      expect(result.data.pagination.totalReviews).toBe(2)

      // Anonymity verification:
      expect(result.data.reviews[0].reviewerName).toBeNull()
      expect(result.data.reviews[0].reviewerAvatarFileId).toBeNull()
      expect(result.data.reviews[1].reviewerName).toBe('Public Member')
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
