import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { useAuthStore } from '@/stores/authStore'
import { notificationService, type NotificationItem } from '@/services/notification.service'
import type { Role } from '@/stores/authStore'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    list: vi.fn(),
    listNew: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

const item: NotificationItem = {
  notificationId: '10',
  recipientUserId: '1',
  type: 'feedback.created',
  title: 'Phan hoi moi',
  message: 'Co mot phan hoi moi tu hoi vien.',
  resourceType: 'feedback',
  resourceId: '5',
  metadata: null,
  readAt: null,
  createdAt: new Date().toISOString(),
  unread: true,
}

function renderBell(initialPath = '/staff') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NotificationBell />
    </MemoryRouter>
  )
}

function mockAuth(roles: Role[]) {
  useAuthStore.getState().setAuth(
    {
      userId: '1',
      email: `${roles[0]}@gym.local`,
      fullName: 'User',
      roles,
      staffId: roles.some((role) => role === 'staff' || role === 'trainer' || role === 'owner') ? '1' : null,
      memberId: roles.includes('member') ? '1' : null,
    },
    'token'
  )
}

function mockList(notification: NotificationItem) {
  vi.mocked(notificationService.list).mockResolvedValue({
    success: true,
    data: [notification],
    meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  })
}

function makeItem(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    ...item,
    notificationId: overrides.notificationId ?? item.notificationId,
    type: overrides.type ?? item.type,
    title: overrides.title ?? item.title,
    message: overrides.message ?? item.message,
    resourceType: overrides.resourceType ?? item.resourceType,
    resourceId: overrides.resourceId ?? item.resourceId,
    unread: overrides.unread ?? item.unread,
    readAt: overrides.readAt ?? item.readAt,
  }
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockClear()
    useAuthStore.getState().clearAuth()
    mockAuth(['staff'])
    mockList(item)
    vi.mocked(notificationService.unreadCount).mockResolvedValue(1)
    vi.mocked(notificationService.listNew).mockResolvedValue([])
    vi.mocked(notificationService.markRead).mockResolvedValue(1)
    vi.mocked(notificationService.markAllRead).mockResolvedValue(1)
  })

  it('renders unread badge and opens the notification list', async () => {
    renderBell()

    expect(await screen.findByText('1')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Thong bao' }))

    expect(await screen.findByText('Phan hoi moi')).toBeVisible()
    expect(screen.getByText('Co mot phan hoi moi tu hoi vien.')).toBeVisible()
  })

  it('marks a clicked unread notification as read', async () => {
    renderBell()

    fireEvent.click(await screen.findByRole('button', { name: 'Thong bao' }))
    fireEvent.click(await screen.findByText('Phan hoi moi'))

    await waitFor(() => expect(notificationService.markRead).toHaveBeenCalledWith('10'))
  })

  it.each([
    ['member', 'training_session', '/member/workout/sessions', '/member'],
    ['trainer', 'training_session', '/trainer/sessions', '/trainer'],
    ['staff', 'training_session', '/staff/schedules', '/staff'],
    ['owner', 'training_session', '/owner/staff/schedules', '/owner'],
    ['member', 'subscription', '/member/subscription/current', '/member'],
    ['staff', 'subscription', '/staff/renewal', '/staff'],
    ['owner', 'subscription', '/owner/reports/transaction-invoices', '/owner'],
    ['member', 'payment', '/member/subscription/history', '/member'],
    ['staff', 'payment', '/staff/renewal', '/staff'],
    ['owner', 'payment', '/owner/reports/transaction-invoices', '/owner'],
    ['member', 'attendance_log', '/member/attendance', '/member'],
    ['trainer', 'attendance_log', '/trainer/students', '/trainer'],
    ['staff', 'attendance_log', '/staff/attendance', '/staff'],
    ['owner', 'attendance_log', '/owner/reports/employee-performance', '/owner'],
    ['member', 'feedback', '/member/feedback', '/member'],
    ['staff', 'feedback', '/staff/feedback', '/staff'],
    ['owner', 'feedback', '/owner/feedback', '/owner'],
  ] as Array<[Role, NonNullable<NotificationItem['resourceType']>, string, string]>)(
    'routes %s %s notifications to %s',
    async (role, resourceType, expectedPath, initialPath) => {
      mockAuth([role])
      const routedItem = makeItem({
        notificationId: `${resourceType}-${role}`,
        title: `${resourceType} ${role}`,
        resourceType,
      })
      mockList(routedItem)

      renderBell(initialPath)

      fireEvent.click(await screen.findByRole('button', { name: 'Thong bao' }))
      fireEvent.click(await screen.findByText(`${resourceType} ${role}`))

      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(expectedPath))
    }
  )

  it('keeps owner in staff operation mode when opened from the staff namespace', async () => {
    mockAuth(['owner'])
    const routedItem = makeItem({
      notificationId: 'owner-staff-feedback',
      title: 'Owner staff feedback',
      resourceType: 'feedback',
    })
    mockList(routedItem)

    renderBell('/staff')

    fireEvent.click(await screen.findByRole('button', { name: 'Thong bao' }))
    fireEvent.click(await screen.findByText('Owner staff feedback'))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/staff/feedback'))
  })
})
