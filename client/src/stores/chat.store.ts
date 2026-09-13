import { create } from 'zustand'
import { toast } from 'sonner'
import chatService from '@/services/chat.service'
import { useAuthStore } from './authStore'
import type {
  ChatMessage,
  ConversationSummary,
  WsMessageDeletedPayload,
  WsMessagesSeenPayload,
  WsTypingPayload,
  WsUserStopTypingPayload,
} from '@/@types/chat'

/**
 * Phát âm thanh chime nhẹ (Web Audio API Synthesizer) khi có tin nhắn mới
 */
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12) // E6

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Trình duyệt có thể hạn chế autoplay audio trước user gesture đầu tiên
  }
}

interface ChatStoreState {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  messagesByConversation: Record<string, ChatMessage[]>
  nextCursorByConversation: Record<string, string | null>
  hasMoreByConversation: Record<string, boolean>
  typingUsers: Record<string, Record<string, { fullName: string; timestamp: number }>>
  unreadTotal: number

  // UI state
  isFloatingOpen: boolean
  floatingConversationId: string | null
  soundEnabled: boolean
  isConnected: boolean
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  isUploading: boolean

  // Actions
  initSocket: (token?: string) => void
  cleanupSocket: () => void
  setSoundEnabled: (enabled: boolean) => void

  fetchConversations: () => Promise<void>
  fetchActiveMemberConversation: () => Promise<ConversationSummary | null>
  setActiveConversation: (conversationId: string | null) => Promise<void>
  loadMoreMessages: (conversationId: string) => Promise<void>

  sendMessage: (conversationId: string, content: string) => Promise<void>
  retrySendMessage: (conversationId: string, tempId: string) => Promise<void>
  sendImage: (conversationId: string, file: File) => Promise<void>
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>
  markSeen: (conversationId: string) => Promise<void>
  sendTyping: (conversationId: string, isTyping: boolean) => void

  // Realtime Event Handlers
  handleIncomingMessage: (message: ChatMessage) => void
  handleMessageDeleted: (payload: WsMessageDeletedPayload) => void
  handleMessagesSeen: (payload: WsMessagesSeenPayload) => void
  handleUserTyping: (payload: WsTypingPayload) => void
  handleUserStopTyping: (payload: WsUserStopTypingPayload) => void

  // Floating widget
  toggleFloating: () => void
  openFloating: (conversationId?: string) => void
  closeFloating: () => void
  clear: () => void
}

let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribeListeners: Array<() => void> = []

