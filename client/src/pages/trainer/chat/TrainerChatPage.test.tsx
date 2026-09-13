import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import TrainerChatPage from './TrainerChatPage'
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

describe('TrainerChatPage Component', () => {
  const mockStudent1: ConversationSummary = {
    conversationId: 'conv-stu-1',
    status: 'active',
    participant: {
      userId: 'user-stu-1',
      fullName: 'Học viên Nguyễn Văn An',
      avatarUrl: null,
      role: 'member',
      memberId: 'mem-101',
    },
    lastMessageContent: 'Em đã hoàn thành 4 hiệp squat rồi ạ',
    lastMessageAt: '2026-09-13T10:00:00.000Z',
    unreadCount: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  }

  const mockStudent2: ConversationSummary = {
    conversationId: 'conv-stu-2',
    status: 'active',
    participant: {
      userId: 'user-stu-2',
      fullName: 'Học viên Lê Bảo Bình',
      avatarUrl: null,
      role: 'member',
      memberId: 'mem-102',
      memberCode: 'MB-102',
    },
    lastMessageContent: 'Thầy cho em hỏi lịch tập mai',
    lastMessageAt: '2026-09-12T15:00:00.000Z',
    unreadCount: 0,
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-12T15:00:00.000Z',
  }

  const mockStudent3: ConversationSummary = {
    conversationId: 'conv-stu-3',
    status: 'active',
    participant: {
      userId: 'user-stu-3',
      fullName: 'Học viên Mới Chưa Nhắn',
      avatarUrl: null,
      role: 'member',
      memberId: 'mem-103',
      memberCode: 'MB-999',
    },
    lastMessageContent: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()

    useAuthStore.setState({
      user: {
        userId: 'pt-1',
        email: 'trainer@example.com',
        fullName: 'HLV Trần Nam',
        roles: ['trainer'],
      },
      token: 'jwt-token',
      isAuthenticated: true,
    })

    useChatStore.setState({
      conversations: [mockStudent1, mockStudent2, mockStudent3],
      activeConversationId: 'conv-stu-1',
      messagesByConversation: {
        'conv-stu-1': [],
        'conv-stu-2': [],
        'conv-stu-3': [],
      },
      hasMoreByConversation: {},
      typingUsers: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isUploading: false,
      fetchConversations: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('renders student list and selected student chat', () => {
    render(
      <MemoryRouter>
        <TrainerChatPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Tin nhắn học viên')).toBeInTheDocument()
    expect(screen.getAllByText('Học viên Nguyễn Văn An').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Học viên Lê Bảo Bình')).toBeInTheDocument()
    expect(screen.getByText('Học viên Mới Chưa Nhắn')).toBeInTheDocument()
    expect(screen.getByText('Mới')).toBeInTheDocument()
    expect(screen.getByText('Chưa có tin nhắn')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/tìm/i)).toBeInTheDocument()
  })

  it('filters student list by search input with student name or memberCode', async () => {
    render(
      <MemoryRouter>
        <TrainerChatPage />
      </MemoryRouter>
    )

    const searchInput = screen.getByPlaceholderText(/tìm/i)
    fireEvent.change(searchInput, { target: { value: 'MB-999' } })

    await waitFor(() => {
      expect(screen.getByText('Học viên Mới Chưa Nhắn')).toBeInTheDocument()
      expect(screen.queryByText('Học viên Lê Bảo Bình')).not.toBeInTheDocument()
    })
  })

  it('switches conversation when another student is clicked', async () => {
    render(
      <MemoryRouter>
        <TrainerChatPage />
      </MemoryRouter>
    )

    const student2Btn = screen.getByText('Học viên Lê Bảo Bình')
    fireEvent.click(student2Btn)

    await waitFor(() => {
      expect(useChatStore.getState().activeConversationId).toBe('conv-stu-2')
    })
  })

  it('navigates to student detail profile when "Hồ sơ học viên" is clicked', () => {
    render(
      <MemoryRouter>
        <TrainerChatPage />
      </MemoryRouter>
    )

    const profileBtn = screen.getByRole('button', { name: /hồ sơ học viên/i })
    fireEvent.click(profileBtn)

    expect(mockedNavigate).toHaveBeenCalledWith('/trainer/students/mem-101')
  })
})
