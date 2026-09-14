import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MemberChatPage from './MemberChatPage'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chat.store'
import type { ConversationSummary } from '@/@types/chat'

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

vi.mock('@/services/member.service', () => ({
  memberService: {
    getTrainerReviews: vi.fn().mockResolvedValue({
      trainer: {
        staffId: 'pt-staff-1',
        staffCode: 'ST001',
        fullName: 'HLV Trần Văn Nam',
        position: 'trainer',
        specialty: 'Tăng cơ & Giảm mỡ',
      },
      stats: { ratingAverage: null, totalReviews: 0, ratingCounts: {}, topTags: [] },
      pagination: { page: 1, pageSize: 5, totalReviews: 0, totalPages: 0, hasMore: false },
      reviews: [],
    }),
  },
}))

describe('MemberChatPage Component', () => {
  const mockActiveConversation: ConversationSummary = {
    conversationId: 'conv-active-1',
    status: 'active',
    participant: {
      userId: 'pt-1',
      fullName: 'HLV Trần Văn Nam',
      avatarUrl: null,
      role: 'trainer',
      specialty: 'Tăng cơ & Giảm mỡ',
      staffId: 'pt-staff-1',
    },
    lastMessageContent: 'Chào bạn, hôm nay tập chân nhé',
    lastMessageAt: '2026-09-13T10:00:00.000Z',
    unreadCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  }

  const mockArchivedConversation: ConversationSummary = {
    conversationId: 'conv-archived-2',
    status: 'archived',
    participant: {
      userId: 'pt-2',
      fullName: 'HLV Nguyễn Thị Hằng',
      avatarUrl: null,
      role: 'trainer',
      specialty: 'Yoga & Pilates',
    },
    lastMessageContent: 'Bài tập tuần trước',
    lastMessageAt: '2026-08-20T10:00:00.000Z',
    unreadCount: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()

    useAuthStore.setState({
      user: {
        userId: 'mem-1',
        email: 'member@example.com',
        fullName: 'Hội viên A',
        roles: ['member'],
      },
      token: 'jwt-token',
      isAuthenticated: true,
    })

    useChatStore.setState({
      conversations: [mockActiveConversation, mockArchivedConversation],
      activeConversationId: 'conv-active-1',
      messagesByConversation: {
        'conv-active-1': [],
        'conv-archived-2': [],
      },
      hasMoreByConversation: {},
      typingUsers: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isUploading: false,
      memberChatEligibility: 'READY',
      fetchConversations: vi.fn().mockResolvedValue(undefined),
      fetchActiveMemberConversation: vi.fn().mockResolvedValue(mockActiveConversation),
    })
  })

  it('renders active primary trainer chat interface when READY', async () => {
    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('HLV Trần Văn Nam')).toBeInTheDocument()
      expect(screen.getByText('HLV chính')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/nhập tin nhắn/i)).toBeInTheDocument()
    })
  })

  it('renders empty state when member has NO_ACTIVE_SUBSCRIPTION', async () => {
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      memberChatEligibility: 'NO_ACTIVE_SUBSCRIPTION',
    })

    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/bạn chưa có gói tập hoạt động/i)).toBeInTheDocument()
    })

    const subscribeBtn = screen.getByRole('button', { name: /đăng ký gói tập ngay/i })
    fireEvent.click(subscribeBtn)
    expect(mockedNavigate).toHaveBeenCalledWith('/member/subscription/setup')
  })

  it('renders empty state when member has NO_PT_PACKAGE', async () => {
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      memberChatEligibility: 'NO_PT_PACKAGE',
    })

    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/gói tập hiện tại không bao gồm huấn luyện viên/i)).toBeInTheDocument()
    })

    const upgradeBtn = screen.getByRole('button', { name: /nâng cấp gói tập có pt/i })
    fireEvent.click(upgradeBtn)
    expect(mockedNavigate).toHaveBeenCalledWith('/member/subscription/setup')
  })

  it('renders empty state when member has PT_NOT_SELECTED', async () => {
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      memberChatEligibility: 'PT_NOT_SELECTED',
    })

    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/bạn chưa chọn huấn luyện viên cá nhân/i)).toBeInTheDocument()
    })

    const chooseBtn = screen.getByRole('button', { name: /chọn huấn luyện viên ngay/i })
    fireEvent.click(chooseBtn)
    expect(mockedNavigate).toHaveBeenCalledWith('/member/choose-trainer')
  })

  it('opens past trainers drawer and switches to archived mode when clicked', async () => {
    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('HLV Trần Văn Nam')).toBeInTheDocument()
    })

    const historyBtn = screen.getByRole('button', { name: /hlv trước đây/i })
    fireEvent.click(historyBtn)

    await waitFor(() => {
      expect(screen.getByText('Lịch sử Huấn luyện viên')).toBeInTheDocument()
      expect(screen.getByText('HLV Nguyễn Thị Hằng')).toBeInTheDocument()
    })

    const pastTrainerItem = screen.getByText('HLV Nguyễn Thị Hằng')
    fireEvent.click(pastTrainerItem)

    await waitFor(() => {
      expect(screen.getByText(/chế độ chỉ đọc/i)).toBeInTheDocument()
      // ChatInput is hidden when archived
      expect(screen.queryByPlaceholderText(/nhập tin nhắn/i)).not.toBeInTheDocument()
    })
  })

  it('opens trainer profile modal and closes it via close X button in header', async () => {
    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hồ sơ & đánh giá hlv/i })).toBeInTheDocument()
    })

    const profileBtn = screen.getByRole('button', { name: /hồ sơ & đánh giá hlv/i })
    fireEvent.click(profileBtn)

    // Modal mở: kiểm tra dialog xuất hiện
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Navigate sang choose-trainer KHÔNG được gọi
    expect(mockedNavigate).not.toHaveBeenCalledWith('/member/choose-trainer')

    // Ở chế độ readOnly: KHÔNG có nút "Chọn HLV này"
    expect(screen.queryByRole('button', { name: /chọn hlv này/i })).not.toBeInTheDocument()

    // Đóng modal bằng nút đóng X ở góc trên bên phải
    const closeXBtn = screen.getByRole('button', { name: /đóng/i })
    fireEvent.click(closeXBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