export const useChatStore = create<ChatStoreState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messagesByConversation: {},
  nextCursorByConversation: {},
  hasMoreByConversation: {},
  typingUsers: {},
  unreadTotal: 0,

  isFloatingOpen: false,
  floatingConversationId: null,
  soundEnabled:
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('gym-chat-sound') === 'true'
      : false,
  isConnected: false,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isUploading: false,

  setSoundEnabled: (enabled: boolean) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gym-chat-sound', enabled ? 'true' : 'false')
    }
    set({ soundEnabled: enabled })
  },

  /**
   * Khởi tạo kết nối Socket toàn cục và đăng ký listeners
   */
  initSocket: (tokenArg?: string) => {
    const token = tokenArg || useAuthStore.getState().token
    if (!token) return

    // Giải phóng listeners cũ nếu có
    unsubscribeListeners.forEach((unsub) => unsub())
    unsubscribeListeners = []

    const socket = chatService.connect(token)

    const unsubConnect = chatService.onConnect(() => {
      set({ isConnected: true })
      // Tự động join lại active conversation room nếu có
      const activeId = get().activeConversationId
      if (activeId) {
        chatService.joinConversation(activeId)
      }
    })

    const unsubDisconnect = chatService.onDisconnect(() => {
      set({ isConnected: false })
    })

    const unsubMsg = chatService.onNewMessage((msg) => {
      get().handleIncomingMessage(msg)
    })

    const unsubTyping = chatService.onUserTyping((payload) => {
      get().handleUserTyping(payload)
    })

    const unsubStopTyping = chatService.onUserStopTyping((payload) => {
      get().handleUserStopTyping(payload)
    })

    const unsubSeen = chatService.onMessagesSeen((payload) => {
      get().handleMessagesSeen(payload)
    })

    const unsubDeleted = chatService.onMessageDeleted((payload) => {
      get().handleMessageDeleted(payload)
    })

    unsubscribeListeners = [
      unsubConnect,
      unsubDisconnect,
      unsubMsg,
      unsubTyping,
      unsubStopTyping,
      unsubSeen,
      unsubDeleted,
    ]

    set({ isConnected: socket.connected })
  },

  /**
   * Ngắt kết nối socket và dọn dẹp bộ nhớ
   */
  cleanupSocket: () => {
    unsubscribeListeners.forEach((unsub) => unsub())
    unsubscribeListeners = []
    chatService.disconnect()
    set({ isConnected: false })
  },

  /**
   * Tải danh sách cuộc trò chuyện và tính toán tổng unread
   */
  fetchConversations: async () => {
    set({ isLoadingConversations: true })
    try {
      const conversations = await chatService.getConversations()
      const unreadTotal = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
      set({ conversations, unreadTotal, isLoadingConversations: false })
    } catch {
      set({ isLoadingConversations: false })
    }
  },

  /**
   * Tìm hoặc nạp cuộc trò chuyện với PT chính hiện tại của Hội viên
   */
  fetchActiveMemberConversation: async () => {
    try {
      const conv = await chatService.getActiveConversation()
      if (conv) {
        set((state) => {
          const exists = state.conversations.some((c) => c.conversationId === conv.conversationId)
          const updated = exists
            ? state.conversations.map((c) =>
                c.conversationId === conv.conversationId ? conv : c
              )
            : [conv, ...state.conversations]
          return { conversations: updated }
        })
      }
      return conv
    } catch {
      return null
    }
  },

  /**
   * Chuyển đổi cuộc trò chuyện đang active
   */
  setActiveConversation: async (conversationId: string | null) => {
    const currentActiveId = get().activeConversationId

    // Rời room cũ nếu có
    if (currentActiveId && currentActiveId !== conversationId) {
      chatService.leaveConversation(currentActiveId)
    }

    set({ activeConversationId: conversationId })

    if (!conversationId) return

    // Tham gia room mới
    await chatService.joinConversation(conversationId)

    // Đánh dấu đã đọc
    get().markSeen(conversationId)

    // Nếu chưa có tin nhắn trong cache -> tải trang đầu
    const cachedMessages = get().messagesByConversation[conversationId]
    if (!cachedMessages) {
      set({ isLoadingMessages: true })
      try {
        const res = await chatService.getMessages(conversationId)
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: res.messages,
          },
          nextCursorByConversation: {
            ...state.nextCursorByConversation,
            [conversationId]: res.nextCursor,
          },
          hasMoreByConversation: {
            ...state.hasMoreByConversation,
            [conversationId]: res.hasMore,
          },
          isLoadingMessages: false,
        }))
      } catch {
        set({ isLoadingMessages: false })
      }
    }
  },

  /**
   * Nạp thêm tin nhắn cũ (cursor pagination)
   */
  loadMoreMessages: async (conversationId: string) => {
    const hasMore = get().hasMoreByConversation[conversationId]
    const cursor = get().nextCursorByConversation[conversationId]
    if (!hasMore || !cursor || get().isLoadingMessages) return

    set({ isLoadingMessages: true })
    try {
      const res = await chatService.getMessages(conversationId, cursor)
      set((state) => {
        const currentMsgs = state.messagesByConversation[conversationId] || []
        // Loại bỏ trùng lặp messageId
        const existingIds = new Set(currentMsgs.map((m) => m.messageId))
        const newOlderMsgs = res.messages.filter((m) => !existingIds.has(m.messageId))

        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: [...newOlderMsgs, ...currentMsgs],
          },
          nextCursorByConversation: {
            ...state.nextCursorByConversation,
            [conversationId]: res.nextCursor,
          },
          hasMoreByConversation: {
            ...state.hasMoreByConversation,
            [conversationId]: res.hasMore,
          },
          isLoadingMessages: false,
        }
      })
    } catch {
      set({ isLoadingMessages: false })
    }
  },

  /**
   * Gửi tin nhắn văn bản với Optimistic Update
   */
  sendMessage: async (conversationId: string, content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const currentUser = useAuthStore.getState().user
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const optimisticMessage: ChatMessage = {
      messageId: tempId,
      tempId,
      conversationId,
      senderUserId: currentUser?.userId || '',
      senderName: currentUser?.fullName || '',
      senderAvatarUrl: null,
      isSender: true,
      messageType: 'text',
      content: trimmed,
      attachmentUrl: null,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending',
    }

    // 1. Thêm tin nhắn tạm vào danh sách ngay lập tức
    set((state) => {
      const currentList = state.messagesByConversation[conversationId] || []
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...currentList, optimisticMessage],
        },
      }
    })

    // 2. Gửi qua WebSocket
    try {
      const res = await chatService.sendMessage(conversationId, trimmed)
      if (res.success && res.data) {
        const confirmedMsg: ChatMessage = {
          ...res.data,
          isSender: true,
          deliveryStatus: 'sent',
        }

        set((state) => {
          const list = state.messagesByConversation[conversationId] || []
          const updatedList = list.map((m) => (m.tempId === tempId ? confirmedMsg : m))

          // Cập nhật conversation preview
          const updatedConvs = state.conversations.map((c) =>
            c.conversationId === conversationId
              ? {
                  ...c,
                  lastMessageContent: trimmed,
                  lastMessageAt: confirmedMsg.createdAt,
                }
              : c
          )

          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: updatedList,
            },
            conversations: updatedConvs,
          }
        })
      } else {
        // Lỗi từ server
        set((state) => {
          const list = state.messagesByConversation[conversationId] || []
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: list.map((m) =>
                m.tempId === tempId
                  ? { ...m, deliveryStatus: 'failed', errorText: res.message || 'Lỗi gửi tin' }
                  : m
              ),
            },
          }
        })
      }
    } catch {
      // Lỗi mạng
      set((state) => {
        const list = state.messagesByConversation[conversationId] || []
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: list.map((m) =>
              m.tempId === tempId
                ? {
                    ...m,
                    deliveryStatus: 'failed',
                    errorText: 'Mất kết nối mạng. Không thể gửi.',
                  }
                : m
            ),
          },
        }
      })
    }
  },

  /**
   * Thử gửi lại tin nhắn bị lỗi
   */
  retrySendMessage: async (conversationId: string, tempId: string) => {
    const list = get().messagesByConversation[conversationId] || []
    const target = list.find((m) => m.tempId === tempId)
    if (!target) return

    // Chuyển lại trạng thái sending
    set((state) => {
      const currentList = state.messagesByConversation[conversationId] || []
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: currentList.map((m) =>
            m.tempId === tempId ? { ...m, deliveryStatus: 'sending', errorText: undefined } : m
          ),
        },
      }
    })

    try {
      const res = await chatService.sendMessage(conversationId, target.content)
      if (res.success && res.data) {
        const confirmedMsg: ChatMessage = {
          ...res.data,
          isSender: true,
          deliveryStatus: 'sent',
        }
        set((state) => {
          const currentList = state.messagesByConversation[conversationId] || []
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: currentList.map((m) => (m.tempId === tempId ? confirmedMsg : m)),
            },
          }
        })
      } else {
        set((state) => {
          const currentList = state.messagesByConversation[conversationId] || []
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: currentList.map((m) =>
                m.tempId === tempId
                  ? { ...m, deliveryStatus: 'failed', errorText: res.message }
                  : m
              ),
            },
          }
        })
      }
    } catch {
      set((state) => {
        const currentList = state.messagesByConversation[conversationId] || []
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: currentList.map((m) =>
              m.tempId === tempId
                ? { ...m, deliveryStatus: 'failed', errorText: 'Không thể gửi tin nhắn' }
                : m
            ),
          },
        }
      })
    }
  },

  /**
   * Gửi ảnh đính kèm qua REST API
   */
  sendImage: async (conversationId: string, file: File) => {
    set({ isUploading: true })
    try {
      const uploadedMsg = await chatService.uploadAttachment(conversationId, file)
      set((state) => {
        const list = state.messagesByConversation[conversationId] || []
        const exists = list.some((m) => m.messageId === uploadedMsg.messageId)
        const updatedList: ChatMessage[] = exists
          ? list
          : [...list, { ...uploadedMsg, isSender: true, deliveryStatus: 'sent' as const }]

        const updatedConvs = state.conversations.map((c) =>
          c.conversationId === conversationId
            ? {
                ...c,
                lastMessageContent: '[Hình ảnh]',
                lastMessageAt: uploadedMsg.createdAt,
              }
            : c
        )

        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: updatedList,
          },
          conversations: updatedConvs,
          isUploading: false,
        }
      })
    } catch (err: unknown) {
      set({ isUploading: false })
      toast.error('Tải ảnh lên thất bại. Vui lòng thử lại.')
      throw err
    }
  },

  /**
   * Thu hồi tin nhắn
   */
  deleteMessage: async (conversationId: string, messageId: string) => {
    try {
      await chatService.deleteMessageViaSocket(conversationId, messageId)
      // Cập nhật giao diện lập tức
      get().handleMessageDeleted({ conversationId, messageId })
    } catch {
      // Fallback REST nếu socket lỗi
      await chatService.deleteMessage(messageId)
      get().handleMessageDeleted({ conversationId, messageId })
    }
  },

  /**
   * Đánh dấu đã đọc
   */
  markSeen: async (conversationId: string) => {
    await chatService.markSeen(conversationId)
    set((state) => {
      const updatedConvs = state.conversations.map((c) =>
        c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c
      )
      const unreadTotal = updatedConvs.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
      return { conversations: updatedConvs, unreadTotal }
    })
  },

  /**
   * Phát sự kiện typing với debounce
   */
  sendTyping: (conversationId: string, isTyping: boolean) => {
    if (!isTyping) {
      if (typingDebounceTimer) {
        clearTimeout(typingDebounceTimer)
        typingDebounceTimer = null
      }
      chatService.sendTypingStop(conversationId)
      return
    }

    chatService.sendTypingStart(conversationId)

    if (typingDebounceTimer) {
      clearTimeout(typingDebounceTimer)
    }

    typingDebounceTimer = setTimeout(() => {
      chatService.sendTypingStop(conversationId)
      typingDebounceTimer = null
    }, 1500)
  },

  // ==========================================
  // REAL-TIME EVENT HANDLERS
  // ==========================================

  handleIncomingMessage: (message: ChatMessage) => {
    const { activeConversationId, soundEnabled } = get()
    const isCurrentActive = activeConversationId === message.conversationId
    const currentUser = useAuthStore.getState().user
    const isSender = String(currentUser?.userId) === String(message.senderUserId)

    // 1. Thêm tin nhắn vào danh sách hội thoại
    set((state) => {
      const list = state.messagesByConversation[message.conversationId] || []
      // Nếu tin nhắn đã có (vd vừa thêm dạng optimistic hoặc duplicate broadcast)
      const existingIndex = list.findIndex(
        (m) => m.messageId === message.messageId || (m.tempId && m.content === message.content && isSender)
      )

      let updatedList: ChatMessage[]
      if (existingIndex >= 0) {
        updatedList = [...list]
        updatedList[existingIndex] = { ...message, isSender, deliveryStatus: 'sent' }
      } else {
        updatedList = [...list, { ...message, isSender, deliveryStatus: 'sent' }]
      }

      // 2. Cập nhật preview lastMessage và unreadCount
      const convExists = state.conversations.some((c) => c.conversationId === message.conversationId)
      let updatedConvs: ConversationSummary[]

      if (convExists) {
        updatedConvs = state.conversations.map((c) => {
          if (c.conversationId === message.conversationId) {
            return {
              ...c,
              lastMessageContent:
                message.messageType === 'image' ? '[Hình ảnh]' : message.content,
              lastMessageAt: message.createdAt,
              unreadCount: isCurrentActive || isSender ? 0 : (c.unreadCount || 0) + 1,
            }
          }
          return c
        })
      } else {
        // Nếu là hội thoại mới nhận lần đầu
        updatedConvs = state.conversations
      }

      // Đưa hội thoại vừa có tin nhắn lên đầu
      updatedConvs.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
        return timeB - timeA
      })

      const unreadTotal = updatedConvs.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [message.conversationId]: updatedList,
        },
        conversations: updatedConvs,
        unreadTotal,
      }
    })

    // 3. Xử lý thông báo và âm thanh
    if (!isSender) {
      if (soundEnabled) {
        playNotificationSound()
      }

      if (!isCurrentActive) {
        const preview = message.messageType === 'image' ? 'đã gửi một hình ảnh' : message.content
        toast(message.senderName, {
          description: preview.length > 60 ? `${preview.slice(0, 60)}...` : preview,
          action: {
            label: 'Xem',
            onClick: () => {
              get().openFloating(message.conversationId)
            },
          },
        })
      } else {
        // Nếu đang mở đúng hội thoại này -> tự động đánh dấu đã đọc
        chatService.markSeen(message.conversationId)
      }
    }
  },

  handleMessageDeleted: ({ conversationId, messageId }) => {
    set((state) => {
      const list = state.messagesByConversation[conversationId] || []
      const filtered = list.filter((m) => m.messageId !== messageId && m.tempId !== messageId)

      // Cập nhật lastMessageContent nếu tin bị xóa là tin cuối cùng
      const lastMsg = filtered[filtered.length - 1]
      const updatedConvs = state.conversations.map((c) => {
        if (c.conversationId === conversationId) {
          return {
            ...c,
            lastMessageContent: lastMsg
              ? lastMsg.messageType === 'image'
                ? '[Hình ảnh]'
                : lastMsg.content
              : null,
            lastMessageAt: lastMsg ? lastMsg.createdAt : c.createdAt,
          }
        }
        return c
      })

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: filtered,
        },
        conversations: updatedConvs,
      }
    })
  },

  handleMessagesSeen: (_payload: WsMessagesSeenPayload) => {
    // Có thể bổ sung trạng thái seen cho từng tin nhắn nếu cần
  },

  handleUserTyping: ({ conversationId, userId, fullName }) => {
    const currentActive = get().activeConversationId
    if (currentActive !== conversationId) return

    set((state) => {
      const roomTyping = state.typingUsers[conversationId] || {}
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: {
            ...roomTyping,
            [userId]: { fullName, timestamp: Date.now() },
          },
        },
      }
    })
  },

  handleUserStopTyping: ({ conversationId, userId }) => {
    set((state) => {
      const roomTyping = state.typingUsers[conversationId] || {}
      if (!roomTyping[userId]) return state

      const updatedRoom = { ...roomTyping }
      delete updatedRoom[userId]

      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: updatedRoom,
        },
      }
    })
  },

  // ==========================================
  // FLOATING WIDGET ACTIONS
  // ==========================================

  toggleFloating: () => {
    set((state) => ({ isFloatingOpen: !state.isFloatingOpen }))
  },

  openFloating: (conversationId?: string) => {
    set({
      isFloatingOpen: true,
      floatingConversationId: conversationId || get().activeConversationId,
    })
    if (conversationId) {
      get().setActiveConversation(conversationId)
    }
  },

  closeFloating: () => {
    set({ isFloatingOpen: false })
  },

  clear: () => {
    get().cleanupSocket()
    set({
      conversations: [],
      activeConversationId: null,
      messagesByConversation: {},
      nextCursorByConversation: {},
      hasMoreByConversation: {},
      typingUsers: {},
      unreadTotal: 0,
      isFloatingOpen: false,
      floatingConversationId: null,
    })
  },
}))
