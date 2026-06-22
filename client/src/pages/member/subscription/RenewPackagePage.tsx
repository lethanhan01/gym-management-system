import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from '@/components/MemberUI'
import { formatDate } from '@/lib/date'

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

export default function RenewPackagePage() {
  const { t } = useTranslation('member')
  const [activeSub, setActiveSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    subscriptionService
      .getByMember(user.memberId)
      .then((subs) => {
        const active = subs.find((s) => s.status === 'active')
        if (!active || active.package?.status !== 'active') {
          navigate('/member/subscription/current', { replace: true })
          return
        }
        setActiveSub(active)
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          clearAuth()
          navigate('/login')
        } else {
          setError(t('subscription.renew.errorLoad'))
        }
      })
      .finally(() => setLoading(false))
  }, [clearAuth, navigate, user?.memberId])

  function continueToPayment() {
    if (!activeSub?.package) return
    navigate('/member/subscription/renew/payment', {
      state: {
        subscriptionId: activeSub.subscriptionId,
        packageId: activeSub.packageId,
        packageName: activeSub.packageName ?? activeSub.package.name,
        price: Number(activeSub.package.price),
        durationDays: activeSub.package.durationDays,
      },
    })
  }

  const currentEndDate = activeSub ? new Date(activeSub.endDate) : null
  const newEndDate =
    currentEndDate && activeSub?.package
      ? addDays(currentEndDate, activeSub.package.durationDays)
      : null

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('subscription.renew.eyebrow')}
        title={t('subscription.renew.title')}
        description={t('subscription.renew.description')}
        actions={
          <button
            type="button"
            onClick={() => navigate('/member/subscription/current')}
            className="rogym-btn rogym-btn--outline-white"
          >
            {t('subscription.renew.backToCurrent')}
          </button>
        }
      />
      {loading ? (
        <MemberSkeleton rows={3} />
      ) : error ? (
        <div className="py-16 text-center rogym-text-secondary">{error}</div>
      ) : activeSub ? (
        <div className="mx-auto flex max-w-md flex-col gap-5">
          <div className="rogym-card rogym-card--compact flex flex-col gap-4 p-6">
            <h3 className="text-base font-bold text-white">
              {activeSub.packageName ?? activeSub.package?.name ?? t('subscription.renew.packageFallback')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <p className="text-xs rogym-text-secondary">{t('subscription.renew.currentExpiry')}</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {formatDate(activeSub.endDate)}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <p className="text-xs rogym-text-secondary">{t('subscription.renew.newExpiry')}</p>
                <p className="mt-1 text-sm font-medium rogym-text-accent">
                  {newEndDate ? formatDate(newEndDate) : '—'}
                </p>
              </div>
            </div>
            <p className="border-t border-white/5 pt-3 text-sm rogym-text-secondary">
              {t('subscription.renew.renewText', {
                days: activeSub.package?.durationDays ?? '?',
                price: activeSub.package?.price
                  ? Number(activeSub.package.price).toLocaleString('vi-VN') + 'đ'
                  : '',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={continueToPayment}
            className="rogym-btn rogym-btn--primary w-full"
          >
            {t('subscription.renew.buttonPay')}
          </button>
        </div>
      ) : null}
    </MemberPage>
  )
}
