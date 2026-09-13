import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MyFeedbackPage from './MyFeedbackPage'
import { feedbackService } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'
import i18n from '@/lib/i18n'

vi.mock('@/services/feedback.service', () => ({
  feedbackService: {
    list: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockFeedbacks = [
  {
    feedbackId: 'fb-1',
    memberId: '101',
    feedbackType: 'facility' as const,
    content: 'Phòng tập rất sạch sẽ, nhưng máy chạy bộ số 1 thỉnh thoảng bị kẹt băng chuyền.',
    rating: 3,
    tags: ['PhòngQuáNóng', 'MáyHỏng'],
    isAnonymous: true,
    imageUrls: ['https://example.com/img1.jpg'],
    severity: 'medium' as const,
    status: 'open' as const,
    subjectRoomId: 'room-1',
    subjectRoomName: 'Phong Cardio',
    subjectEquipmentId: 'eq-1',
    subjectEquipmentName: 'May Chay Bo Life Fitness #1',
    subjectStaffId: null,
    subjectStaffName: null,
    sessionId: null,
    handledByStaffId: null,
    handledAt: null,
    response: null,
    createdAt: '2026-09-13T05:57:00.000Z',
  },
  {
    feedbackId: 'fb-2',
    memberId: '101',
    feedbackType: 'staff' as const,
    content: 'HLV hướng dẫn rất nhiệt tình và chu đáo trong buổi tập.',
    rating: 5,
    tags: ['NhiệtTình', 'ĐúngGiờ'],
    isAnonymous: false,
    imageUrls: [],
    severity: 'low' as const,
    status: 'resolved' as const,
    subjectRoomId: null,
    subjectRoomName: null,
    subjectEquipmentId: null,
    subjectEquipmentName: null,
    subjectStaffId: 'staff-1',
    subjectStaffName: 'Tran Quang Minh',
    sessionId: null,
    handledByStaffId: 'staff-9',
    handledAt: '2026-09-13T07:00:00.000Z',
    response: 'Cảm ơn bạn đã phản hồi tốt về HLV Minh!',
    createdAt: '2026-09-12T10:00:00.000Z',
  },
]

describe('MyFeedbackPage', () => {
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
    vi.mocked(feedbackService.list).mockResolvedValue({
      data: mockFeedbacks,
      total: 2,
    })
    await i18n.changeLanguage('vi')
  })

  it('renders cards with 5-layer layout: subject info, star score, status, and content bubble', async () => {
    render(
      <MemoryRouter>
        <MyFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      // Check subject titles
      expect(screen.getByText('Phong Cardio')).toBeDefined()
      expect(screen.getByText('May Chay Bo Life Fitness #1')).toBeDefined()
      expect(screen.getByText('HLV: Tran Quang Minh')).toBeDefined()
    })

    // Check star rating pills
    expect(screen.getByText('3/5')).toBeDefined()
    expect(screen.getByText('5/5')).toBeDefined()

    // Check status badges
    expect(screen.getAllByText('Chờ xử lý').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Đã ghi nhận').length).toBeGreaterThanOrEqual(1)

    // Check content text
    expect(
      screen.getByText(/Phòng tập rất sạch sẽ, nhưng máy chạy bộ số 1/i)
    ).toBeDefined()

    // Check tags
    expect(screen.getByText('PhòngQuáNóng')).toBeDefined()
    expect(screen.getByText('MáyHỏng')).toBeDefined()

    // Check anonymous badge
    expect(screen.getByText(/ẩn danh/i)).toBeDefined()

    // Check admin response block
    expect(screen.getByText(/Phản hồi từ ban quản lý:/i)).toBeDefined()
    expect(screen.getByText('Cảm ơn bạn đã phản hồi tốt về HLV Minh!')).toBeDefined()
  })

  it('opens delete confirmation dialog and handles deletion when confirmed', async () => {
    const user = userEvent.setup()
    vi.mocked(feedbackService.delete).mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <MyFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Phong Cardio')).toBeDefined()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /xóa/i })
    expect(deleteButtons.length).toBeGreaterThan(0)

    // Click first delete button
    await user.click(deleteButtons[0])

    // Verify ConfirmDialog appears
    await waitFor(() => {
      expect(screen.getByText(/xóa phản hồi này\? hành động không thể hoàn tác/i)).toBeDefined()
    })

    // Confirm delete inside dialog
    const dialog = screen.getByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: 'Xóa' })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(feedbackService.delete).toHaveBeenCalledWith('fb-1')
    })
  })

  it('renders all feedback details in Japanese when language is switched to ja', async () => {
    await i18n.changeLanguage('ja')

    render(
      <MemoryRouter>
        <MyFeedbackPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('フィードバック')).toBeDefined()
      expect(screen.getByText('マイフィードバック')).toBeDefined()
      expect(screen.getByText('新しいフィードバックを送信')).toBeDefined()
    })

    // Trainer prefix in Japanese
    expect(screen.getByText('トレーナー: Tran Quang Minh')).toBeDefined()

    // Status badges in Japanese
    expect(screen.getAllByText('未処理').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('解決済み').length).toBeGreaterThanOrEqual(1)

    // Localized quick tags in Japanese
    expect(screen.getByText('室温が高すぎる')).toBeDefined()
    expect(screen.getByText('マシンの故障')).toBeDefined()

    // Anonymous badge in Japanese
    expect(screen.getByText('匿名')).toBeDefined()

    // Admin response heading in Japanese
    expect(screen.getByText(/運営からの返信:/i)).toBeDefined()
  })
})
