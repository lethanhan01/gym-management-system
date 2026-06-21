import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { AuthShell, BtnPrimary, TextLink, MutedLink, Field, ErrorMsg } from './_authui'

const roleRouteMap: Record<string, string> = {
  member: '/member',
  trainer: '/trainer',
  staff: '/staff',
  owner: '/owner',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [overlayEndDate, setOverlayEndDate] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const clearSubscription = useSubscriptionStore((s) => s.clear)
  const checkSubscription = useSubscriptionStore((s) => s.check)
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await authService.login(email, pass)
      setAuth(user, token)
      clearSubscription()

      const isMember = user.roles.includes('member')

      if (isMember && user.memberId) {
        try {
          const result = await checkSubscription(String(user.memberId))
          if (useAuthStore.getState().user?.userId !== user.userId) return
          const subs = result.subscriptions
          if (result.hasActiveSub) {
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
              const lastSub = subs
                .filter((s) => s.status === 'active' || s.status === 'expired')
                .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
              if (lastSub) {
                setOverlayEndDate(lastSub.endDate)
              } else {
                navigate('/member/subscription/setup', { replace: true })
              }
            }
          }
        } catch {
          if (useAuthStore.getState().user?.userId !== user.userId) return
          navigate('/member', { replace: true })
        }
      } else if (isMember) {
        // DashboardLayout refreshes /auth/me once and owns the missing-profile error state.
        navigate('/member', { replace: true })
      } else {
        navigate(roleRouteMap[user.roles[0]] ?? '/', { replace: true })
      }
    } catch {
      setError(t('login.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  function fmtExpiry(iso: string) {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
  }

  return (
    <>
      {overlayEndDate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] p-6 shadow-2xl">
            <h2 className="mb-3 text-lg font-bold text-white">{t('login.packageExpiredTitle')}</h2>
            <p className="mb-6 text-sm rogym-text-secondary">
              {t('login.packageExpiredMsg', { date: fmtExpiry(overlayEndDate) })}
            </p>
            <div className="flex justify-end">
              <button
                className="rogym-btn rogym-btn--primary"
                onClick={() => navigate('/member/subscription/setup', { replace: true })}
              >
                {tCommon('ok')}
              </button>
            </div>
          </div>
        </div>
      )}
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
              placeholder="ten@email.com"
              value={email}
              onChange={setEmail}
            />
            <Field
              label={t('login.password')}
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={setPass}
            />
          </div>

          <div className="flex justify-end">
            <MutedLink to="/forgot-password">{t('login.forgotPassword')}</MutedLink>
          </div>

          {error && <ErrorMsg message={error} />}

          <BtnPrimary type="submit" disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </BtnPrimary>

          <p className="text-center text-sm text-white/70">
            <TextLink to="/member/register">{t('login.noAccount')}</TextLink>
          </p>
        </form>
      </AuthShell>
    </>
  )
}
