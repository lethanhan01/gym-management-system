import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LineMockInboxPage from './LineMockInboxPage'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/services/api', () => ({ default: api }))

describe('LineMockInboxPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({
      data: {
        data: {
          messages: [
            {
              id: '1',
              kind: 'push',
              createdAt: '2026-08-18T08:00:00.000Z',
              recipient: 'rogym-liff-mock-member',
              liffUrl: 'http://localhost:5173/liff?redirect=%2Fmember',
              payload: {
                messages: [
                  {
                    type: 'text',
                    text: 'Mock notification',
                    quickReply: {
                      items: [
                        {
                          type: 'action',
                          action: {
                            type: 'uri',
                            label: 'Xem chi tiết',
                            uri: 'http://localhost:5173/liff?redirect=%2Fmember%2Fworkout%2Fsessions%3FsessionId%3D101',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    })
    api.post.mockResolvedValue({ data: { success: true } })
    api.delete.mockResolvedValue({ data: { success: true } })
  })

  it('renders the outbox and simulates a follow webhook', async () => {
    const user = userEvent.setup()
    render(<LineMockInboxPage />)

    expect(await screen.findByText('Push message')).toBeVisible()
    expect(screen.getByText('Đích: rogym-liff-mock-member')).toBeVisible()
    expect(screen.getByText('Mock notification')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Follow' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/events', { type: 'follow' })
    })
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('clears the outbox', async () => {
    const user = userEvent.setup()
    render(<LineMockInboxPage />)

    await screen.findByText('Push message')
    await user.click(screen.getByRole('button', { name: 'Xóa inbox' }))

    expect(api.delete).toHaveBeenCalledWith('/dev/line-mock/messages')
    expect(
      screen.getByText(/Chưa có tin nhắn mock nào trong hàng đợi/i)
    ).toBeVisible()
  })

  it('opens and closes the mobile simulator when clicking quick reply or header toggle', async () => {
    const user = userEvent.setup()
    render(<LineMockInboxPage />)

    await screen.findByText('Mock notification')

    // Click QuickReply button
    const quickReplyBtn = screen.getByRole('button', { name: /Xem chi tiết/i })
    await user.click(quickReplyBtn)

    // Simulator should now be visible with iframe
    expect(screen.getByTitle('LIFF Mobile Preview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng Simulator' })).toBeVisible()

    // Close simulator
    await user.click(screen.getByRole('button', { name: 'Đóng Simulator' }))
    expect(screen.queryByTitle('LIFF Mobile Preview')).not.toBeInTheDocument()
  })

  it('previews Rich Menu with 4 interactive zones and triggers sample requests with locale', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          messages: [
            {
              id: 'menu-1',
              kind: 'rich-menu',
              createdAt: '2026-08-18T08:00:00.000Z',
              payload: {
                areas: [
                  {
                    action: { label: 'Lịch tập', uri: 'http://localhost:5173/liff?redirect=/member/workout/sessions' },
                  },
                  {
                    action: {
                      label: 'Đặt lịch',
                      uri: 'http://localhost:5173/liff?redirect=/member/workout/sessions?book=1',
                    },
                  },
                  {
                    action: {
                      label: 'Check-in',
                      uri: 'http://localhost:5173/liff?redirect=/member/attendance',
                    },
                  },
                  {
                    action: {
                      label: 'Hồ sơ',
                      uri: 'http://localhost:5173/liff?redirect=/member/profile',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    })
    render(<LineMockInboxPage />)

    expect(await screen.findByText('Rich Menu')).toBeVisible()
    expect(screen.getByText('ROGYM OFFICIAL')).toBeVisible()
    expect(screen.getByText('HOT · Zone 2')).toBeVisible()

    // Switch language to Japanese
    await user.click(screen.getByRole('button', { name: '日本語 (ja)' }))

    // Click sample buttons
    await user.click(screen.getByRole('button', { name: /Tạo mẫu Đặt lịch PT/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'pt-booking-created',
        locale: 'ja',
      })
    })

    await user.click(screen.getByRole('button', { name: /Tạo mẫu Nhắc lịch 30p/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'pt-reminder-30m',
        locale: 'ja',
      })
    })

    await user.click(screen.getByRole('button', { name: /Tạo mẫu Hủy lịch/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'pt-session-cancelled',
        locale: 'ja',
      })
    })

    await user.click(screen.getByRole('button', { name: /Tạo mẫu Rich Menu/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'rich-menu',
        locale: 'ja',
      })
    })
  })
})
