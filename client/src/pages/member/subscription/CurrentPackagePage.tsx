import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarX,
  AlertTriangle,
  AlertCircle,
  Check,
  Clock,
  ShoppingBag,
  XCircle,
  RefreshCw,
  ChevronRight,
  Search,
  X,
  ArrowUpDown,
  Users,
  UserX,
} from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from '@/components/MemberUI'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { parsePackageBenefits } from '@/lib/package'

function Badge({ label, tone = 'muted' }: { label: string; tone?: string }) {
  return (
    <span className="rogym-tone-badge is-large" data-tone={tone}>
      {label}
    </span>
  )
}

const SUB_STATUS_MAP: Record<string, { label: string; tone: string }> = {
  active: { label: 'Đang hoạt động', tone: 'success' },
  pending: { label: 'Chờ kích hoạt', tone: 'warning' },
  expired: { label: 'Đã hết hạn', tone: 'danger' },
  cancelled: { label: 'Đã huỷ', tone: 'muted' },
  ended: { label: 'Đã kết thúc', tone: 'danger' },
}

function getRealStatus(s: Subscription): string {
  if ((s.status === 'active' || s.status === 'expired') && new Date(s.endDate) < new Date())
    return 'ended'
  return s.status
}

export default function CurrentPackagePage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [pkg, setPkg] = useState<Package | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const [pkgModalOpen, setPkgModalOpen] = useState(false)
  const [allPkgs, setAllPkgs] = useState<Package[]>([])
  const [allPkgsLoading, setAllPkgsLoading] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgPtFilter, setPkgPtFilter] = useState<'all' | 'pt' | 'no-pt'>('all')
  const [pkgSortAsc, setPkgSortAsc] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const setHasActiveSub = useSubscriptionStore((s) => s.setHasActiveSub)

  useEffect(() => {
    if (location.state?.justActivated) {
      setToast('Gói tập đã được kích hoạt thành công!')
      setTimeout(() => setToast(null), 4000)
      window.history.replaceState({}, '')
    }
  }, [location.state?.justActivated])

  useEffect(() => {
    if (!user?.memberId) return
    const memberId = user.memberId

    Promise.allSettled([
      subscriptionService.getByMember(memberId),
      paymentService.listByMember(memberId),
    ])
      .then(([subRes, payRes]) => {
        if (subRes.status === 'fulfilled') {
          const sorted = subRes.value.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          const today = new Date()
          const active =
            sorted.find((s) => s.status === 'active' && new Date(s.endDate) >= today) ??
            sorted.find((s) => s.status === 'pending' && new Date(s.endDate) >= today)
          setSubscription(active ?? null)
          setHasActiveSub(!!active)
          if (active?.packageId) {
            packageService
              .get(active.packageId)
              .then(setPkg)
              .catch(() => {})
          }
        } else {
          const status = (subRes.reason as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            clearAuth()
            navigate('/login')
          }
          setError('Không thể tải thông tin gói tập.')
        }
        if (payRes.status === 'fulfilled') {
          setPayments(payRes.value.slice(0, 3))
        }
      })
      .finally(() => setLoading(false))
  }, [user?.memberId, navigate, clearAuth, setHasActiveSub])

  async function handleCancel() {
    if (!cancelTarget || !user?.memberId) return
    setCancelling(true)
    setCancelError(null)
    try {
      await subscriptionService.cancel(cancelTarget.subscriptionId)
      setCancelTarget(null)
      setHasActiveSub(false)
      setToast('Đã hủy gói tập thành công.')
      setTimeout(() => {
        setToast(null)
        navigate('/member/subscription/setup', { replace: true })
      }, 1500)
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      if (e?.response?.status === 401) {
        clearAuth()
        navigate('/login')
      } else {
        setCancelError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } finally {
      setCancelling(false)
    }
  }

  async function openPkgModal() {
    setPkgModalOpen(true)
    if (allPkgs.length === 0) {
      setAllPkgsLoading(true)
      try {
        const { data } = await packageService.list({ status: 'active' })
        setAllPkgs(data)
      } catch {
        /* silent */
      } finally {
        setAllPkgsLoading(false)
      }
    }
  }

  const daysLeft = subscription?.daysLeft ?? 0
  // Tổng ngày = span thực tế (đã gồm gia hạn), tránh daysUsed âm khi endDate đã được cộng dồn.
  const spanDays = subscription
    ? Math.round(
        (new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) /
          86400000
      )
    : 0
  const totalDays = spanDays > 0 ? spanDays : (pkg?.durationDays ?? 1)
  const daysUsed = Math.max(0, totalDays - daysLeft)
  const progress = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100))
  const packageActive = subscription?.package?.status === 'active'
  const isExpiring = subscription?.status === 'active' && daysLeft <= 7 && daysLeft > 0 && packageActive
  const benefits = parsePackageBenefits(pkg?.benefits ?? null)

  return (
    <MemberPage>
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl rogym-sx-572c9565">
          {toast}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 rogym-sx-49121f22">
          <div className="rounded-2xl p-8 max-w-sm w-full rogym-sx-83e5c542">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-400 shrink-0" />
              <h3 className="text-lg font-bold text-white m-0">Xác nhận hủy gói</h3>
            </div>
            <p className="text-sm rogym-text-secondary leading-relaxed mb-1">
              Hủy gói{' '}
              <strong className="text-white">{cancelTarget.packageName ?? 'gói tập'}</strong>?
            </p>
            <p className="text-sm rogym-text-secondary leading-relaxed mb-6">
              {cancelTarget.status === 'pending'
                ? 'Gói chờ kích hoạt này sẽ bị hủy.'
                : 'Hủy gói sẽ mất quyền truy cập ngay lập tức.'}{' '}
              <strong className="text-red-400">KHÔNG hoàn tiền.</strong> Bạn có chắc chắn?
            </p>
            {cancelError && <p className="text-red-300 text-sm mb-3">{cancelError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelTarget(null)
                  setCancelError(null)
                }}
                className="rogym-btn rogym-btn--outline-white flex-1"
              >
                Không, giữ lại
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rogym-danger-button flex-1 rounded-full py-2.5 text-sm font-semibold transition-all"
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MemberPageHeader
        eyebrow="Gói tập"
        title="Gói tập hiện tại"
        description="Thông tin gói đăng ký và quyền lợi của bạn."
        actions={
          <button
            onClick={() => void openPkgModal()}
            className="rogym-btn rogym-btn--outline-white"
          >
            Các gói hiện có
          </button>
        }
      />

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error && !subscription ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle size={40} className="text-red-400" />
          <p className="rogym-text-secondary">{error}</p>
          <button
            onClick={() => navigate('/member/subscription/setup')}
            className="rogym-btn rogym-btn--primary"
          >
            Chọn gói tập
          </button>
        </div>
      ) : !subscription ? (
        <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center text-center py-16 gap-4">
          <ShoppingBag size={48} className="rogym-text-secondary" />
          <p className="rogym-text-secondary">Bạn chưa có gói tập nào đang hoạt động.</p>
          <button
            onClick={() => navigate('/member/subscription/setup')}
            className="rogym-btn rogym-btn--primary"
          >
            Chọn gói tập
          </button>
        </div>
      ) : (
        <>
          {/* Expiring alert */}
          {isExpiring && (
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4 rogym-sx-c090d129">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm flex-1">
                Gói tập sắp hết hạn trong <strong>{daysLeft} ngày</strong>. Hãy gia hạn ngay để
                không bị gián đoạn.
              </p>
              <button
                onClick={() => navigate('/member/subscription/renew')}
                className="rogym-btn rogym-btn--primary text-sm px-4 py-2"
              >
                Gia hạn
              </button>
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1fr]">
            {/* ── LEFT: main subscription card ── */}
            <div className="rogym-card rogym-card--compact p-8 flex flex-col gap-6">
              <div>
                <Badge
                  label={SUB_STATUS_MAP[getRealStatus(subscription)]?.label ?? subscription.status}
                  tone={SUB_STATUS_MAP[getRealStatus(subscription)]?.tone}
                />
                <h2 className="text-2xl font-bold text-white mt-3">
                  {subscription.packageName ?? pkg?.name ?? 'Gói tập'}
                </h2>
              </div>

              {/* Progress bar — hidden for pending (would show 0% meaninglessly) */}
              {subscription.status !== 'pending' && (
                <div>
                  <div className="flex justify-between mb-2 text-sm rogym-text-secondary">
                    <span>
                      {daysUsed} ngày đã dùng / {totalDays} ngày
                    </span>
                    <span className={isExpiring ? 'text-amber-500' : 'rogym-text-accent'}>
                      Còn {daysLeft} ngày
                    </span>
                  </div>
                  <progress
                    className={`rogym-progress ${isExpiring ? 'is-warning' : ''}`}
                    max={100}
                    value={progress}
                    aria-label={`${progress}% thời hạn gói đã sử dụng`}
                  />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 rogym-sx-6930dcd2">
                  <CalendarCheck size={18} className="rogym-sx-b2fbf853" />
                  <div>
                    <p className="text-xs rogym-text-secondary mb-0.5">Ngày bắt đầu</p>
                    <p className="text-sm font-medium text-white">
                      {formatDate(subscription.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 rogym-sx-6930dcd2">
                  <CalendarX
                    size={18}
                    className={isExpiring ? 'text-amber-500' : 'rogym-text-secondary'}
                  />
                  <div>
                    <p className="text-xs rogym-text-secondary mb-0.5">Ngày hết hạn</p>
                    <p
                      className={`text-sm font-medium ${isExpiring ? 'text-amber-400' : 'text-white'}`}
                    >
                      {formatDate(subscription.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trainer info */}
              {subscription.trainerId && subscription.trainerName && (
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 rogym-sx-6930dcd2">
                  <div>
                    <p className="text-xs rogym-text-secondary mb-0.5">Huấn luyện viên</p>
                    <p className="text-sm font-medium text-white">{subscription.trainerName}</p>
                  </div>
                </div>
              )}

              {/* Cancel + Renew buttons */}
              {(subscription.status === 'active' || subscription.status === 'pending') && (
                <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-white/5">
                  {!packageActive && subscription.status === 'active' && (
                    <p className="text-xs text-amber-400 text-center">
                      Gói tập này đã ngừng bán — bạn vẫn sử dụng đến hết hạn. Khi hết hạn, vui lòng chọn gói mới.
                    </p>
                  )}
                  <div className="flex justify-between gap-3">
                    <button
                      onClick={() => setCancelTarget(subscription)}
                      className="rogym-cancel-outline rogym-btn flex items-center gap-1.5 rogym-sx-2fb3205c"
                    >
                      <XCircle size={14} />
                      Hủy gói
                    </button>
                    {packageActive && (
                      <button
                        onClick={() => navigate('/member/subscription/renew')}
                        className="rogym-btn rogym-btn--primary flex items-center gap-1.5"
                      >
                        <RefreshCw size={14} />
                        Gia hạn
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: stacked cards ── */}
            <div className="flex flex-col gap-4">
              {/* Benefits */}
              {benefits.length > 0 && (
                <div className="rogym-card rogym-card--compact p-5">
                  <h3 className="text-base font-bold text-white mb-4">Quyền lợi gói tập</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm rogym-text-secondary">
                        <Check size={14} className="rogym-sx-9b3528d7" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Payment history preview */}
              <div className="rogym-card rogym-card--compact p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Lịch sử thanh toán</h3>
                  <button
                    onClick={() => navigate('/member/subscription/history')}
                    className="rogym-text-link rogym-text-link--accent flex items-center gap-1 text-sm"
                  >
                    Xem tất cả <ChevronRight size={14} />
                  </button>
                </div>
                {payments.length === 0 ? (
                  <p className="text-sm rogym-text-secondary py-4 text-center">
                    Chưa có giao dịch nào.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {payments.map((p) => (
                      <div key={p.paymentId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock size={14} className="rogym-text-secondary" />
                          <div>
                            <p className="text-sm text-white">{formatDate(p.paidAt)}</p>
                            <p className="text-xs rogym-text-secondary">
                              {getPaymentMethodLabel(p.method, true)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold rogym-sx-b2fbf853">
                            {formatVnd(p.amount)}
                          </span>
                          <Badge
                            label={p.status === 'success' ? 'Thành công' : 'Thất bại'}
                            tone={p.status === 'success' ? 'success' : 'danger'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Package list modal */}
      {pkgModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 rogym-sx-8578aed4"
          onClick={() => setPkgModalOpen(false)}
        >
          <div
            className="relative flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] rogym-sx-1f8ae2ef"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4">
              <h2 className="text-lg font-bold text-white">Danh sách gói tập</h2>
              <button
                type="button"
                className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                onClick={() => setPkgModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search + PT toggle (8fr / 2fr) */}
            <div className="flex gap-2 px-6 pb-3">
              <div className="relative" style={{ flex: 8 }}>
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-secondary pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Tìm tên gói..."
                  value={pkgSearch}
                  onChange={(e) => setPkgSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--rogym-teal)] focus:outline-none"
                />
              </div>
              <button
                type="button"
                style={{ flex: 2 }}
                onClick={() =>
                  setPkgPtFilter((f) => (f === 'all' ? 'pt' : f === 'pt' ? 'no-pt' : 'all'))
                }
                className={`rounded-xl border text-xs font-semibold transition-colors ${
                  pkgPtFilter === 'pt'
                    ? 'border-[var(--rogym-teal)] bg-[rgba(6,195,132,0.12)] text-[#42e09e]'
                    : pkgPtFilter === 'no-pt'
                      ? 'border-red-400/40 bg-red-400/10 text-red-300'
                      : 'border-white/10 bg-white/5 text-white/50'
                }`}
              >
                {pkgPtFilter === 'pt' ? (
                  <span className="flex items-center justify-center gap-1">
                    <Users size={12} /> Có PT
                  </span>
                ) : pkgPtFilter === 'no-pt' ? (
                  <span className="flex items-center justify-center gap-1">
                    <UserX size={12} /> Không PT
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <ArrowUpDown size={12} /> Lọc PT
                  </span>
                )}
              </button>
            </div>

            {/* Sort row */}
            <div className="flex items-center gap-2 px-6 pb-3">
              <span className="text-xs text-white/40">Sắp xếp:</span>
              <button
                type="button"
                onClick={() => setPkgSortAsc((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:border-white/20 transition-colors"
              >
                <ArrowUpDown size={11} />
                Tên {pkgSortAsc ? 'A → Z' : 'Z → A'}
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {allPkgsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-[var(--rogym-teal)]" />
                </div>
              ) : (
                (() => {
                  const filtered = allPkgs
                    .filter((p) => {
                      if (pkgSearch && !p.name.toLowerCase().includes(pkgSearch.toLowerCase()))
                        return false
                      if (pkgPtFilter === 'pt' && !p.includesPt) return false
                      if (pkgPtFilter === 'no-pt' && p.includesPt) return false
                      return true
                    })
                    .sort((a, b) =>
                      pkgSortAsc
                        ? a.name.localeCompare(b.name, 'vi')
                        : b.name.localeCompare(a.name, 'vi')
                    )

                  if (filtered.length === 0)
                    return (
                      <p className="py-8 text-center text-sm rogym-text-secondary">
                        Không tìm thấy gói nào.
                      </p>
                    )

                  return (
                    <div className="space-y-3">
                      {filtered.map((p) => {
                        const bens = parsePackageBenefits(p.benefits)
                        return (
                          <div
                            key={p.packageId}
                            className="rounded-[16px] border border-white/5 bg-white/[0.03] px-5 py-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="truncate font-bold text-white">{p.name}</h3>
                                  {p.includesPt && (
                                    <span className="shrink-0 rounded-full bg-[rgba(66,224,158,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase text-[#42e09e]">
                                      Có PT
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-xs rogym-text-secondary">
                                  <span>{p.durationDays} ngày</span>
                                  <span className="font-semibold rogym-sx-b2fbf853">
                                    {formatVnd(p.price)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {bens.length > 0 && (
                              <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {bens.map((b, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-xs rogym-text-secondary"
                                  >
                                    <Check
                                      size={11}
                                      className="mt-0.5 shrink-0 rogym-sx-b2fbf853"
                                    />
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
