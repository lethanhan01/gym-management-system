import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'
import { hasActiveSubscription } from '@/lib/subscription'

const POLL_INTERVAL_MS = 60_000

export function useSubscriptionExpiry(onExpired: () => void) {
  const memberId = useAuthStore((s) => s.user?.memberId)
  const hasActiveSub = useSubscriptionStore((s) => s.hasActiveSub)
  const setResolvedStatus = useSubscriptionStore((s) => s.setResolvedStatus)
  const callbackRef = useRef(onExpired)
  callbackRef.current = onExpired

  useEffect(() => {
    if (!memberId || hasActiveSub !== true) return

    const check = async () => {
      try {
        const subs = await subscriptionService.getByMember(memberId)
        const stillActive = hasActiveSubscription(subs)
        if (!stillActive) {
          setResolvedStatus(false, memberId)
          callbackRef.current()
        }
      } catch {
        // mạng lỗi → không tự động expire để tránh false positive
      }
    }

    const id = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [memberId, hasActiveSub, setResolvedStatus])
}
