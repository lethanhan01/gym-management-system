import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, Calendar, PackageX, Dumbbell, ChevronDown, UserCheck, UserX,
} from 'lucide-react'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type PaymentMethod } from '@/services/payment.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { PAYMENT_METHOD_OPTIONS } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { parsePackageBenefits } from '@/lib/package'

function Skeleton() {
  return (
    <div className="animate-pulse rounded-[40px] rogym-sx-cb421500"  />
  )
}

function BtnPrimary({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rogym-btn rogym-btn--primary rogym-btn--wide"
    >
      <span>{children}</span>
    </button>
  )
}

export default function PaymentPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Package | null>(null)
  const [method, setMethod]     = useState<PaymentMethod>('cash')
  const [paying, setPaying]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  const navigate  = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const setHasActiveSub = useSubscriptionStore((s) => s.setHasActiveSub)

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
      setHasActiveSub(true)
      navigate('/member', { state: { paymentSuccess: true } })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 401) {
        navigate('/login?returnTo=/member/payment')
      } else if (status === 409) {
        navigate('/member/subscription/current')
      } else {
        setError(e?.response?.data?.message || 'Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại sau.')
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
          Chọn gói tập của bạn
        </h1>
        <p className="rogym-sx-4187d75f">
          Đầu tư vào sức khỏe — linh hoạt và phù hợp với mọi mục tiêu
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
            <p className="rogym-sx-d88f932f">Hiện tại chưa có gói tập nào. Vui lòng liên hệ gym.</p>
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
                      Phổ biến nhất
                    </span>
                  )}
                  <p className="rogym-sx-44e91bb7">
                    {pkg.name}
                  </p>
                  <p className="rogym-sx-ebc446b7">
                    {formatVnd(pkg.price)}
                    <span className="rogym-sx-55a40d82"> /gói</span>
                  </p>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-2 rogym-sx-c2ff5e7f">
                      <Calendar size={14} />
                      <span>{pkg.durationDays} ngày</span>
                    </div>
                    {pkg.includesPt ? (
                      <span className="flex items-center gap-1 rounded-full bg-[rgba(66,224,158,0.15)] px-2 py-0.5 text-xs font-medium text-[var(--rogym-accent)]">
                        <UserCheck size={11} /> Có PT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium rogym-text-dim">
                        <UserX size={11} /> Tự tập
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
                    {isSelected ? 'Đã chọn' : 'Chọn gói này'}
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
                  Xác nhận thanh toán
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
                    <p className="rogym-sx-0cce7195">{selected.durationDays} ngày</p>
                    {selected.includesPt ? (
                      <span className="flex items-center gap-1 rounded-full bg-[rgba(66,224,158,0.15)] px-2 py-0.5 text-xs font-medium text-[var(--rogym-accent)]">
                        <UserCheck size={11} /> Có PT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium rogym-text-dim">
                        <UserX size={11} /> Tự tập
                      </span>
                    )}
                  </div>
                </div>
                <p className="rogym-sx-1eee35cb">{formatVnd(selected.price)}</p>
              </div>

              {/* Payment method */}
              <p className="rogym-sx-9259d65d">Phương thức thanh toán</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {PAYMENT_METHOD_OPTIONS.map(opt => (
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
                {paying ? 'Đang xử lý thanh toán...' : `Thanh toán ${formatVnd(selected.price)}`}
              </BtnPrimary>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
