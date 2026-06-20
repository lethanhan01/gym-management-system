import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { PackageStatus } from '@prisma/client'
import { PackagesService } from './packages.service'

function makePkg(overrides: object = {}) {
  return {
    packageId: 1n,
    packageCode: 'PKG-TEST',
    name: 'Basic Plan',
    durationDays: 30,
    price: { toFixed: (_n: number) => '500000.00' },
    benefits: 'Gym access',
    includesPt: false,
    status: PackageStatus.active,
    createdAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  }
}

const mockPrisma = {
  package: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    count: jest.fn(),
  },
}

const mockAudit = {
  log: jest.fn(),
}

describe('PackagesService', () => {
  let service: PackagesService

  beforeEach(() => {
    service = new PackagesService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // listPackages
  // ---------------------------------------------------------------------------

  describe('listPackages', () => {
    it('member role: only queries active non-deleted packages', async () => {
      mockPrisma.package.findMany.mockResolvedValue([])
      mockPrisma.package.count.mockResolvedValue(0)

      await service.listPackages({}, ['member'])

      const whereArg = mockPrisma.package.findMany.mock.calls[0][0].where
      expect(whereArg.status).toBe(PackageStatus.active)
      expect(whereArg.deletedAt).toBeNull()
    })

    it('owner role: does not force status=active filter', async () => {
      mockPrisma.package.findMany.mockResolvedValue([])
      mockPrisma.package.count.mockResolvedValue(0)

      await service.listPackages({}, ['owner'])

      const whereArg = mockPrisma.package.findMany.mock.calls[0][0].where
      expect(whereArg.status).toBeUndefined()
    })

    it('returns paginated data with meta', async () => {
      const pkgs = [makePkg(), makePkg({ packageId: 2n, packageCode: 'PKG-TWO' })]
      mockPrisma.package.findMany.mockResolvedValue(pkgs)
      mockPrisma.package.count.mockResolvedValue(2)

      const result = await service.listPackages({ page: 1, pageSize: 10 }, ['owner'])

      expect(result.data).toHaveLength(2)
      expect(result.meta).toEqual({ page: 1, pageSize: 10, total: 2 })
    })

    it('serializes packageId as string in response', async () => {
      mockPrisma.package.findMany.mockResolvedValue([makePkg()])
      mockPrisma.package.count.mockResolvedValue(1)

      const result = await service.listPackages({}, ['member'])

      expect(result.data[0].packageId).toBe('1')
      expect(typeof result.data[0].packageId).toBe('string')
    })

    it('staff with status=deleted queries deletedAt not null', async () => {
      mockPrisma.package.findMany.mockResolvedValue([])
      mockPrisma.package.count.mockResolvedValue(0)

      await service.listPackages({ status: 'deleted' }, ['staff'])

      const whereArg = mockPrisma.package.findMany.mock.calls[0][0].where
      expect(whereArg.deletedAt).toEqual({ not: null })
    })

    it('applies duration filter when minDuration and maxDuration provided', async () => {
      mockPrisma.package.findMany.mockResolvedValue([])
      mockPrisma.package.count.mockResolvedValue(0)

      await service.listPackages({ minDuration: 10, maxDuration: 60 }, ['owner'])

      const whereArg = mockPrisma.package.findMany.mock.calls[0][0].where
      expect(whereArg.durationDays).toEqual({ gte: 10, lte: 60 })
    })

    it('applies search with OR across name and packageCode', async () => {
      mockPrisma.package.findMany.mockResolvedValue([])
      mockPrisma.package.count.mockResolvedValue(0)

      await service.listPackages({ search: 'basic' }, ['member'])

      const whereArg = mockPrisma.package.findMany.mock.calls[0][0].where
      expect(whereArg.OR).toBeDefined()
      expect(whereArg.OR).toHaveLength(2)
    })
  })

  // ---------------------------------------------------------------------------
  // getPackage
  // ---------------------------------------------------------------------------

  describe('getPackage', () => {
    it('throws NotFoundException when package does not exist', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(null)

      await expect(service.getPackage(99n, false)).rejects.toThrow(NotFoundException)
    })

    it('returns package without stats when hasManage is false', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())

      const result = await service.getPackage(1n, false)

      expect(result.data.stats).toBeNull()
      expect(mockPrisma.subscription.count).not.toHaveBeenCalled()
    })

    it('returns package with subscription stats when hasManage is true', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.subscription.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(10)

      const result = await service.getPackage(1n, true)

      expect(result.data.stats).toEqual({
        activeSubscriptions: 5,
        pendingSubscriptions: 2,
        totalSubscriptions: 10,
      })
      expect(mockPrisma.subscription.count).toHaveBeenCalledTimes(3)
    })

    it('serializes packageId as string', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())

      const result = await service.getPackage(1n, false)

      expect(result.data.packageId).toBe('1')
    })
  })

  // ---------------------------------------------------------------------------
  // createPackage
  // ---------------------------------------------------------------------------

  describe('createPackage', () => {
    it('creates package with provided packageCode', async () => {
      const created = makePkg()
      mockPrisma.package.create.mockResolvedValue(created)

      const result = await service.createPackage(
        { packageCode: 'PKG-TEST', name: 'Basic', durationDays: 30, price: 500000, benefits: '' },
        1n
      )

      expect(result.data.packageCode).toBe('PKG-TEST')
      expect(mockPrisma.package.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ packageCode: 'PKG-TEST' }),
        })
      )
    })

    it('auto-generates packageCode when not provided', async () => {
      const created = makePkg({ packageCode: 'PKG-ABCD' })
      mockPrisma.package.findFirst.mockResolvedValue(null)
      mockPrisma.package.create.mockResolvedValue(created)

      await service.createPackage(
        { name: 'Auto', durationDays: 30, price: 500000, benefits: '' },
        1n
      )

      const codeUsed = mockPrisma.package.create.mock.calls[0][0].data.packageCode
      expect(codeUsed).toMatch(/^PKG-[A-Z0-9]{4}$/)
    })

    it('propagates P2002 error from prisma on duplicate packageCode', async () => {
      mockPrisma.package.create.mockRejectedValue({ code: 'P2002' })

      await expect(
        service.createPackage(
          { packageCode: 'PKG-DUP', name: 'Dup', durationDays: 30, price: 500000, benefits: '' },
          1n
        )
      ).rejects.toMatchObject({ code: 'P2002' })
    })

    it('throws InternalServerErrorException when code generation fails after 10 attempts', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())

      await expect(
        service.createPackage({ name: 'Test', durationDays: 30, price: 500000, benefits: '' }, 1n)
      ).rejects.toThrow(InternalServerErrorException)
    })

    it('calls audit.log after successful creation', async () => {
      mockPrisma.package.create.mockResolvedValue(makePkg())

      await service.createPackage(
        { packageCode: 'PKG-AUDIT', name: 'Audit', durationDays: 30, price: 500000, benefits: '' },
        99n
      )

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: 99n, action: 'package.create' })
      )
    })

    it('rethrows non-P2002 error from prisma.package.create (e.g. network failure)', async () => {
      const networkError = new Error('Network error')
      mockPrisma.package.create.mockRejectedValue(networkError)

      await expect(
        service.createPackage(
          { packageCode: 'PKG-NET', name: 'Net', durationDays: 30, price: 500000, benefits: '' },
          1n
        )
      ).rejects.toThrow('Network error')
    })
  })

  // ---------------------------------------------------------------------------
  // updatePackage
  // ---------------------------------------------------------------------------

  describe('updatePackage', () => {
    it('throws NotFoundException when package does not exist', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(null)

      await expect(service.updatePackage(99n, { name: 'New' }, 1n)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when changing durationDays with active subscriptions', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.subscription.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0)

      await expect(service.updatePackage(1n, { durationDays: 60 }, 1n)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when changing price with pending subscriptions', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.subscription.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2)

      await expect(service.updatePackage(1n, { price: 999 }, 1n)).rejects.toThrow(ConflictException)
    })

    it('updates name without checking subscriptions', async () => {
      const existing = makePkg()
      const updated = makePkg({ name: 'Updated Name' })
      mockPrisma.package.findFirst.mockResolvedValue(existing)
      mockPrisma.package.update.mockResolvedValue(updated)

      const result = await service.updatePackage(1n, { name: 'Updated Name' }, 1n)

      expect(result.data.name).toBe('Updated Name')
      expect(mockPrisma.subscription.count).not.toHaveBeenCalled()
    })

    it('propagates P2002 error from prisma on duplicate packageCode', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.package.update.mockRejectedValue({ code: 'P2002' })

      await expect(service.updatePackage(1n, { packageCode: 'PKG-DUP' }, 1n)).rejects.toMatchObject(
        { code: 'P2002' }
      )
    })
  })

  // ---------------------------------------------------------------------------
  // updatePackageStatus
  // ---------------------------------------------------------------------------

  describe('updatePackageStatus', () => {
    it('throws NotFoundException when package does not exist', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(null)

      await expect(service.updatePackageStatus(99n, PackageStatus.inactive, 1n)).rejects.toThrow(
        NotFoundException
      )
    })

    it('updates status and returns serialized package', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.package.update.mockResolvedValue(makePkg({ status: PackageStatus.inactive }))

      const result = await service.updatePackageStatus(1n, PackageStatus.inactive, 1n)

      expect(mockPrisma.package.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { packageId: 1n },
          data: { status: PackageStatus.inactive },
        })
      )
      expect(result.data.status).toBe(PackageStatus.inactive)
    })
  })

  // ---------------------------------------------------------------------------
  // deletePackage
  // ---------------------------------------------------------------------------

  describe('deletePackage', () => {
    it('throws ConflictException when active subscriptions exist', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.subscription.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0)

      await expect(service.deletePackage(1n, 1n)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when pending subscriptions exist', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.subscription.count.mockResolvedValueOnce(0).mockResolvedValueOnce(3)

      await expect(service.deletePackage(1n, 1n)).rejects.toThrow(ConflictException)
    })

    it('soft deletes package (sets deletedAt) when no active subscriptions', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.subscription.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
      mockPrisma.package.update.mockResolvedValue({})

      await service.deletePackage(1n, 1n)

      expect(mockPrisma.package.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { packageId: 1n },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('calls audit.log with package.delete action after soft delete', async () => {
      mockPrisma.package.findFirst.mockResolvedValue(makePkg())
      mockPrisma.subscription.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
      mockPrisma.package.update.mockResolvedValue({})

      await service.deletePackage(1n, 42n)

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: 42n, action: 'package.delete' })
      )
    })
  })
})
