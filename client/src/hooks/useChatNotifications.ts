import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chat.store'

/**
 * Hook toàn cục quản lý kết nối socket thời gian thực và nạp dữ liệu chat ban đầu
 * Phục vụ cho Member và Trainer khi đã đăng nhập
 */
export function useChatNotifications() {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const initSocket = useChatStore((state) => state.initSocket)
  const cleanupSocket = useChatStore((state) => state.cleanupSocket)
  const fetchConversations = useChatStore((state) => state.fetchConversations)
  const fetchActiveMemberConversation = useChatStore(
    (state) => state.fetchActiveMemberConversation
  )
  const isConnected = useChatStore((state) => state.isConnected)
  const unreadTotal = useChatStore((state) => state.unreadTotal)

  const initializedTokenRef = useRef<string | null>(null)

  const isEligible = Boolean(
    isAuthenticated &&
      token &&
      user?.roles.some((r) => r === 'member' || r === 'trainer' || (r as string) === 'pt')
  )

  useEffect(() => {
    if (!isEligible || !token) {
      if (initializedTokenRef.current) {
        cleanupSocket()
        initializedTokenRef.current = null
      }
      return
    }

    if (initializedTokenRef.current === token) return
    initializedTokenRef.current = token

    // Khởi tạo kết nối Socket
    initSocket(token)

    // Nạp danh sách cuộc trò chuyện
    void fetchConversations()

    // Nếu là hội viên, nạp cuộc trò chuyện với PT chính
    if (user?.roles.includes('member')) {
      void fetchActiveMemberConversation()
    }

    return () => {
      // Khi unmount hoàn toàn hoặc đổi token
    }
  }, [
    isEligible,
    token,
    user?.roles,
    initSocket,
    cleanupSocket,
    fetchConversations,
    fetchActiveMemberConversation,
  ])

  return {
    isEligible,
    isConnected,
    unreadTotal,
  }
}
