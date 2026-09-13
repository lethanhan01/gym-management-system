import { beforeEach, describe, expect, it, vi } from 'vitest'
import chatService from '@/services/chat.service'
import { useAuthStore } from './authStore'
import { useChatStore } from './chat.store'
import type { ChatMessage, ConversationSummary, MessagesListResponse } from '@/@types/chat'

// Mock chat.service
vi.mock('@/services/chat.service', () => ({
  default: {
    connect: vi.fn(() => ({ connected: true })),
    disconnect: vi.fn(),
    getConversations: vi.fn(),
    getActiveConversation: vi.fn(),
    getMessages: vi.fn(),
    uploadAttachment: vi.fn(),
    deleteMessage: vi.fn(),
    markAsRead: vi.fn(),
    joinConversation: vi.fn().mockResolvedValue({ success: true }),
    leaveConversation: vi.fn().mockResolvedValue({ success: true }),
    sendMessage: vi.fn(),
    sendTypingStart: vi.fn(),
    sendTypingStop: vi.fn(),
    markSeen: vi.fn().mockResolvedValue({ success: true }),
    deleteMessageViaSocket: vi.fn().mockResolvedValue({ success: true }),
    onConnect: vi.fn(() => () => {}),
    onDisconnect: vi.fn(() => () => {}),
    onNewMessage: vi.fn(() => () => {}),
    onUserTyping: vi.fn(() => () => {}),
    onUserStopTyping: vi.fn(() => () => {}),
    onMessagesSeen: vi.fn(() => () => {}),
    onMessageDeleted: vi.fn(() => () => {}),
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

describe('chat.store (Zustand)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.getState().clear()
    useAuthStore.setState({
      user: {
        userId: '5',
        email: 'member@test.com',
        fullName: 'Member Nguyen',
        roles: ['member'],
      },
      token: 'jwt-token-123',
      isAuthenticated: true,
      hasHydrated: true,
    })
  })

  it('initSocket and cleanupSocket manage socket connection lifecycle', () => {
    useChatStore.getState().initSocket('token-abc')
    expect(chatService.connect).toHaveBeenCalledWith('token-abc')

    useChatStore.getState().cleanupSocket()
    expect(chatService.disconnect).toHaveBeenCalled()
    expect(useChatStore.getState().isConnected).toBe(false)
  })

  it('fetchConversations updates conversations and calculates unreadTotal', async () => {
    const mockConversations: ConversationSummary[] = [
      {
        conversationId: '1',
        status: 'active',
        participant: { userId: '10', fullName: 'Trainer A', avatarUrl: null, role: 'trainer' },
        lastMessageContent: 'Bài tập hôm nay',
        lastMessageAt: '2026-09-13T20:00:00.000Z',
        unreadCount: 2,
        createdAt: '2026-09-13T19:00:00.000Z',
        updatedAt: '2026-09-13T20:00:00.000Z',
      },
      {
        conversationId: '2',
        status: 'active',
        participant: { userId: '11', fullName: 'Trainer B', avatarUrl: null, role: 'trainer' },
        lastMessageContent: 'Chào bạn',
        lastMessageAt: '2026-09-13T19:30:00.000Z',
        unreadCount: 3,
        createdAt: '2026-09-13T19:00:00.000Z',
        updatedAt: '2026-09-13T19:30:00.000Z',
      },
    ]

    vi.mocked(chatService.getConversations).mockResolvedValueOnce(mockConversations)

    await useChatStore.getState().fetchConversations()

    expect(useChatStore.getState().conversations).toEqual(mockConversations)
    expect(useChatStore.getState().unreadTotal).toBe(5)
  })

  it('setActiveConversation joins room, marks seen and loads initial messages', async () => {
    const mockMessagesRes: MessagesListResponse = {
      messages: [
        {
          messageId: '101',
          conversationId: '1',
          senderUserId: '10',
          senderName: 'Trainer A',
          senderAvatarUrl: null,
          isSender: false,
          messageType: 'text',
          content: 'Hello Member',
          attachmentUrl: null,
          createdAt: '2026-09-13T20:00:00.000Z',
        },
      ],
      nextCursor: '100',
      hasMore: true,
    }

    vi.mocked(chatService.getMessages).mockResolvedValueOnce(mockMessagesRes)

    await useChatStore.getState().setActiveConversation('1')

    expect(chatService.joinConversation).toHaveBeenCalledWith('1')
    expect(chatService.markSeen).toHaveBeenCalledWith('1')
    expect(useChatStore.getState().activeConversationId).toBe('1')
    expect(useChatStore.getState().messagesByConversation['1']).toEqual(mockMessagesRes.messages)
    expect(useChatStore.getState().hasMoreByConversation['1']).toBe(true)
  })

  it('loadMoreMessages prepends older messages without duplicates', async () => {
    // Initial messages
    useChatStore.setState({
      messagesByConversation: {
        '1': [
          {
            messageId: '102',
            conversationId: '1',
            senderUserId: '5',
            senderName: 'Member',
            senderAvatarUrl: null,
            isSender: true,
            messageType: 'text',
            content: 'Tin mới',
            attachmentUrl: null,
            createdAt: '2026-09-13T20:02:00.000Z',
          },
        ],
      },
      nextCursorByConversation: { '1': '101' },
      hasMoreByConversation: { '1': true },
    })

    const mockOlderMessages: MessagesListResponse = {
      messages: [
        {
          messageId: '101',
          conversationId: '1',
          senderUserId: '10',
          senderName: 'Trainer',
          senderAvatarUrl: null,
          isSender: false,
          messageType: 'text',
          content: 'Tin cũ hơn',
          attachmentUrl: null,
          createdAt: '2026-09-13T20:00:00.000Z',
        },
      ],
      nextCursor: null,
      hasMore: false,
    }

    vi.mocked(chatService.getMessages).mockResolvedValueOnce(mockOlderMessages)

    await useChatStore.getState().loadMoreMessages('1')

    const currentMsgs = useChatStore.getState().messagesByConversation['1']
    expect(currentMsgs).toHaveLength(2)
    expect(currentMsgs[0].messageId).toBe('101')
    expect(currentMsgs[1].messageId).toBe('102')
    expect(useChatStore.getState().hasMoreByConversation['1']).toBe(false)
  })

  it('sendMessage adds optimistic message and replaces with confirmed message on ACK', async () => {
    const mockConfirmedMsg: ChatMessage = {
      messageId: '999',
      conversationId: '1',
      senderUserId: '5',
      senderName: 'Member Nguyen',
      senderAvatarUrl: null,
      isSender: true,
      messageType: 'text',
      content: 'Tin nhắn gửi test',
      attachmentUrl: null,
      createdAt: '2026-09-13T20:10:00.000Z',
    }

    vi.mocked(chatService.sendMessage).mockResolvedValueOnce({
      success: true,
      data: mockConfirmedMsg,
    })

    await useChatStore.getState().sendMessage('1', 'Tin nhắn gửi test')

    const msgs = useChatStore.getState().messagesByConversation['1']
    expect(msgs).toHaveLength(1)
    expect(msgs[0].messageId).toBe('999')
    expect(msgs[0].deliveryStatus).toBe('sent')
  })

  it('sendMessage sets deliveryStatus failed on error and supports retry', async () => {
    vi.mocked(chatService.sendMessage).mockResolvedValueOnce({
      success: false,
      error: 'ERROR',
      message: 'Server bận',
    })

    await useChatStore.getState().sendMessage('1', 'Lỗi thử lại')

    let msgs = useChatStore.getState().messagesByConversation['1']
    expect(msgs[0].deliveryStatus).toBe('failed')
    const tempId = msgs[0].tempId!

    // Retry sending
    const mockSuccess: ChatMessage = {
      messageId: '1000',
      conversationId: '1',
      senderUserId: '5',
      senderName: 'Member Nguyen',
      senderAvatarUrl: null,
      isSender: true,
      messageType: 'text',
      content: 'Lỗi thử lại',
      attachmentUrl: null,
      createdAt: '2026-09-13T20:12:00.000Z',
    }

    vi.mocked(chatService.sendMessage).mockResolvedValueOnce({
      success: true,
      data: mockSuccess,
    })

    await useChatStore.getState().retrySendMessage('1', tempId)

    msgs = useChatStore.getState().messagesByConversation['1']
    expect(msgs[0].messageId).toBe('1000')
    expect(msgs[0].deliveryStatus).toBe('sent')
  })

  it('sendImage uploads attachment and updates conversation state', async () => {
    const mockFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const mockMsg: ChatMessage = {
      messageId: '1005',
      conversationId: '1',
      senderUserId: '5',
      senderName: 'Member',
      senderAvatarUrl: null,
      isSender: true,
      messageType: 'image',
      content: '[Hình ảnh]',
      attachmentUrl: '/uploads/photo.jpg',
      createdAt: '2026-09-13T20:15:00.000Z',
    }

    vi.mocked(chatService.uploadAttachment).mockResolvedValueOnce(mockMsg)

    await useChatStore.getState().sendImage('1', mockFile)

    const msgs = useChatStore.getState().messagesByConversation['1']
    expect(msgs).toHaveLength(1)
    expect(msgs[0].attachmentUrl).toBe('/uploads/photo.jpg')
  })

  it('deleteMessage deletes via socket and removes message from state', async () => {
    useChatStore.setState({
      messagesByConversation: {
        '1': [
          {
            messageId: '101',
            conversationId: '1',
            senderUserId: '5',
            senderName: 'Member',
            senderAvatarUrl: null,
            isSender: true,
            messageType: 'text',
            content: 'Tin muốn xóa',
            attachmentUrl: null,
            createdAt: '2026-09-13T20:00:00.000Z',
          },
        ],
      },
    })

    await useChatStore.getState().deleteMessage('1', '101')
    expect(chatService.deleteMessageViaSocket).toHaveBeenCalledWith('1', '101')
    expect(useChatStore.getState().messagesByConversation['1']).toHaveLength(0)
  })

  it('handleIncomingMessage increments unreadCount when message is for inactive conversation', () => {
    useChatStore.setState({
      activeConversationId: '1',
      conversations: [
        {
          conversationId: '2',
          status: 'active',
          participant: { userId: '11', fullName: 'Trainer B', avatarUrl: null, role: 'trainer' },
          lastMessageContent: 'Cũ',
          lastMessageAt: '2026-09-13T19:00:00.000Z',
          unreadCount: 0,
          createdAt: '2026-09-13T18:00:00.000Z',
          updatedAt: '2026-09-13T19:00:00.000Z',
        },
      ],
      unreadTotal: 0,
    })

    const incoming: ChatMessage = {
      messageId: '500',
      conversationId: '2',
      senderUserId: '11',
      senderName: 'Trainer B',
      senderAvatarUrl: null,
      isSender: false,
      messageType: 'text',
      content: 'Tin nhắn mới phòng 2',
      attachmentUrl: null,
      createdAt: '2026-09-13T20:20:00.000Z',
    }

    useChatStore.getState().handleIncomingMessage(incoming)

    const conv2 = useChatStore.getState().conversations.find((c) => c.conversationId === '2')
    expect(conv2?.unreadCount).toBe(1)
    expect(useChatStore.getState().unreadTotal).toBe(1)
    expect(conv2?.lastMessageContent).toBe('Tin nhắn mới phòng 2')
  })

  it('handleUserTyping and handleUserStopTyping track typing status in active room', () => {
    useChatStore.setState({ activeConversationId: '1' })

    useChatStore.getState().handleUserTyping({
      conversationId: '1',
      userId: '10',
      fullName: 'Trainer A',
    })

    expect(useChatStore.getState().typingUsers['1']?.['10']?.fullName).toBe('Trainer A')

    useChatStore.getState().handleUserStopTyping({
      conversationId: '1',
      userId: '10',
    })

    expect(useChatStore.getState().typingUsers['1']?.['10']).toBeUndefined()
  })

  it('toggleFloating, openFloating, closeFloating control widget visibility', () => {
    expect(useChatStore.getState().isFloatingOpen).toBe(false)

    useChatStore.getState().toggleFloating()
    expect(useChatStore.getState().isFloatingOpen).toBe(true)

    useChatStore.getState().openFloating('2')
    expect(useChatStore.getState().isFloatingOpen).toBe(true)
    expect(useChatStore.getState().floatingConversationId).toBe('2')

    useChatStore.getState().closeFloating()
    expect(useChatStore.getState().isFloatingOpen).toBe(false)
  })
})
