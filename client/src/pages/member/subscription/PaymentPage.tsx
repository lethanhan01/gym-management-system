import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Check, Calendar, PackageX, Dumbbell, ChevronDown, UserCheck, UserX,
} from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type PaymentMethod } from '@/services/payment.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { getPaymentMethodOptions } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { parsePackageBenefits } from '@/lib/package'
import { Button } from '@/components/ui/Button'

function Skeleton() {
  return (
    <div className="animate-pulse rounded-[40px] rogym-sx-cb421500"  />
  )
}

function BtnPrimary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Button
      variant="primary"
      size="wide"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

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
    <div className="rogym-sx-53c24bf2">
      {/* Header */}
      <div className="rogym-sx-18b166bc">
        <div className="flex items-center gap-3 mb-2">
          <div className="rogym-sx-9067c2f5">
            <Dumbbell size={18} className="text-white" />
          </div>
          <span className="rogym-sx-28e83c22">ROGYM</span>
        </div>
        <h1 className="rogym-sx-c16b1e4e">
          {t('subscription.payment.headerTitle')}
        </h1>
        <p className="rogym-sx-4187d75f">
          {t('subscription.payment.headerSubtitle')}
        </p>
      </div>

      <div className="rogym-sx-08918853">
        {/* Package grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <Skeleton key={i} />)}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <PackageX size={48} className="rogym-sx-d88f932f" />
            <p className="rogym-sx-d88f932f">{t('subscription.payment.emptyPackages')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg, idx) => {
              const isSelected = selected?.packageId === pkg.packageId
              const isPopular  = idx === 1
              const benefits   = parsePackageBenefits(pkg.benefits)
              return (
                <div
                  key={pkg.packageId}
                  onClick={() => handleSelect(pkg)}
                  className={`rogym-package-option ${isSelected ? 'is-selected' : ''} ${
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
                      <span className="flex items-center gap-1 rounded-full bg-[rgba(66,224,158,0.15)] px-2 py-0.5 text-xs font-medium text-[var(--rogym-accent)]">
                        <UserCheck size={11} /> {t('subscription.payment.withPt')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium rogym-text-dim">
                        <UserX size={11} /> {t('subscription.payment.selfTrain')}
                      </span>
                    )}
                  </div>
                  {benefits.length > 0 && (
                    <ul className="flex flex-col gap-2 mb-6">
                      {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 rogym-sx-c2ff5e7f" >
                          <Check size={14} className="rogym-sx-9b3528d7" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <BtnPrimary onClick={() => handleSelect(pkg)}>
                    {isSelected ? t('subscription.payment.buttonSelected') : t('subscription.payment.buttonSelectThis')}
                  </BtnPrimary>
                </div>
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
                <button onClick={() => setShowPanel(false)} className="rogym-sx-c2117916">
                  <ChevronDown size={20} />
                </button>
              </div>

              {/* Selected package summary */}
              <div className="flex items-center justify-between mb-5 pb-5 rogym-sx-de699e26" >
                <div>
                  <p className="rogym-sx-668e18f3">{selected.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="rogym-sx-0cce7195">{t('subscription.payment.days', { count: selected.durationDays })}</p>
                    {selected.includesPt ? (
                      <span className="flex items-center gap-1 rounded-full bg-[rgba(66,224,158,0.15)] px-2 py-0.5 text-xs font-medium text-[var(--rogym-accent)]">
                        <UserCheck size={11} /> {t('subscription.payment.withPt')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium rogym-text-dim">
                        <UserX size={11} /> {t('subscription.payment.selfTrain')}
                      </span>
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

              <BtnPrimary onClick={handlePay} disabled={paying}>
                {paying ? t('subscription.payment.buttonPaying') : t('subscription.payment.buttonPay', { price: formatVnd(selected.price) })}
              </BtnPrimary>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
