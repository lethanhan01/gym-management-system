import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FloatingChatWidget } from './FloatingChatWidget'
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

describe('FloatingChatWidget Component', () => {
  const mockTrainerConversation: ConversationSummary = {
    conversationId: 'conv-pt-1',
    status: 'active',
    participant: {
      userId: 'user-pt',
      fullName: 'HLV Lê Văn C',
      avatarUrl: null,
      role: 'trainer',
    },
    lastMessageContent: 'Chào bạn',
    lastMessageAt: '2026-09-13T10:00:00.000Z',
    unreadCount: 2,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()

    // Reset stores
    useAuthStore.setState({
      user: {
        userId: 'user-mem-1',
        email: 'member@example.com',
        fullName: 'Hội viên A',
        roles: ['member'],
      },
      token: 'valid-token',
      isAuthenticated: true,
    })

    useChatStore.setState({
      isFloatingOpen: false,
      conversations: [mockTrainerConversation],
      activeConversationId: 'conv-pt-1',
      unreadTotal: 2,
      messagesByConversation: {
        'conv-pt-1': [],
      },
      hasMoreByConversation: {},
      typingUsers: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isUploading: false,
    })
  })

  it('renders floating bubble trigger button with unread badge', () => {
    render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    )

    const trigger = screen.getByLabelText(/mở khung trò chuyện/i)
    expect(trigger).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('opens popup card when floating trigger is clicked', async () => {
    render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    )

    const trigger = screen.getByLabelText(/mở khung trò chuyện/i)
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByTestId('floating-chat-card')).toBeInTheDocument()
      expect(screen.getByText('HLV Lê Văn C')).toBeInTheDocument()
    })
  })

  it('navigates to /member/chat when expand button is clicked', async () => {
    useChatStore.setState({ isFloatingOpen: true })

    render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    )

    const expandBtn = screen.getByLabelText(/mở toàn màn hình/i)
    fireEvent.click(expandBtn)

    expect(mockedNavigate).toHaveBeenCalledWith('/member/chat')
    expect(useChatStore.getState().isFloatingOpen).toBe(false)
  })

  it('closes popup card when close button (X) is clicked', () => {
    useChatStore.setState({ isFloatingOpen: true })

    render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    )

    const closeBtn = screen.getByLabelText(/đóng/i)
    fireEvent.click(closeBtn)

    expect(useChatStore.getState().isFloatingOpen).toBe(false)
  })

  it('renders trainer list view when role is trainer', async () => {
    useAuthStore.setState({
      user: {
        userId: 'user-pt',
        email: 'trainer@example.com',
        fullName: 'HLV Lê Văn C',
        roles: ['trainer'],
      },
      token: 'valid-token',
      isAuthenticated: true,
    })

    useChatStore.setState({
      isFloatingOpen: true,
      conversations: [
        {
          ...mockTrainerConversation,
          participant: {
            userId: 'user-mem-1',
            fullName: 'Học viên Nguyễn Văn X',
            avatarUrl: null,
            role: 'member',
          },
        },
      ],
      activeConversationId: null,
    })

    render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    )

    expect(screen.getByText('Tin nhắn học viên')).toBeInTheDocument()
    expect(screen.getByText('Học viên Nguyễn Văn X')).toBeInTheDocument()
  })

  it('does not render when user is not authenticated', () => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })

    render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    )

    expect(screen.queryByLabelText(/mở khung trò chuyện/i)).not.toBeInTheDocument()
  })
})
