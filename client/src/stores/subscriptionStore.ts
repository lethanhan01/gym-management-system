import { create } from 'zustand'

interface SubscriptionState {
  hasActiveSub: boolean | null  // null = not yet fetched
  setHasActiveSub: (v: boolean) => void
  clear: () => void
}

export const useSubscriptionStore = create<SubscriptionState>()((set) => ({
  hasActiveSub: null,
  setHasActiveSub: (v) => set({ hasActiveSub: v }),
  clear: () => set({ hasActiveSub: null }),
}))
