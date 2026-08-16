import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Check, Calendar, ChevronDown, UserCheck, UserX,
} from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type PaymentMethod } from '@/services/payment.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import {
  MemberBadge,
  MemberCard,
  MemberEmptyState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import { getPaymentMethodOptions } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { parsePackageBenefits } from '@/lib/package'
import { Button } from '@/components/ui'

export default function PaymentPage() {
  const { t } = useTranslation('member')
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Package | null>(null)
  const [method, setMethod]     = useState<PaymentMethod>('cash')
  const [paying, setPaying]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  const navigate  = useNavigate()
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const setResolvedStatus = useSubscriptionStore((s) => s.setResolvedStatus)

  useEffect(() => {
    packageService.list({ status: 'active' })
      .then(r => setPackages(r.data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [])

  function handleSelect(pkg: Package) {
    setSelected(pkg)
    setShowPanel(true)
    setError(null)
  }

  async function handlePay() {
    if (!selected) return
    if (!isAuthenticated || !user?.memberId) {
      navigate('/login?returnTo=/member/payment')
      return
    }
    setPaying(true)
    setError(null)
    try {
      const sub = await subscriptionService.create(user.memberId, selected.packageId)
      await paymentService.create({
        memberId: Number(user.memberId),
        subscriptionId: Number(sub.subscriptionId),
        method,
        amount: Number(selected.price),
      })
      setResolvedStatus(true, user.memberId)
      navigate('/member', { state: { paymentSuccess: true } })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 401) {
        navigate('/login?returnTo=/member/payment')
      } else if (status === 409) {
        navigate('/member/subscription/current')
      } else {
        setError(e?.response?.data?.message || t('subscription.payment.errorPayment'))
      }
    } finally {
      setPaying(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Gói Hội Viên"
        title={t('subscription.payment.headerTitle')}
        description={t('subscription.payment.headerSubtitle')}
      />

      <div>
        {/* Package grid */}
        {loading ? (
          <MemberSkeleton rows={4} />
        ) : packages.length === 0 ? (
          <MemberEmptyState
            title={t('subscription.payment.emptyPackages')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg, idx) => {
              const isSelected = selected?.packageId === pkg.packageId
              const isPopular  = idx === 1
              const benefits   = parsePackageBenefits(pkg.benefits)
              return (
                <MemberCard
                  key={pkg.packageId}
                  as="div"
                  onClick={() => handleSelect(pkg)}
                  variant="interactive"
                  className={`rogym-package-option cursor-pointer transition-all ${isSelected ? 'is-selected ring-2 ring-[var(--rogym-teal)]' : ''} ${
                    isPopular ? 'is-popular' : ''
                  }`}
                >
                  {isPopular && (
                    <span className="rogym-sx-38d599fa">
                      {t('subscription.payment.popularBadge')}
                    </span>
                  )}
                  <p className="rogym-sx-44e91bb7">
                    {pkg.name}
                  </p>
                  <p className="rogym-sx-ebc446b7">
                    {formatVnd(pkg.price)}
                    <span className="rogym-sx-55a40d82"> {t('subscription.payment.perPackage')}</span>
                  </p>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-2 rogym-sx-c2ff5e7f">
                      <Calendar size={14} />
                      <span>{t('subscription.payment.days', { count: pkg.durationDays })}</span>
                    </div>
                    {pkg.includesPt ? (
                      <MemberBadge tone="success" size="xs" leftIcon={<UserCheck size={11} />}>
                        {t('subscription.payment.withPt')}
                      </MemberBadge>
                    ) : (
                      <MemberBadge tone="muted" size="xs" leftIcon={<UserX size={11} />}>
                        {t('subscription.payment.selfTrain')}
                      </MemberBadge>
                    )}
                  </div>
                  {benefits.length > 0 && (
                    <ul className="flex flex-col gap-2 mb-6">
                      {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 rogym-sx-c2ff5e7f">
                          <Check size={14} className="rogym-sx-9b3528d7" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant={isSelected ? 'primary' : 'outline-white'}
                    fullWidth
                    onClick={(e) => { e.stopPropagation(); handleSelect(pkg) }}
                  >
                    {isSelected ? t('subscription.payment.buttonSelected') : t('subscription.payment.buttonSelectThis')}
                  </Button>
                </MemberCard>
              )
            })}
          </div>
        )}

        {/* Payment panel */}
        <div className={`rogym-payment-panel ${showPanel && selected ? 'is-open' : ''}`}>
          {selected && (
            <div className="rogym-sx-8f35a167">
              <div className="flex items-center justify-between mb-5">
                <h2 className="rogym-sx-85be1f38">
                  {t('subscription.payment.panelTitle')}
                </h2>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={() => setShowPanel(false)}
                  className="rogym-sx-c2117916"
                  aria-label="Close"
                >
                  <ChevronDown size={20} />
                </Button>
              </div>

              {/* Selected package summary */}
              <div className="flex items-center justify-between mb-5 pb-5 rogym-sx-de699e26">
                <div>
                  <p className="rogym-sx-668e18f3">{selected.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="rogym-sx-0cce7195">{t('subscription.payment.days', { count: selected.durationDays })}</p>
                    {selected.includesPt ? (
                      <MemberBadge tone="success" size="xs" leftIcon={<UserCheck size={11} />}>
                        {t('subscription.payment.withPt')}
                      </MemberBadge>
                    ) : (
                      <MemberBadge tone="muted" size="xs" leftIcon={<UserX size={11} />}>
                        {t('subscription.payment.selfTrain')}
                      </MemberBadge>
                    )}
                  </div>
                </div>
                <p className="rogym-sx-1eee35cb">{formatVnd(selected.price)}</p>
              </div>

              {/* Payment method */}
              <p className="rogym-sx-9259d65d">{t('subscription.payment.paymentMethodLabel')}</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {getPaymentMethodOptions().map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMethod(opt.value)}
                    className={`rogym-payment-choice ${method === opt.value ? 'is-active' : ''}`}
                  >
                    <opt.Icon size={18} />
                    {opt.label}
                  </button>
                ))}
              </div>

              {error && (
                <p className="rogym-sx-3b31904d">{error}</p>
              )}

              <Button
                variant="primary"
                fullWidth
                onClick={handlePay}
                disabled={paying}
                loading={paying}
              >
                {t('subscription.payment.buttonPay', { price: formatVnd(selected.price) })}
              </Button>
            </div>
          )}
        </div>
      </div>
    </MemberPage>
  )
}
