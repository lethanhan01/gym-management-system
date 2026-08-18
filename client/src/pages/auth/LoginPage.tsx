import { useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Mail } from 'lucide-react'
import { authService } from '@/services/auth.service'
import subscriptionService from '@/services/subscription.service'
import { hasActiveSubscription } from '@/lib/subscription'
import { useAuthStore } from '@/stores/authStore'
import {
  classifySubscriptionCheckError,
  useSubscriptionStore,
} from '@/stores/subscriptionStore'
import { AuthShell, BtnPrimary, TextLink, MutedLink, Field, PasswordField, ErrorMsg } from './_authui'

const roleRouteMap: Record<string, string> = {
  member: '/member',
  trainer: '/trainer',
  staff: '/staff',
  owner: '/owner',
}

export default function LoginPage() {
  const location = useLocation()
  const [email, setEmail] = useState(() => new URLSearchParams(location.search).get('email') ?? '')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lineLoading, setLineLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const clearSubscription = useSubscriptionStore((s) => s.clear)
  const setSubscriptionResolved = useSubscriptionStore((s) => s.setResolvedStatus)
  const setSubscriptionError = useSubscriptionStore((s) => s.setError)
  const { t } = useTranslation('auth')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await authService.login(email, pass)
      clearSubscription()

      const isMember = user.roles.includes('member')

      if (isMember && user.memberId) {
        try {
          const memberId = String(user.memberId)
          const subs = await subscriptionService.getByMember(memberId, {
            accessToken: token,
            suppressAuthRedirect: true,
          })
          const hasActiveSub = hasActiveSubscription(subs)
          setAuth(user, token, 'credentials')
          setSubscriptionResolved(hasActiveSub, memberId)
          if (hasActiveSub) {
            navigate('/member', { replace: true })
          } else {
            const pendingSub = subs.find((s) => s.status === 'pending' && s.package)
            if (pendingSub?.package) {
              navigate('/member/subscription/buy/payment', {
                replace: true,
                state: {
                  packageId: pendingSub.packageId,
                  packageName: pendingSub.package.name,
                  price: Number(pendingSub.package.price),
                  durationDays: pendingSub.package.durationDays,
                  trainerId: pendingSub.trainerId,
                  subscriptionId: pendingSub.subscriptionId,
                },
              })
            } else {
              navigate('/member/subscription/setup', { replace: true })
            }
          }
        } catch (subscriptionError) {
          if (axios.isAxiosError(subscriptionError) && subscriptionError.response?.status === 401) {
            clearAuth()
            clearSubscription()
            setError(t('login.invalidCredentials'))
            return
          }

          setAuth(user, token, 'credentials')
          setSubscriptionError(classifySubscriptionCheckError(subscriptionError), String(user.memberId))
          navigate('/member', { replace: true })
        }
      } else if (isMember) {
        // DashboardLayout refreshes /auth/me once and owns the missing-profile error state.
        setAuth(user, token, 'credentials')
        navigate('/member', { replace: true })
      } else {
        setAuth(user, token, 'credentials')
        navigate(roleRouteMap[user.roles[0]] ?? '/', { replace: true })
      }
    } catch (err) {
      console.error('[LoginPage] login error:', err)
      const response = (err as { response?: { status?: number; data?: { code?: string } } })?.response
      if (response?.status === 403 && response.data?.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/member/verify-email', { state: { email: email.trim().toLowerCase() } })
        return
      }
      // Chỉ hiển thị "invalid credentials" khi lỗi 401 từ server
      // Các lỗi khác (subscription, navigation...) không nên hiển thị thông báo này
      const isAuthError =
        response?.status === 401 ||
        (err instanceof Error && err.message?.toLowerCase().includes('unauthorized'))
      if (isAuthError) {
        setError(t('login.invalidCredentials'))
      } else {
        setError(t('login.invalidCredentials'))
        // Ghi chú: lỗi này không phải do sai credentials, nhưng hiển thị message chung
        // để tránh lộ thông tin kỹ thuật ra ngoài
      }
    } finally {
      setLoading(false)
    }
  }

  function handleLineLogin() {
    setLineLoading(true)
    setError('')
    // Full page redirect — để LiffEntryPage xử lý liff.init() và LINE auth params đúng cách.
    // React Router navigate('/liff') bỏ qua LINE redirect, khiến LIFF auto-redirect
    // về LIFF Endpoint URL thay vì redirectUri được chỉ định.
    window.location.href = '/liff'
  }

  return (
    <>
      <AuthShell>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-white">{t('login.title')}</h1>
            <p className="text-sm text-white/70">{t('login.subtitle')}</p>
          </div>

          <div className="space-y-4">
            <Field
              label={t('login.email')}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="ten@email.com"
              value={email}
              onChange={setEmail}
              icon={Mail}
            />
            <PasswordField
              label={t('login.password')}
              name="current-password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={pass}
              onChange={setPass}
              icon={Lock}
            />
          </div>

          <div className="flex justify-end">
            <MutedLink to="/forgot-password">{t('login.forgotPassword')}</MutedLink>
          </div>

          {error && <ErrorMsg message={error} />}

          <BtnPrimary type="submit" disabled={loading} className="h-[52px]">
            {loading ? t('login.submitting') : t('login.submit')}
          </BtnPrimary>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#080e0b] px-2 text-on-surface-variant">{t('login.or')}</span>
            </div>
          </div>

          <BtnPrimary 
          type="button" 
          onClick={handleLineLogin} 
          disabled={lineLoading || loading}
          className="bg-[#06C755] text-white hover:bg-[#05B84F] h-[52px]"
          >
            {lineLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg 
              viewBox="0 0 24 24" 
              className="h-5 w-5 fill-current " 
              aria-hidden="true">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
            )}
            {t('login.lineLogin')}
          </BtnPrimary>

          <p className="text-center text-sm text-white/70">
            <TextLink to="/member/register">{t('login.noAccount')}</TextLink>
          </p>
        </form>
      </AuthShell>
    </>
  )
}
