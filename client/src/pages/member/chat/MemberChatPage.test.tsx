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
      fetchActiveMemberConversation: vi.fn().mockResolvedValue(mockActiveConversation),
    })
  })

  it('renders active primary trainer chat interface', () => {
    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    expect(screen.getByText('HLV Trần Văn Nam')).toBeInTheDocument()
    expect(screen.getByText('HLV chính')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/nhập tin nhắn/i)).toBeInTheDocument()
  })

  it('renders empty state when member has no trainer', () => {
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
    })

    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/bạn chưa có huấn luyện viên chính/i)).toBeInTheDocument()
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

  it('navigates to choose trainer page when "Đổi HLV" is clicked', () => {
    render(
      <MemoryRouter>
        <MemberChatPage />
      </MemoryRouter>
    )

    const changePtBtn = screen.getByRole('button', { name: /đổi hlv/i })
    fireEvent.click(changePtBtn)

    expect(mockedNavigate).toHaveBeenCalledWith('/member/choose-trainer')
  })
})
