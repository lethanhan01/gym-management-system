import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { showRealtimeNotificationToast } from './notification-toast'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import { notificationService, type NotificationItem } from '@/services/notification.service'
import type { Role } from '@/stores/authStore'

const navigateMock = vi.hoisted(() => vi.fn())
const toastInfoMock = vi.hoisted(() => vi.fn())

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

vi.mock('@/lib/toast', () => ({
  toast: { info: toastInfoMock },
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
    metadata: overrides.metadata ?? item.metadata,
    unread: overrides.unread ?? item.unread,
    readAt: overrides.readAt ?? item.readAt,
  }
}

describe('NotificationBell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
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

  it('renders unread badge, and automatically marks all as read when opened', async () => {
    renderBell()

    expect(await screen.findByText('1')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    expect(screen.getByRole('region', { name: 'Thông báo' })).toHaveClass('rogym-notification-panel')
    expect(await screen.findByText('Phản hồi mới')).toBeVisible()
    expect(screen.getByText('Có một phản hồi mới từ hội viên.')).toBeVisible()
    expect(screen.getByText('Đã đọc tất cả')).toBeVisible()
    expect(screen.getByText('Vừa xong')).toBeVisible()
    await waitFor(() => expect(notificationService.markAllRead).toHaveBeenCalled())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks all notifications as read from the panel action', async () => {
    renderBell()

    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }))

    await waitFor(() => expect(notificationService.markAllRead).toHaveBeenCalled())
    expect(screen.getByText('Đã đọc tất cả')).toBeVisible()
  })

  it('sends realtime notifications through the shared toast API', () => {
    showRealtimeNotificationToast('Realtime notice')

    expect(toastInfoMock).toHaveBeenCalledWith('Realtime notice')
  })

  it('does not display realtime toast when panel is open during polling', async () => {
    vi.useFakeTimers()
    vi.mocked(notificationService.listNew).mockResolvedValue([])

    renderBell()
    await vi.runOnlyPendingTimersAsync()

    // Open the panel
    const bellBtn = screen.getByRole('button', { name: 'Thông báo' })
    fireEvent.click(bellBtn)

    const newItem = makeItem({ notificationId: '20', title: 'Thông báo mới' })
    vi.mocked(notificationService.listNew).mockResolvedValue([newItem])
    toastInfoMock.mockClear()

    // Advance time to trigger polling
    await vi.advanceTimersByTimeAsync(20000)

    // Toast should not be triggered because openRef is true
    expect(toastInfoMock).not.toHaveBeenCalled()
  })

  it('shows aggregated toast when multiple new notifications arrive via polling while closed', async () => {
    vi.useFakeTimers()
    const newItem1 = makeItem({ notificationId: '21', title: 'TB 1' })
    const newItem2 = makeItem({ notificationId: '22', title: 'TB 2' })
    vi.mocked(notificationService.listNew).mockResolvedValue([newItem1, newItem2])

    renderBell()
    await vi.runOnlyPendingTimersAsync()

    // Advance time by 20s while closed
    await vi.advanceTimersByTimeAsync(20000)

    expect(toastInfoMock).toHaveBeenCalledWith('Bạn có 2 thông báo mới')
  })

  it('updates notification content when the language changes to Japanese', async () => {
    const translatedItem = makeItem({
      type: 'training.created',
      title: 'Lich tap moi',
      message: 'Ban co lich tap voi PT Test Trainer.',
      resourceType: 'training_session',
      metadata: { trainerName: 'Test Trainer' },
    })
    mockList(translatedItem)

    renderBell('/member')

    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))
    expect(await screen.findByText('Lịch tập mới')).toBeVisible()
    expect(screen.getByText('Bạn có lịch tập với PT Test Trainer.')).toBeVisible()

    await i18n.changeLanguage('ja')

    expect(await screen.findByRole('button', { name: '通知' })).toBeVisible()
    expect(screen.getByText('新しいトレーニング予定')).toBeVisible()
    expect(screen.getByText('PT Test Trainer とのトレーニング予定があります。')).toBeVisible()
    expect(screen.getByText('すべて既読')).toBeVisible()
    expect(screen.getByText('たった今')).toBeVisible()
  })

  it('translates training reminder notifications instead of showing stored Vietnamese text', async () => {
    const reminderItem = makeItem({
      type: 'training.reminder',
      title: 'Sap den gio tap',
      message: 'Buoi tap voi PT Test Trainer se bat dau sau 30 phut.',
      resourceType: 'training_session',
      metadata: { trainerName: 'Test Trainer', reminderMinutes: 30 },
    })
    mockList(reminderItem)

    renderBell('/member')

    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))
    expect(await screen.findByText('Sắp đến giờ tập')).toBeVisible()
    expect(screen.getByText('Buổi tập với PT Test Trainer sẽ bắt đầu sau 30 phút.')).toBeVisible()

    await i18n.changeLanguage('ja')

    expect(await screen.findByRole('button', { name: '通知' })).toBeVisible()
    expect(screen.getByText('トレーニング開始間近')).toBeVisible()
    expect(screen.getByText('PT Test Trainer とのトレーニングはあと30分で始まります。')).toBeVisible()
    expect(screen.queryByText('Sap den gio tap')).not.toBeInTheDocument()
    expect(screen.queryByText('Buoi tap voi PT Test Trainer se bat dau sau 30 phut.')).not.toBeInTheDocument()
  })

  it('falls back to API title and message when a dynamic template lacks metadata', async () => {
    const legacyItem = makeItem({
      type: 'subscription.created',
      title: 'Legacy title',
      message: 'Legacy message',
      resourceType: 'subscription',
      metadata: null,
    })
    mockList(legacyItem)

    renderBell('/member')

    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText('Legacy title')).toBeVisible()
    expect(screen.getByText('Legacy message')).toBeVisible()
  })

  it('navigates and closes panel when a notification item is clicked', async () => {
    renderBell()

    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))
    fireEvent.click(await screen.findByText('Phản hồi mới'))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/staff/feedback'))
    expect(screen.queryByRole('region', { name: 'Thông báo' })).not.toBeInTheDocument()
  })

  it.each([
    ['member', 'training_session', '/member/workout/sessions?sessionId=5', '/member'],
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
        type: 'route.test',
        title: `${resourceType} ${role}`,
        resourceType,
      })
      mockList(routedItem)

      renderBell(initialPath)

      fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))
      fireEvent.click(await screen.findByText(`${resourceType} ${role}`))

      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(expectedPath))
    }
  )

  it('keeps owner in staff operation mode when opened from the staff namespace', async () => {
    mockAuth(['owner'])
    const routedItem = makeItem({
      notificationId: 'owner-staff-feedback',
      type: 'route.test',
      title: 'Owner staff feedback',
      resourceType: 'feedback',
    })
    mockList(routedItem)

    renderBell('/staff')

    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))
    fireEvent.click(await screen.findByText('Owner staff feedback'))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/staff/feedback'))
  })
})
