import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SendFeedbackPage from './SendFeedbackPage'
import { feedbackService } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'
import i18n from '@/lib/i18n'

vi.mock('@/services/feedback.service', () => ({
  feedbackService: {
    getOptions: vi.fn(),
    create: vi.fn(),
  },
}))

const mockOptions = {
  trainers: {
    assigned: [
      { staffId: 'staff-1', fullName: 'Tran Quang Minh', staffCode: 'STF-PT-001' },
    ],
    all: [
      { staffId: 'staff-1', fullName: 'Tran Quang Minh', staffCode: 'STF-PT-001' },
      { staffId: 'staff-2', fullName: 'Le Thi Huong', staffCode: 'STF-PT-002' },
    ],
  },
  rooms: [
    { roomId: 'room-1', roomCode: 'RM-01', name: 'Phong Cardio', roomType: 'Cardio' },
    { roomId: 'room-2', roomCode: 'RM-02', name: 'Phong Yoga', roomType: 'Yoga' },
  ],
  equipment: [
    { equipmentId: 'eq-1', name: 'May chay bo Pro', equipmentCode: 'EQ-RUN-01', roomId: 'room-1', status: 'available' },
  ],
  recentSessions: [
    {
      sessionId: 'sess-1',
      trainerStaffId: 'staff-1',
      trainerName: 'Tran Quang Minh',
      startTime: '2026-09-10T08:00:00Z',
      endTime: '2026-09-10T09:00:00Z',
      roomName: 'Phong Cardio',
    },
  ],
  quickTags: {
    staff: {
      positive: ['Nhiệt tình', 'Chuyên nghiệp', 'Đúng giờ'],
      negative: ['Đi muộn', 'Thiếu nhiệt tình'],
    },
    facility: {
      positive: ['Sạch sẽ', 'Máy móc mới'],
      negative: ['Máy hỏng', 'Phòng bí'],
    },
  },
}

describe('SendFeedbackPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        userId: 'u1',
        memberId: '101',
        email: 'member@test.com',
        roles: ['member'],
        fullName: 'Nguyen Van A',
      },
      token: 'test-token',
      isAuthenticated: true,
    })
    vi.mocked(feedbackService.getOptions).mockResolvedValue(mockOptions)
    await i18n.changeLanguage('vi')
  })

  it('renders correctly with SegmentedControl, FormFields, and Select components', async () => {
    render(
      <MemoryRouter>
        <SendFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      // Check that loading skeleton is gone
      expect(screen.queryByTestId('page-skeleton')).toBeNull()
    })

    // SegmentedControl for Target Type renders radio buttons
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(0)
    
    // Quick tags rendered as Chips
    expect(screen.getByText('Nhiệt tình')).toBeDefined()
    expect(screen.getByText('Chuyên nghiệp')).toBeDefined()

    // Switch for anonymous mode
    const anonymousSwitch = screen.getByRole('switch')
    expect(anonymousSwitch).toBeDefined()
    expect(anonymousSwitch.getAttribute('aria-checked')).toBe('false')

    // Submit button
    const submitBtn = screen.getByRole('button', { name: /gửi đánh giá/i })
    expect(submitBtn).toBeDefined()
  })

  it('allows toggling anonymous switch and entering feedback content', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SendFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeDefined()
    })

    const anonymousSwitch = screen.getByRole('switch')
    await user.click(anonymousSwitch)
    expect(anonymousSwitch.getAttribute('aria-checked')).toBe('true')

    const textarea = screen.getByPlaceholderText(/chia sẻ cảm nhận/i)
    await user.type(textarea, 'HLV hướng dẫn rất chi tiết và nhiệt tình.')
    expect(textarea).toHaveValue('HLV hướng dẫn rất chi tiết và nhiệt tình.')
  })

  it('switches to facility target when clicking facility selectable card', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SendFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /cơ sở vật chất/i })).toBeDefined()
    })

    const facilityTab = screen.getByRole('radio', { name: /cơ sở vật chất/i })
    await user.click(facilityTab)

    // Verify facility tags appear
    await waitFor(() => {
      expect(screen.getByText('Sạch sẽ')).toBeDefined()
      expect(screen.getByText('Máy móc mới')).toBeDefined()
    })
  })

  it('renders responsive scope labels for assigned and all trainers', async () => {
    render(
      <MemoryRouter>
        <SendFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Gần đây')).toBeDefined()
      expect(screen.getByText('Tất cả')).toBeDefined()
    })
  })

  it('renders and submits properly in Japanese when language is switched to ja', async () => {
    await i18n.changeLanguage('ja')
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SendFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('フィードバックを送信')).toBeDefined()
      expect(screen.getByText('サービス品質')).toBeDefined()
    })

    // Radio cards in Japanese
    expect(screen.getByRole('radio', { name: /トレーナー \(PT\)/i })).toBeDefined()
    expect(screen.getByRole('radio', { name: /施設・設備/i })).toBeDefined()

    // Trainer scope labels in Japanese
    expect(screen.getByText('最近')).toBeDefined()
    expect(screen.getByText('すべて')).toBeDefined()

    // Quick tags localized to Japanese
    expect(screen.getByText('親切・熱心')).toBeDefined()
    expect(screen.getByText('プロフェッショナル')).toBeDefined()

    // Anonymous toggle in Japanese
    expect(screen.getByText('匿名で送信する')).toBeDefined()

    // Submit button in Japanese
    const submitBtn = screen.getByRole('button', { name: /フィードバックを送信/i })
    expect(submitBtn).toBeDefined()

    // Enter content and submit
    const textarea = screen.getByPlaceholderText(/具体的な感想やご意見をご記入ください/i)
    await user.type(textarea, '丁寧な指導をありがとうございました。')

    // Click quick tag (親切・熱心)
    await user.click(screen.getByText('親切・熱心'))

    vi.mocked(feedbackService.create).mockResolvedValue({
      feedbackId: 'new-fb-1',
      status: 'open',
    } as unknown as Awaited<ReturnType<typeof feedbackService.create>>)

    await user.click(submitBtn)

    await waitFor(() => {
      expect(feedbackService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: '101',
          feedbackType: 'staff',
          content: '丁寧な指導をありがとうございました。',
          tags: ['Nhiệt tình'], // Preserves raw tag value for backend
        })
      )
    })

    // Success screen in Japanese
    await waitFor(() => {
      expect(screen.getByText('送信が完了しました！')).toBeDefined()
      expect(screen.getByText('マイフィードバックを見る')).toBeDefined()
    })
  })
})
