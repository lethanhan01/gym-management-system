import { Prisma } from '@prisma/client'
import { NotificationsService } from './notifications.service'

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
}

function makeNotification(overrides: object = {}) {
  return {
    notificationId: 10n,
    recipientUserId: 1n,
    type: 'test',
    title: 'Title',
    message: 'Message',
    resourceType: 'feedback',
    resourceId: '5',
    metadata: null,
    readAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(() => {
    service = new NotificationsService(mockPrisma as any)
    jest.clearAllMocks()
  })

  it('lists notifications for the current user and caps pageSize at 50', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([makeNotification()])
    mockPrisma.notification.count.mockResolvedValue(1)

    const result = await service.list(1n, { page: 1, pageSize: 100, status: 'unread' })

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientUserId: 1n, readAt: null },
        take: 50,
      })
    )
    expect(result.data[0]).toMatchObject({ notificationId: '10', unread: true })
    expect(result.meta.pageSize).toBe(50)
  })

  it('returns only new notifications after the baseline id', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([makeNotification({ notificationId: 11n })])

    await service.listNew(1n, 10n, 20)

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientUserId: 1n, notificationId: { gt: 10n } },
        orderBy: { notificationId: 'asc' },
      })
    )
  })

  it('marks only the current user notification as read', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 })

    const result = await service.markRead(1n, 10n)

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { notificationId: 10n, recipientUserId: 1n, readAt: null },
      })
    )
    expect(result.data.updated).toBe(1)
  })

  it('notifyGroups filters active users through the group relation and excludes actor recipients', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ userId: 1n }, { userId: 2n }, { userId: 2n }])
    mockPrisma.notification.create.mockResolvedValue({})

    await service.notifyGroups(
      ['owner', 'staff'],
      { type: 'test', title: 'Title', message: 'Message', dedupeKey: 'event:1' },
      { excludeActorUserId: 1n }
    )

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'active',
          deletedAt: null,
        }),
      })
    )
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientUserId: 2n,
          dedupeKey: 'event:1:user:2',
        }),
      })
    )
  })

  it('ignores duplicate dedupe key writes from Prisma P2002', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['dedupe_key'] },
    })
    mockPrisma.notification.create.mockRejectedValue(duplicate)

    await expect(
      service.notifyUser(2n, {
        type: 'test',
        title: 'Title',
        message: 'Message',
        dedupeKey: 'event:1',
      })
    ).resolves.toBe(false)

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientUserId: 2n,
          dedupeKey: 'event:1:user:2',
        }),
      })
    )
  })
})
