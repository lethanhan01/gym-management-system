import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Package, PackageStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AuditService } from '../../common/audit/audit.service'
import { type Role } from '../../auth/users.service'
import { CreatePackageDto } from './dto/create-package.dto'
import { UpdatePackageDto } from './dto/update-package.dto'
import { ListPackagesDto } from './dto/list-packages.dto'

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listPackages(dto: ListPackagesDto, callerRoles: Role[]) {
    const {
      page = 1,
      pageSize = 20,
      minDuration,
      maxDuration,
      minPrice,
      maxPrice,
      search,
      sort = 'created_at:desc',
    } = dto

    const hasManage = callerRoles.some((r) => r === 'owner' || r === 'staff')
    const isMember = callerRoles.includes('member')

    const where: Prisma.PackageWhereInput = {}

    // Members and non-manage roles only see active, non-deleted packages
    if (isMember || !hasManage) {
      where.status = PackageStatus.active
      where.deletedAt = null
    } else {
      // Support a special `status=deleted` query: treat it as requesting deleted items
      const requestedStatus = dto.status
      const includeDeleted =
        dto.includeDeleted === true ||
        String(dto.includeDeleted) === 'true' ||
        requestedStatus === 'deleted'
      if (requestedStatus === 'deleted') {
        where.deletedAt = { not: null }
      } else {
        if (requestedStatus) where.status = requestedStatus as PackageStatus
        if (!includeDeleted) where.deletedAt = null
      }
    }

    if (minDuration !== undefined || maxDuration !== undefined) {
      where.durationDays = {
        ...(minDuration !== undefined ? { gte: minDuration } : {}),
        ...(maxDuration !== undefined ? { lte: maxDuration } : {}),
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined ? { gte: new Prisma.Decimal(minPrice) } : {}),
        ...(maxPrice !== undefined ? { lte: new Prisma.Decimal(maxPrice) } : {}),
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { packageCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [sortField, sortDir] = sort.split(':')
    const toCamel = (s: string) =>
      s.replace(/_([a-z])/g, (_, c: string) => (c as string).toUpperCase())
    const orderBy = {
      [toCamel(sortField ?? 'createdAt')]: sortDir === 'asc' ? 'asc' : 'desc',
    } as Prisma.PackageOrderByWithRelationInput

    const [data, total] = await Promise.all([
      this.prisma.package.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy }),
      this.prisma.package.count({ where }),
    ])

    return { data: data.map(this.serializePackage), meta: { page, pageSize, total } }
  }

  async getPackage(id: bigint, hasManage: boolean) {
    const pkg = await this.prisma.package.findFirst({ where: { packageId: id, deletedAt: null } })
    if (!pkg)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Package không tồn tại',
      })

    let stats = null
    if (hasManage) {
      const [activeCount, pendingCount, totalCount] = await Promise.all([
        this.prisma.subscription.count({
          where: { packageId: id, status: 'active', deletedAt: null },
        }),
        this.prisma.subscription.count({
          where: { packageId: id, status: 'pending', deletedAt: null },
        }),
        this.prisma.subscription.count({ where: { packageId: id } }),
      ])
      stats = {
        activeSubscriptions: activeCount,
        pendingSubscriptions: pendingCount,
        totalSubscriptions: totalCount,
      }
    }

    return { data: { ...this.serializePackage(pkg), stats } }
  }

  async createPackage(dto: CreatePackageDto, actorUserId: bigint) {
    const packageCode = dto.packageCode ?? (await this.generatePackageCode())

    const pkg = await this.prisma.package.create({
      data: {
        packageCode,
        name: dto.name,
        durationDays: dto.durationDays,
        price: new Prisma.Decimal(dto.price),
        benefits: dto.benefits,
        status: dto.status ?? PackageStatus.active,
        includesPt: dto.includesPt ?? false,
      },
    })

    this.audit.log({
      actorUserId,
      action: 'package.create',
      resourceType: 'package',
      resourceId: pkg.packageId.toString(),
      afterData: this.serializePackage(pkg) as unknown as Record<string, unknown>,
    })

    return { data: this.serializePackage(pkg) }
  }

  async updatePackage(id: bigint, dto: UpdatePackageDto, actorUserId: bigint) {
    const existing = await this.prisma.package.findFirst({
      where: { packageId: id, deletedAt: null },
    })
    if (!existing)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Package không tồn tại',
      })

    if (dto.durationDays !== undefined || dto.price !== undefined) {
      const { activeCount, pendingCount } = await this.countActiveSubscriptions(id)
      if (activeCount + pendingCount > 0) {
        throw new ConflictException({
          success: false,
          code: 'PACKAGE_HAS_ACTIVE_SUBSCRIPTION',
          message: 'Không thể thay đổi durationDays hoặc price khi có subscription active/pending',
          details: { activeCount, pendingCount },
        })
      }
    }

    const updated = await this.prisma.package.update({
      where: { packageId: id },
      data: {
        ...(dto.packageCode !== undefined ? { packageCode: dto.packageCode } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.durationDays !== undefined ? { durationDays: dto.durationDays } : {}),
        ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
        ...(dto.includesPt !== undefined ? { includesPt: dto.includesPt } : {}),
      },
    })

    this.audit.log({
      actorUserId,
      action: 'package.update',
      resourceType: 'package',
      resourceId: id.toString(),
      beforeData: this.serializePackage(existing) as unknown as Record<string, unknown>,
      afterData: this.serializePackage(updated) as unknown as Record<string, unknown>,
    })

    return { data: this.serializePackage(updated) }
  }

  async updatePackageStatus(id: bigint, status: PackageStatus, actorUserId: bigint) {
    const existing = await this.prisma.package.findFirst({
      where: { packageId: id, deletedAt: null },
    })
    if (!existing)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Package không tồn tại',
      })

    const updated = await this.prisma.package.update({ where: { packageId: id }, data: { status } })

    this.audit.log({
      actorUserId,
      action: 'package.update',
      resourceType: 'package',
      resourceId: id.toString(),
      beforeData: { status: existing.status },
      afterData: { status: updated.status },
    })

    return { data: this.serializePackage(updated) }
  }

  async deletePackage(id: bigint, actorUserId: bigint) {
    const existing = await this.prisma.package.findFirst({
      where: { packageId: id, deletedAt: null },
    })
    if (!existing)
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Package không tồn tại',
      })

    const { activeCount, pendingCount } = await this.countActiveSubscriptions(id)
    if (activeCount + pendingCount > 0) {
      throw new ConflictException({
        success: false,
        code: 'PACKAGE_HAS_ACTIVE_SUBSCRIPTION',
        message: 'Không thể xóa package khi có subscription active/pending',
        details: { activeCount, pendingCount },
      })
    }

    await this.prisma.package.update({ where: { packageId: id }, data: { deletedAt: new Date() } })
    this.audit.log({
      actorUserId,
      action: 'package.delete',
      resourceType: 'package',
      resourceId: id.toString(),
      beforeData: { packageCode: existing.packageCode, name: existing.name },
    })
  }

  private async countActiveSubscriptions(packageId: bigint) {
    const [activeCount, pendingCount] = await Promise.all([
      this.prisma.subscription.count({ where: { packageId, status: 'active', deletedAt: null } }),
      this.prisma.subscription.count({ where: { packageId, status: 'pending', deletedAt: null } }),
    ])
    return { activeCount, pendingCount }
  }

  private async generatePackageCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = Array.from(
        { length: 4 },
        () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
      ).join('')
      const code = `PKG-${suffix}`
      const existing = await this.prisma.package.findFirst({
        where: { packageCode: code, deletedAt: null },
      })
      if (!existing) return code
    }
    throw new InternalServerErrorException({
      success: false,
      code: 'MEMBER_CODE_GENERATION_FAILED',
      message: 'Không thể tạo packageCode tự động sau 10 lần thử',
    })
  }

  private serializePackage(pkg: Package) {
    return {
      packageId: pkg.packageId.toString(),
      packageCode: pkg.packageCode,
      name: pkg.name,
      durationDays: pkg.durationDays,
      price: pkg.price.toFixed(2),
      benefits: pkg.benefits,
      includesPt: pkg.includesPt,
      status: pkg.status,
      createdAt: pkg.createdAt,
      deletedAt: pkg.deletedAt,
    }
  }
}
