import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

export interface AuditParams {
  actorUserId?: bigint | null
  action: string
  resourceType: string
  resourceId?: string | null
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Ghi audit log vao bang audit_logs.
 * Fire-and-forget: loi ghi log khong nen anh huong luong chinh.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId ?? null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId ?? null,
          beforeData: (params.beforeData ?? undefined) as Prisma.InputJsonObject | undefined,
          afterData: (params.afterData ?? undefined) as Prisma.InputJsonObject | undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent?.slice(0, 500) ?? null,
        },
      })
    } catch (err) {
      this.logger.error(`[AuditService] Failed to write audit log for action=${params.action}`, err)
    }
  }
}
