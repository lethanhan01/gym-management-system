import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ChatWindow } from './ChatWindow'
import type { ChatMessage, ConversationSummary } from '@/@types/chat'

describe('ChatWindow Component', () => {
  const mockConversation: ConversationSummary = {
    conversationId: 'conv-1',
    status: 'active',
    participant: {
      userId: 'user-trainer',
      fullName: 'HLV Nguyễn Văn A',
      avatarUrl: 'https://example.com/trainer.png',
      role: 'trainer',
    },
    lastMessageContent: 'Chào bạn',
    lastMessageAt: '2026-09-13T10:00:00.000Z',
    unreadCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  }

  const mockMessages: ChatMessage[] = [
    {
      messageId: 'msg-1',
      conversationId: 'conv-1',
      senderUserId: 'user-trainer',
      senderName: 'HLV Nguyễn Văn A',
      senderAvatarUrl: 'https://example.com/trainer.png',
      isSender: false,
      messageType: 'text',
      content: 'Chào bạn, hôm nay bạn tập ngực nhé!',
      attachmentUrl: null,
      createdAt: '2026-09-13T09:00:00.000Z',
      deliveryStatus: 'sent',
    },
    {
      messageId: 'msg-2',
      conversationId: 'conv-1',
      senderUserId: 'user-member',
      senderName: 'Hội viên Trần B',
      senderAvatarUrl: null,
      isSender: true,
      messageType: 'text',
      content: 'Vâng ạ, em đang khởi động rồi.',
      attachmentUrl: null,
      createdAt: '2026-09-13T09:05:00.000Z',
      deliveryStatus: 'sent',
    },
    {
      messageId: 'msg-3',
      conversationId: 'conv-1',
      senderUserId: 'user-member',
      senderName: 'Hội viên Trần B',
      senderAvatarUrl: null,
      isSender: true,
      messageType: 'image',
      content: '[Hình ảnh]',
      attachmentUrl: 'https://example.com/meal.png',
      createdAt: '2026-09-13T09:10:00.000Z',
      deliveryStatus: 'sent',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('TC-CW-01: renders empty selection state when conversation is null', () => {
    render(
      <ChatWindow
        conversation={null}
        messages={[]}
        currentUserId="user-member"
      />
    )

    expect(screen.getByRole('heading', { name: /chọn/i })).toBeInTheDocument()
  })

  it('TC-CW-02: renders empty messages state when messages list is empty', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={[]}
        currentUserId="user-member"
      />
    )

    expect(screen.getByText(/chưa có tin nhắn/i)).toBeInTheDocument()
  })

  it('TC-CW-03: renders messages and participant information properly', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user-member"
      />
    )

    expect(screen.getByText('Chào bạn, hôm nay bạn tập ngực nhé!')).toBeInTheDocument()
    expect(screen.getByText('Vâng ạ, em đang khởi động rồi.')).toBeInTheDocument()
    expect(screen.getByAltText('Đính kèm')).toBeInTheDocument()
  })

  it('TC-CW-04: opens image preview modal when image message is clicked', async () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user-member"
      />
    )

    const img = screen.getByAltText('Đính kèm')
    fireEvent.click(img)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /tải ảnh về/i })).toBeInTheDocument()
    })
  })

  it('TC-CW-05: handles unsend message flow with ConfirmDialog (Open, Cancel, Confirm)', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user-member"
        onDeleteMessage={onDelete}
      />
    )

    // Option buttons are only on user's own messages
    const optionButtons = screen.getAllByLabelText(/tùy chọn tin nhắn/i)
    expect(optionButtons.length).toBeGreaterThanOrEqual(1)

    // Trigger opening dropdown with Enter keydown (Radix Dropdown trigger)
    fireEvent.keyDown(optionButtons[0], { key: 'Enter', code: 'Enter' })

    // Dropdown menu item "Thu hồi tin nhắn"
    const deleteMenuItem = await screen.findByText(/thu hồi tin nhắn/i)
    expect(deleteMenuItem).toBeInTheDocument()
    fireEvent.click(deleteMenuItem)

    // Confirm dialog should appear
    expect(screen.getByText(/thu hồi tin nhắn này\?/i)).toBeInTheDocument()

    // Test cancel
    const cancelBtn = screen.getByRole('button', { name: /hủy/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText(/thu hồi tin nhắn này\?/i)).not.toBeInTheDocument()
    })
    expect(onDelete).not.toHaveBeenCalled()

    // Open again and confirm
    fireEvent.keyDown(optionButtons[0], { key: 'Enter', code: 'Enter' })
    const deleteMenuItem2 = await screen.findByText(/thu hồi tin nhắn/i)
    fireEvent.click(deleteMenuItem2)

    const confirmBtn = screen.getByRole('button', { name: /^thu hồi$/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled()
    })
  })

  it('TC-CW-06: does not show unsend option for messages from other users', () => {
    const onlyOtherUserMessages: ChatMessage[] = [
      {
        messageId: 'msg-trainer-1',
        conversationId: 'conv-1',
        senderUserId: 'user-trainer',
        senderName: 'HLV Nguyễn Văn A',
        senderAvatarUrl: null,
        isSender: false,
        messageType: 'text',
        content: 'Chào bạn!',
        attachmentUrl: null,
        createdAt: '2026-09-13T09:00:00.000Z',
        deliveryStatus: 'sent',
      },
    ]

    render(
      <ChatWindow
        conversation={mockConversation}
        messages={onlyOtherUserMessages}
        currentUserId="user-member"
      />
    )

    expect(screen.queryByLabelText(/tùy chọn tin nhắn/i)).not.toBeInTheDocument()
  })

  it('TC-CW-07: renders typing indicator when another user is typing', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user-member"
        typingUsers={{
          'user-trainer': { fullName: 'HLV Nguyễn Văn A', timestamp: Date.now() },
        }}
      />
    )

    expect(screen.getByText(/đang nhập/i)).toBeInTheDocument()
    expect(screen.getAllByText('HLV Nguyễn Văn A').length).toBeGreaterThanOrEqual(1)
  })

  it('TC-CW-08: renders archived notice banner when conversation is archived', () => {
    const archivedConv: ConversationSummary = {
      ...mockConversation,
      status: 'archived',
    }

    render(
      <ChatWindow
        conversation={archivedConv}
        messages={mockMessages}
        currentUserId="user-member"
      />
    )

    expect(screen.getByText(/lưu trữ/i)).toBeInTheDocument()
  })

  it('TC-CW-09: renders retry button on failed messages and calls onRetryMessage', () => {
    const failedMsg: ChatMessage = {
      messageId: 'temp-123',
      tempId: 'temp-123',
      conversationId: 'conv-1',
      senderUserId: 'user-member',
      senderName: 'Hội viên Trần B',
      senderAvatarUrl: null,
      isSender: true,
      messageType: 'text',
      content: 'Tin nhắn lỗi kết nối',
      attachmentUrl: null,
      createdAt: '2026-09-13T09:20:00.000Z',
      deliveryStatus: 'failed',
    }

    const onRetry = vi.fn().mockResolvedValue(undefined)

    render(
      <ChatWindow
        conversation={mockConversation}
        messages={[...mockMessages, failedMsg]}
        currentUserId="user-member"
        onRetryMessage={onRetry}
      />
    )

    expect(screen.getByText('Tin nhắn lỗi kết nối')).toBeInTheDocument()
    const retryBtn = screen.getByTitle(/thử lại/i)
    expect(retryBtn).toBeInTheDocument()

    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledWith('temp-123')
  })

  it('TC-CW-10: handles load more older messages button click', () => {
    const onLoadMore = vi.fn()

    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId="user-member"
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    )

    const loadMoreBtn = screen.getByRole('button', { name: /tải thêm tin nhắn cũ/i })
    expect(loadMoreBtn).toBeInTheDocument()

    fireEvent.click(loadMoreBtn)
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})
