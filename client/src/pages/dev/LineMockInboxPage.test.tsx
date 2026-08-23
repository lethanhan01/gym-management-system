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

  it('renders 4 categorized trigger groups and simulates a follow webhook', async () => {
    const user = userEvent.setup()
    render(<LineMockInboxPage />)

    expect(await screen.findByText('LINE Mock Inbox & Simulator')).toBeVisible()
    expect(screen.getByText('1. Lịch Tập PT')).toBeVisible()
    expect(screen.getByText('2. Điểm Danh & Gói Tập')).toBeVisible()
    expect(screen.getByText('3. Thanh Toán & Góp Ý')).toBeVisible()
    expect(screen.getByText('4. Webhook OA & Menu')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Follow Event' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/events', { type: 'follow' })
    })
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('switches between Chat Room simulator view and Admin Outbox Logs view and clears inbox', async () => {
    const user = userEvent.setup()
    render(<LineMockInboxPage />)

    await screen.findByText('LINE Mock Inbox & Simulator')

    // Switch to logs view
    await user.click(screen.getByRole('button', { name: /Admin Outbox Logs/i }))

    expect(await screen.findByText('Push message')).toBeVisible()
    expect(screen.getByText('Đích: rogym-liff-mock-member')).toBeVisible()
    expect(screen.getByText('Mock notification')).toBeVisible()

    // Clear inbox
    await user.click(screen.getByRole('button', { name: 'Xóa inbox' }))

    expect(api.delete).toHaveBeenCalledWith('/dev/line-mock/messages')
    expect(
      screen.getByText(/Chưa có tin nhắn mock nào trong hàng đợi/i)
    ).toBeVisible()
  })

  it('previews Flex Bubble cards and handles action button CTA click to open simulator', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          messages: [
            {
              id: 'flex-1',
              kind: 'push',
              createdAt: '2026-08-18T08:00:00.000Z',
              payload: {
                messages: [
                  {
                    type: 'flex',
                    altText: 'Thông báo đặt lịch tập PT',
                    contents: {
                      type: 'bubble',
                      header: {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                          { type: 'text', text: 'ROGYM', color: '#06c384', weight: 'bold' },
                          {
                            type: 'box',
                            layout: 'horizontal',
                            backgroundColor: '#06c38426',
                            contents: [{ type: 'text', text: 'ĐÃ ĐẶT LỊCH', color: '#42e09e' }],
                          },
                        ],
                      },
                      body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                          { type: 'text', text: 'Đặt lịch tập thành công', size: 'xl', weight: 'bold' },
                          { type: 'separator' },
                          {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                              { type: 'text', text: 'PT:', color: '#8ab89c', flex: 3 },
                              { type: 'text', text: 'Coach Alex', color: '#ffffff', weight: 'bold', flex: 7 },
                            ],
                          },
                        ],
                      },
                      footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                          {
                            type: 'button',
                            style: 'primary',
                            action: {
                              type: 'uri',
                              label: 'Xem chi tiết buổi tập',
                              uri: 'http://localhost:5173/liff?redirect=/member/workout/sessions?sessionId=101',
                            },
                          },
                        ],
                      },
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

    expect(await screen.findByText('ROGYM')).toBeVisible()
    expect(screen.getByText('ĐÃ ĐẶT LỊCH')).toBeVisible()
    expect(screen.getByText('Đặt lịch tập thành công')).toBeVisible()
    expect(screen.getByText('Coach Alex')).toBeVisible()

    // Click CTA action button
    const ctaBtn = screen.getByRole('button', { name: 'Xem chi tiết buổi tập' })
    await user.click(ctaBtn)

    // Simulator should now open with iframe
    expect(screen.getByTitle('LIFF Mobile Preview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng Simulator' })).toBeVisible()
  })

  it('triggers sample requests across groups with selected locale', async () => {
    const user = userEvent.setup()
    render(<LineMockInboxPage />)

    await screen.findByText('LINE Mock Inbox & Simulator')

    // Switch language to Japanese
    await user.click(screen.getByRole('button', { name: '日本語 (ja)' }))

    // Click PT sample button
    await user.click(screen.getByRole('button', { name: /Đặt lịch mới/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'pt-booking-created',
        locale: 'ja',
      })
    })

    // Click PT update button
    await user.click(screen.getByRole('button', { name: /Đổi lịch/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'pt-booking-updated',
        locale: 'ja',
      })
    })

    // Click PT cancel button
    await user.click(screen.getByRole('button', { name: /Hủy lịch/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'pt-booking-cancelled',
        locale: 'ja',
      })
    })

    // Click attendance checkin button
    await user.click(screen.getByRole('button', { name: /Check-in QR/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'attendance-checkin',
        locale: 'ja',
      })
    })

    // Click payment success button
    await user.click(screen.getByRole('button', { name: /Biên lai thanh toán/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'payment-success',
        locale: 'ja',
      })
    })

    // Click welcome button
    await user.click(screen.getByRole('button', { name: /Chào mừng/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'welcome',
        locale: 'ja',
      })
    })

    // Click rich menu button
    await user.click(screen.getByRole('button', { name: /Rich Menu/i }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', {
        type: 'rich-menu',
        locale: 'ja',
      })
    })
  })
})
