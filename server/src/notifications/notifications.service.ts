import { Injectable, Logger } from '@nestjs/common'
import { Prisma, UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

type GroupName = 'owner' | 'staff' | 'trainer' | 'member'

export interface NotificationPayload {
  type: string
  title: string
  message: string
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Prisma.InputJsonValue | null
  dedupeKey?: string | null
}

interface NotifyOptions {
  excludeActorUserId?: bigint | null
}

type NotificationRow = {
  notificationId: bigint
  recipientUserId: bigint
  type: string
  title: string
  message: string
  resourceType: string | null
  resourceId: string | null
  metadata: Prisma.JsonValue | null
  readAt: Date | null
  createdAt: Date
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: bigint,
    query: { page?: number; pageSize?: number; status?: 'all' | 'unread' }
  ) {
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? 20, 50)
    const where: Prisma.NotificationWhereInput = {
      recipientUserId: userId,
      ...(query.status === 'unread' ? { readAt: null } : {}),
    }

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { notificationId: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ])

    return {
      data: rows.map((row) => this.serialize(row)),
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    }
  }

  async listNew(userId: bigint, afterId: bigint, limit = 20) {
    const rows = await this.prisma.notification.findMany({
      where: { recipientUserId: userId, notificationId: { gt: afterId } },
      orderBy: { notificationId: 'asc' },
      take: Math.min(limit, 50),
    })
    return { data: rows.map((row) => this.serialize(row)) }
  }

  async unreadCount(userId: bigint) {
    const count = await this.prisma.notification.count({
      where: { recipientUserId: userId, readAt: null },
    })
    return { data: { count } }
  }

  async markRead(userId: bigint, notificationId: bigint) {
    const updated = await this.prisma.notification.updateMany({
      where: { notificationId, recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    })
    return { data: { updated: updated.count } }
  }

  async markAllRead(userId: bigint) {
    const updated = await this.prisma.notification.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    })
    return { data: { updated: updated.count } }
  }

  async notifyUser(userId: bigint | null | undefined, payload: NotificationPayload) {
    if (!userId) return false
    return this.createForUser(userId, payload)
  }

  async notifyManyUsers(
    userIds: Array<bigint | null | undefined>,
    payload: NotificationPayload,
    options: NotifyOptions = {}
  ) {
    const uniqueIds = this.uniqueRecipients(userIds, options.excludeActorUserId)
    let created = 0
    for (const userId of uniqueIds) {
      if (await this.createForUser(userId, payload)) created++
    }
    return created
  }

  async notifyGroups(
    groupNames: GroupName[],
    payload: NotificationPayload,
    options: NotifyOptions = {}
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.active,
        deletedAt: null,
        groups: {
          some: {
            group: {
              name: { in: groupNames },
              deletedAt: null,
            },
          },
        },
      },
      select: { userId: true },
    })
    await this.notifyManyUsers(
      users.map((user) => user.userId),
      payload,
      options
    )
  }

  async safeNotifyUser(userId: bigint | null | undefined, payload: NotificationPayload) {
    try {
      return await this.notifyUser(userId, payload)
    } catch (error) {
      this.logger.warn(
        `Notification create failed (${this.describePayload(payload)}, recipientUserId=${this.describeBigInt(userId)}): ${this.describeError(error)}`
      )
      return false
    }
  }

  async safeNotifyManyUsers(
    userIds: Array<bigint | null | undefined>,
    payload: NotificationPayload,
    options: NotifyOptions = {}
  ) {
    try {
      await this.notifyManyUsers(userIds, payload, options)
    } catch (error) {
      this.logger.warn(
        `Notification batch create failed (${this.describePayload(payload)}, recipientUserIds=${this.describeBigIntList(userIds)}, excludeActorUserId=${this.describeBigInt(options.excludeActorUserId)}): ${this.describeError(error)}`
      )
    }
  }

  async safeNotifyGroups(
    groupNames: GroupName[],
    payload: NotificationPayload,
    options: NotifyOptions = {}
  ) {
    try {
      await this.notifyGroups(groupNames, payload, options)
    } catch (error) {
      this.logger.warn(
        `Notification group create failed (${this.describePayload(payload)}, groups=${groupNames.join(',')}, excludeActorUserId=${this.describeBigInt(options.excludeActorUserId)}): ${this.describeError(error)}`
      )
    }
  }

  private async createForUser(userId: bigint, payload: NotificationPayload) {
    const dedupeKey = payload.dedupeKey ? `${payload.dedupeKey}:user:${userId.toString()}` : null
    try {
      await this.prisma.notification.create({
        data: {
          recipientUserId: userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          resourceType: payload.resourceType ?? null,
          resourceId: payload.resourceId ?? null,
          metadata: payload.metadata ?? Prisma.JsonNull,
          dedupeKey,
        },
      })
      return true
    } catch (error) {
      if (this.isUniqueDedupeError(error)) return false
      throw error
    }
  }

  private uniqueRecipients(
    userIds: Array<bigint | null | undefined>,
    excludeActorUserId?: bigint | null
  ) {
    const seen = new Set<string>()
    const recipients: bigint[] = []
    for (const userId of userIds) {
      if (!userId) continue
      if (excludeActorUserId && userId === excludeActorUserId) continue
      const key = userId.toString()
      if (seen.has(key)) continue
      seen.add(key)
      recipients.push(userId)
    }
    return recipients
  }

  private serialize(row: NotificationRow) {
    return {
      notificationId: row.notificationId.toString(),
      recipientUserId: row.recipientUserId.toString(),
      type: row.type,
      title: row.title,
      message: row.message,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      metadata: row.metadata,
      readAt: row.readAt,
      createdAt: row.createdAt,
      unread: row.readAt === null,
    }
  }

  private isUniqueDedupeError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }

  private describeError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return `Prisma ${error.code}: ${error.message}`
    }
    if (error instanceof Error) return error.message
    return String(error)
  }

  private describePayload(payload: NotificationPayload) {
    return [
      `type=${payload.type}`,
      `resourceType=${payload.resourceType ?? 'null'}`,
      `resourceId=${payload.resourceId ?? 'null'}`,
    ].join(', ')
  }

  private describeBigInt(value: bigint | null | undefined) {
    return value?.toString() ?? 'null'
  }

  private describeBigIntList(values: Array<bigint | null | undefined>) {
    return values.map((value) => this.describeBigInt(value)).join(',')
  }
}
