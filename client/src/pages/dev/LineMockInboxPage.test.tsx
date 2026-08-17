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
})
