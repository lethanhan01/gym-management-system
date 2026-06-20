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
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  hasHydrated: boolean

  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setHasHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),

      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'gym-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Được gọi khi persist đã đọc xong từ localStorage
        state?.setHasHydrated(true)
      },
    }
  )
)
