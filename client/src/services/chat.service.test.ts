import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import chatService from './chat.service'
import type { ChatMessage, ConversationSummary, MessagesListResponse } from '@/@types/chat'

// Mock axios api
vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock socket.io-client
const mockSocket = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chatService.disconnect()
  })

  describe('REST API Methods', () => {
    it('getConversations fetches conversations list', async () => {
      const mockConversations: ConversationSummary[] = [
        {
          conversationId: '1',
          status: 'active',
          participant: {
            userId: '10',
            fullName: 'HLV Nguyen Van A',
            avatarUrl: null,
            role: 'trainer',
          },
          lastMessageContent: 'Chào bạn',
          lastMessageAt: '2026-09-13T20:00:00.000Z',
          unreadCount: 1,
          createdAt: '2026-09-13T19:00:00.000Z',
          updatedAt: '2026-09-13T20:00:00.000Z',
        },
      ]

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, data: { conversations: mockConversations } },
      })

      const res = await chatService.getConversations()
      expect(api.get).toHaveBeenCalledWith('/chat/conversations')
      expect(res).toEqual(mockConversations)
    })

    it('getActiveConversation fetches active member conversation', async () => {
      const mockActiveConv: ConversationSummary = {
        conversationId: '1',
        status: 'active',
        participant: {
          userId: '10',
          fullName: 'HLV Nguyen Van A',
          avatarUrl: null,
          role: 'trainer',
        },
        lastMessageContent: 'Chào bạn',
        lastMessageAt: '2026-09-13T20:00:00.000Z',
        unreadCount: 0,
        createdAt: '2026-09-13T19:00:00.000Z',
        updatedAt: '2026-09-13T20:00:00.000Z',
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, data: { conversation: mockActiveConv } },
      })

      const res = await chatService.getActiveConversation()
      expect(api.get).toHaveBeenCalledWith('/chat/conversations/active')
      expect(res).toEqual(mockActiveConv)
    })

    it('getMessages fetches message history with cursor pagination', async () => {
      const mockList: MessagesListResponse = {
        messages: [
          {
            messageId: '101',
            conversationId: '1',
            senderUserId: '10',
            senderName: 'HLV A',
            senderAvatarUrl: null,
            isSender: false,
            messageType: 'text',
            content: 'Hello',
            attachmentUrl: null,
            createdAt: '2026-09-13T20:00:00.000Z',
          },
        ],
        nextCursor: '100',
        hasMore: true,
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, data: mockList },
      })

      const res = await chatService.getMessages('1', '105', 20)
      expect(api.get).toHaveBeenCalledWith('/chat/conversations/1/messages', {
        params: { cursor: '105', limit: 20 },
      })
      expect(res).toEqual(mockList)
    })

    it('uploadAttachment uploads file and returns message', async () => {
      const mockFile = new File(['dummy'], 'meal.jpg', { type: 'image/jpeg' })
      const mockUploadedMsg: ChatMessage = {
        messageId: '102',
        conversationId: '1',
        senderUserId: '5',
        senderName: 'Member B',
        senderAvatarUrl: null,
        isSender: true,
        messageType: 'image',
        content: '[Hình ảnh]',
        attachmentUrl: '/uploads/chat/meal.jpg',
        createdAt: '2026-09-13T20:05:00.000Z',
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, data: { message: mockUploadedMsg } },
      })

      const res = await chatService.uploadAttachment('1', mockFile)
      expect(api.post).toHaveBeenCalledWith(
        '/chat/conversations/1/upload',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
      )
      expect(res).toEqual(mockUploadedMsg)
    })

    it('deleteMessage sends DELETE request', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({
        data: { success: true, data: { messageId: '102' } },
      })

      const res = await chatService.deleteMessage('102')
      expect(api.delete).toHaveBeenCalledWith('/chat/messages/102')
      expect(res).toBe(true)
    })

    it('markAsRead sends POST request to read endpoint', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, data: { conversationId: '1', readAt: '2026-09-13T20:10:00.000Z' } },
      })

      const res = await chatService.markAsRead('1')
      expect(api.post).toHaveBeenCalledWith('/chat/conversations/1/read')
      expect(res.conversationId).toBe('1')
    })
  })

  describe('WebSocket Socket Manager', () => {
    it('connect initializes socket instance with token in auth', () => {
      const socket = chatService.connect('my-jwt-token')
      expect(socket).toBeDefined()
      expect(chatService.getSocket()).toBe(socket)
    })

    it('disconnect cleans up socket instance', () => {
      chatService.connect('my-jwt-token')
      chatService.disconnect()
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockSocket.removeAllListeners).toHaveBeenCalled()
      expect(chatService.getSocket()).toBeNull()
    })

    it('joinConversation emits join_conversation with ACK', async () => {
      chatService.connect('my-jwt-token')

      mockSocket.emit.mockImplementationOnce((event, _payload, ack) => {
        if (event === 'join_conversation') {
          ack({ success: true, data: { conversationId: '1' } })
        }
      })

      const res = await chatService.joinConversation('1')
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join_conversation',
        { conversationId: '1' },
        expect.any(Function)
      )
      expect(res.success).toBe(true)
    })

    it('leaveConversation emits leave_conversation', async () => {
      chatService.connect('my-jwt-token')

      mockSocket.emit.mockImplementationOnce((event, _payload, ack) => {
        if (event === 'leave_conversation') {
          ack({ success: true })
        }
      })

      const res = await chatService.leaveConversation('1')
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'leave_conversation',
        { conversationId: '1' },
        expect.any(Function)
      )
      expect(res.success).toBe(true)
    })

    it('sendMessage emits send_message and receives ACK with message data', async () => {
      chatService.connect('my-jwt-token')

      const mockMsg: ChatMessage = {
        messageId: '103',
        conversationId: '1',
        senderUserId: '5',
        senderName: 'Member B',
        senderAvatarUrl: null,
        isSender: true,
        messageType: 'text',
        content: 'Xin chào HLV',
        attachmentUrl: null,
        createdAt: '2026-09-13T20:15:00.000Z',
      }

      mockSocket.emit.mockImplementationOnce((event, _payload, ack) => {
        if (event === 'send_message') {
          ack({ success: true, data: mockMsg })
        }
      })

      const res = await chatService.sendMessage('1', 'Xin chào HLV')
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'send_message',
        { conversationId: '1', content: 'Xin chào HLV' },
        expect.any(Function)
      )
      expect(res.success).toBe(true)
      expect(res.data).toEqual(mockMsg)
    })

    it('sendTypingStart and sendTypingStop emit events', () => {
      chatService.connect('my-jwt-token')
      chatService.sendTypingStart('1')
      expect(mockSocket.emit).toHaveBeenCalledWith('typing_start', { conversationId: '1' })

      chatService.sendTypingStop('1')
      expect(mockSocket.emit).toHaveBeenCalledWith('typing_stop', { conversationId: '1' })
    })

    it('markSeen emits mark_seen with ACK', async () => {
      chatService.connect('my-jwt-token')

      mockSocket.emit.mockImplementationOnce((event, _payload, ack) => {
        if (event === 'mark_seen') {
          ack({ success: true, data: { conversationId: '1' } })
        }
      })

      const res = await chatService.markSeen('1')
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'mark_seen',
        { conversationId: '1' },
        expect.any(Function)
      )
      expect(res.success).toBe(true)
    })

    it('deleteMessageViaSocket emits delete_message with ACK', async () => {
      chatService.connect('my-jwt-token')

      mockSocket.emit.mockImplementationOnce((event, _payload, ack) => {
        if (event === 'delete_message') {
          ack({ success: true, data: { messageId: '103' } })
        }
      })

      const res = await chatService.deleteMessageViaSocket('1', '103')
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'delete_message',
        { conversationId: '1', messageId: '103' },
        expect.any(Function)
      )
      expect(res.success).toBe(true)
    })

    it('registers and unregisters realtime event callbacks', () => {
      chatService.connect('my-jwt-token')

      const cbNewMsg = vi.fn()
      const unsubscribe = chatService.onNewMessage(cbNewMsg)
      expect(mockSocket.on).toHaveBeenCalledWith('new_message', cbNewMsg)

      unsubscribe()
      expect(mockSocket.off).toHaveBeenCalledWith('new_message', cbNewMsg)
    })
  })
})
