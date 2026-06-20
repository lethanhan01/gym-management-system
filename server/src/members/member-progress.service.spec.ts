import { Prisma } from '@prisma/client'
import { MemberProgressService } from './member-progress.service'

const mockPrisma = {
  member: { findFirst: jest.fn() },
  memberProgress: { create: jest.fn() },
}

function makeProgressRow(overrides: object = {}) {
  return {
    progressId: 1n,
    memberId: 10n,
    staffId: null,
    weight: new Prisma.Decimal(70),
    height: null,
    bmi: null,
    recordedAt: new Date(),
    ...overrides,
  }
}

describe('MemberProgressService', () => {
  let service: MemberProgressService

  beforeEach(() => {
    service = new MemberProgressService(mockPrisma as any)
    jest.clearAllMocks()
  })

  describe('recordSelfProgress', () => {
    it('throws NotFoundException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.recordSelfProgress(10n, { weight: 70 })).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      })
    })

    it('creates progress with bmi=null when height is not provided', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
      mockPrisma.memberProgress.create.mockResolvedValue(makeProgressRow())

      const result = await service.recordSelfProgress(10n, { weight: 70 })

      expect(mockPrisma.memberProgress.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ bmi: null }) })
      )
      expect(result.data.bmi).toBeNull()
      expect(result.data.progressId).toBe('1')
    })

    it('computes bmi when height is provided', async () => {
      const heightCm = 170
      const weight = 70
      const expectedBmi = Math.round((weight / (heightCm / 100) ** 2) * 10) / 10
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
      mockPrisma.memberProgress.create.mockResolvedValue(
        makeProgressRow({
          height: new Prisma.Decimal(heightCm),
          bmi: new Prisma.Decimal(expectedBmi),
        })
      )

      const result = await service.recordSelfProgress(10n, { weight, height: heightCm })

      const createCall = (mockPrisma.memberProgress.create as jest.Mock).mock.calls[0][0]
      expect(Number(createCall.data.bmi)).toBe(expectedBmi)
      expect(result.data.bmi).toBe(expectedBmi)
    })

    it('returns serialized progress data', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })
      mockPrisma.memberProgress.create.mockResolvedValue(makeProgressRow())

      const result = await service.recordSelfProgress(10n, { weight: 70 })

      expect(result.data).toMatchObject({
        progressId: '1',
        memberId: '10',
        staffId: null,
        staffName: null,
        weight: 70,
        height: null,
        bmi: null,
        goal: null,
        notes: null,
      })
      expect(result.data.recordedAt).toBeInstanceOf(Date)
    })
  })
})
