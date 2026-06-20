import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'

const POLL_INTERVAL_MS = 60_000

export function useSubscriptionExpiry(onExpired: () => void) {
  const memberId = useAuthStore((s) => s.user?.memberId)
  const hasActiveSub = useSubscriptionStore((s) => s.hasActiveSub)
  const setHasActiveSub = useSubscriptionStore((s) => s.setHasActiveSub)
  const callbackRef = useRef(onExpired)
  callbackRef.current = onExpired

  useEffect(() => {
    if (!memberId || hasActiveSub !== true) return

    const check = async () => {
      try {
        const subs = await subscriptionService.getByMember(memberId)
        const today = new Date()
        const stillActive = subs.some((s) => s.status === 'active' && new Date(s.endDate) >= today)
        if (!stillActive) {
          setHasActiveSub(false)
          callbackRef.current()
        }
      } catch {
        // mạng lỗi → không tự động expire để tránh false positive
      }
    }

    const id = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [memberId, hasActiveSub, setHasActiveSub])
}
