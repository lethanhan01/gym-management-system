import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageErrorState } from '@/components/shared/PageUI'
import { useAuthStore } from '@/stores/authStore'
import {
  useSubscriptionStore,
  type SubscriptionCheckErrorCode,
} from '@/stores/subscriptionStore'

const RETRYABLE_ERRORS = new Set<SubscriptionCheckErrorCode>([
  'timeout',
  'network',
  'service_unavailable',
  'unknown',
])

export default function SubscriptionRequired() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const status = useSubscriptionStore((state) => state.status)
  const hasActiveSub = useSubscriptionStore((state) => state.hasActiveSub)
  const errorCode = useSubscriptionStore((state) => state.errorCode)
  const checkedMemberId = useSubscriptionStore((state) => state.checkedMemberId)
  const retry = useSubscriptionStore((state) => state.retry)
  const clearSubscription = useSubscriptionStore((state) => state.clear)

  if (status === 'idle' || status === 'loading') {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-label={t('subscription.access.loading')}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent rogym-sx-87386abd" />
      </div>
    )
  }

  if (status === 'error') {
    const code = errorCode ?? 'unknown'
    const message = t(`subscription.access.errors.${code}`)
    const canRetry = RETRYABLE_ERRORS.has(code) && checkedMemberId !== null
    const requiresLogout = code === 'missing_member_profile' || checkedMemberId === null

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-4">
        <PageErrorState
          message={message}
          onRetry={canRetry ? () => void retry().catch(() => undefined) : undefined}
          retryLabel={t('subscription.access.retry')}
        />
        {requiresLogout && (
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white self-center"
            onClick={() => {
              clearSubscription()
              clearAuth()
              navigate('/login', { replace: true })
            }}
          >
            {t('subscription.access.logout')}
          </button>
        )}
      </div>
    )
  }

  if (hasActiveSub === false) {
    return <Navigate to="/member/subscription/setup" replace />
  }

  return <Outlet />
}
