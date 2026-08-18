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
              payload: { messages: [{ text: 'Mock notification' }] },
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
    expect(screen.getByText('Đích nhận: rogym-liff-mock-member')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Mở LIFF link' })).toHaveAttribute(
      'href',
      'http://localhost:5173/liff?redirect=%2Fmember'
    )

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
    expect(screen.getByText('Chưa có tin nhắn mock.')).toBeVisible()
  })

  it('previews Flex and Rich Menu samples and requests them from the mock API', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          messages: [
            {
              id: 'flex-1',
              kind: 'push',
              createdAt: '2026-08-18T08:00:00.000Z',
              recipient: 'member',
              payload: {
                messages: [
                  {
                    type: 'flex',
                    altText: 'Lịch tập sắp tới',
                    contents: {
                      type: 'carousel',
                      contents: [
                        {
                          type: 'bubble',
                          body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [{ type: 'text', text: 'Buổi tập với PT', weight: 'bold' }],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              id: 'menu-1',
              kind: 'rich-menu',
              createdAt: '2026-08-18T08:00:00.000Z',
              payload: {
                areas: [
                  {
                    action: { label: 'Lịch tập', uri: 'liff://mock-liff/member/workout/sessions' },
                  },
                  {
                    action: {
                      label: 'Đặt lịch',
                      uri: 'liff://mock-liff/member/workout/sessions?book=1',
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

    expect(await screen.findByText('Lịch tập sắp tới')).toBeVisible()
    expect(screen.getByText('Buổi tập với PT')).toBeVisible()
    expect(screen.getByText('Rich Menu')).toBeVisible()
    expect(screen.getAllByText('Đặt lịch')).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Tạo mẫu Flex' }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', { type: 'flex' })
    })

    await user.click(screen.getByRole('button', { name: 'Tạo mẫu Rich Menu' }))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dev/line-mock/samples', { type: 'rich-menu' })
    })
  })
})
