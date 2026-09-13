import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useChatNotifications } from './useChatNotifications'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chat.store'

describe('useChatNotifications Hook', () => {
  const initSocketSpy = vi.fn()
  const cleanupSocketSpy = vi.fn()
  const fetchConversationsSpy = vi.fn().mockResolvedValue(undefined)
  const fetchActiveMemberConversationSpy = vi.fn().mockResolvedValue(null)

  beforeEach(() => {
    vi.clearAllMocks()

    useChatStore.setState({
      initSocket: initSocketSpy,
      cleanupSocket: cleanupSocketSpy,
      fetchConversations: fetchConversationsSpy,
      fetchActiveMemberConversation: fetchActiveMemberConversationSpy,
      isConnected: true,
      unreadTotal: 3,
    })
  })

  it('initializes socket and fetches chat data for authenticated member', () => {
    useAuthStore.setState({
      user: {
        userId: 'mem-1',
        email: 'member@example.com',
        fullName: 'Hội viên 1',
        roles: ['member'],
      },
      token: 'valid-jwt-token',
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useChatNotifications())

    expect(result.current.isEligible).toBe(true)
    expect(initSocketSpy).toHaveBeenCalledWith('valid-jwt-token')
    expect(fetchConversationsSpy).toHaveBeenCalled()
    expect(fetchActiveMemberConversationSpy).toHaveBeenCalled()
  })

  it('initializes socket for trainer without calling fetchActiveMemberConversation', () => {
    useAuthStore.setState({
      user: {
        userId: 'pt-1',
        email: 'trainer@example.com',
        fullName: 'HLV 1',
        roles: ['trainer'],
      },
      token: 'trainer-jwt-token',
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useChatNotifications())

    expect(result.current.isEligible).toBe(true)
    expect(initSocketSpy).toHaveBeenCalledWith('trainer-jwt-token')
    expect(fetchConversationsSpy).toHaveBeenCalled()
    expect(fetchActiveMemberConversationSpy).not.toHaveBeenCalled()
  })

  it('does not initialize socket for non-chat role or unauthenticated user', () => {
    useAuthStore.setState({
      user: {
        userId: 'owner-1',
        email: 'owner@example.com',
        fullName: 'Chủ phòng',
        roles: ['owner'],
      },
      token: 'owner-token',
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useChatNotifications())

    expect(result.current.isEligible).toBe(false)
    expect(initSocketSpy).not.toHaveBeenCalled()
  })
})
