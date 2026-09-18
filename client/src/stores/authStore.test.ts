import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useAuthStore, onLogout, type AuthUser } from './authStore'
import { useChatStore } from './chat.store'

describe('authStore and onLogout Protocol', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
    vi.clearAllMocks()
  })

  it('TC-AS-01: sets authentication data correctly', () => {
    const mockUser: AuthUser = {
      userId: 'user-123',
      email: 'member@rogym.vn',
      fullName: 'Test Member',
      roles: ['member'],
    }

    useAuthStore.getState().setAuth(mockUser, 'mock-jwt-token-xyz')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('mock-jwt-token-xyz')
    expect(state.user?.email).toBe('member@rogym.vn')
  })

  it('TC-AS-02: onLogout callback is called when clearAuth is triggered', () => {
    const mockCallback = vi.fn()
    const unsubscribe = onLogout(mockCallback)

    useAuthStore.getState().clearAuth()
    expect(mockCallback).toHaveBeenCalledTimes(1)

    // Unsubscribe and trigger again
    unsubscribe()
    useAuthStore.getState().clearAuth()
    expect(mockCallback).toHaveBeenCalledTimes(1)
  })

  it('TC-AS-03: clearAuth automatically resets chatStore state and listeners', () => {
    // Populate chatStore state
    useChatStore.setState({
      activeConversationId: 'conv-999',
      unreadTotal: 10,
    })

    expect(useChatStore.getState().activeConversationId).toBe('conv-999')
    expect(useChatStore.getState().unreadTotal).toBe(10)

    // Trigger clearAuth (logout)
    useAuthStore.getState().clearAuth()

    // Expect chatStore to be wiped clean
    expect(useChatStore.getState().activeConversationId).toBeNull()
    expect(useChatStore.getState().unreadTotal).toBe(0)
  })
})
