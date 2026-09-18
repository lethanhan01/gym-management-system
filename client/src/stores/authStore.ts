import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'owner' | 'staff' | 'trainer' | 'member'

export interface AuthUser {
  userId: string
  email: string
  fullName: string
  roles: Role[]
  status?: string
  phone?: string | null
  staffId?: string | null
  memberId?: string | null
  memberCode?: string | null
  lineLinked?: boolean
  avatarUrl?: string | null
}


export type AuthProvider = 'credentials' | 'line'

export type LogoutListener = () => void
const logoutListeners = new Set<LogoutListener>()

/**
 * Đăng ký callback dọn dẹp khi người dùng đăng xuất (clearAuth).
 * Giúp các store/dịch vụ độc lập (chatStore, subscriptionStore, etc.) tự giải phóng tài nguyên
 * mà không gây ra circular dependency với authStore.
 */
export function onLogout(listener: LogoutListener): () => void {
  logoutListeners.add(listener)
  return () => {
    logoutListeners.delete(listener)
  }
}

export function notifyLogout(): void {
  logoutListeners.forEach((listener) => {
    try {
      listener()
    } catch (err) {
      console.error('[onLogout listener error]:', err)
    }
  })
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  authProvider?: AuthProvider | null
  isAuthenticated: boolean
  hasHydrated: boolean

  setAuth: (user: AuthUser, token: string, authProvider?: AuthProvider) => void
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setHasHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      authProvider: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (user, token, authProvider = 'credentials') =>
        set({ user, token, authProvider, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      clearAuth: () => {
        set({ user: null, token: null, authProvider: null, isAuthenticated: false })
        notifyLogout()
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'gym-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        authProvider: state.authProvider,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Được gọi khi persist đã đọc xong từ localStorage
        state?.setHasHydrated(true)
      },
    }
  )
)
