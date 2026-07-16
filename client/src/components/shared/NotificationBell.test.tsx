import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { useAuthStore } from '@/stores/authStore'
import { notificationService, type NotificationItem } from '@/services/notification.service'

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

function renderBell() {
  return render(
    <MemoryRouter initialEntries={['/staff']}>
      <NotificationBell />
    </MemoryRouter>
  )
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearAuth()
    useAuthStore.getState().setAuth(
      {
        userId: '1',
        email: 'staff@gym.local',
        fullName: 'Staff',
        roles: ['staff'],
        staffId: '1',
      },
      'token'
    )
    vi.mocked(notificationService.list).mockResolvedValue({
      success: true,
      data: [item],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
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
})
