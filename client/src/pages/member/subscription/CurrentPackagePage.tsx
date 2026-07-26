import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Button } from '@/components/ui/Button'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { parsePackageBenefits } from '@/lib/package'
import {
  gymDateKey,
  isSubscriptionActive,
  subscriptionEndDateKey,
} from '@/lib/subscription'
import { toast } from 'sonner'

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
  const endDate = subscriptionEndDateKey(s.endDate)
  if ((s.status === 'active' || s.status === 'expired') && endDate && endDate < gymDateKey())
    return 'ended'
  return s.status
}

export default function CurrentPackagePage() {
  const { t } = useTranslation('member')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [pkg, setPkg] = useState<Package | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const [pkgModalOpen, setPkgModalOpen] = useState(false)
  const [allPkgs, setAllPkgs] = useState<Package[]>([])
  const [allPkgsLoading, setAllPkgsLoading] = useState(false)
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgPtFilter, setPkgPtFilter] = useState<'all' | 'pt' | 'no-pt'>('all')
  const [pkgSortAsc, setPkgSortAsc] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const setResolvedStatus = useSubscriptionStore((s) => s.setResolvedStatus)

  useEffect(() => {
    if (location.state?.justActivated) {
      toast.success(t('subscription.current.toastActivated'))
      window.history.replaceState({}, '')
    }
  }, [location.state?.justActivated, t])

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
          const active = sorted.find((s) => isSubscriptionActive(s))
          const pending = sorted.find((s) => s.status === 'pending')
          const current = active ?? pending
          setSubscription(current ?? null)
          setResolvedStatus(Boolean(active), memberId)
          if (current?.packageId) {
            packageService
              .get(current.packageId)
              .then(setPkg)
              .catch(() => {})
          }
        } else {
          const status = (subRes.reason as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            clearAuth()
            navigate('/login')
          }
          setError(t('subscription.current.errorLoad'))
        }
        if (payRes.status === 'fulfilled') {
          setPayments(payRes.value.slice(0, 3))
        }
      })
      .finally(() => setLoading(false))
  }, [user?.memberId, navigate, clearAuth, setResolvedStatus, t])

  async function handleCancel() {
    if (!cancelTarget || !user?.memberId) return
    setCancelling(true)
    try {
      await subscriptionService.cancel(cancelTarget.subscriptionId)
      setCancelTarget(null)
      setResolvedStatus(false, user.memberId)
      toast.success(t('subscription.current.toastCancelled'))
      navigate('/member/subscription/setup', { replace: true })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      if (e?.response?.status === 401) {
        clearAuth()
        navigate('/login')
      } else {
        toast.error(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
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
      {/* Cancel dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 rogym-sx-49121f22">
          <div className="rounded-2xl p-8 max-w-sm w-full rogym-sx-83e5c542">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-400 shrink-0" />
              <h3 className="text-lg font-bold text-white m-0">{t('subscription.current.cancelDialog.title')}</h3>
            </div>
            <p className="text-sm rogym-text-secondary leading-relaxed mb-1">
              {t('subscription.current.cancelDialog.titleWithName', {
                name: cancelTarget.packageName ?? t('subscription.current.packageFallback')
              })}
            </p>
            <p className="text-sm rogym-text-secondary leading-relaxed mb-6">
              {cancelTarget.status === 'pending'
                ? t('subscription.current.cancelDialog.bodyPending')
                : t('subscription.current.cancelDialog.bodyActive')}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setCancelTarget(null)
                }}
                className="flex-1"
                variant="outline-white"
              >
                {t('subscription.current.cancelDialog.buttonKeep')}
              </Button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rogym-danger-button flex-1 rounded-full py-2.5 text-sm font-semibold transition-all"
              >
                {cancelling ? t('subscription.current.cancelDialog.buttonCancelling') : t('subscription.current.cancelDialog.buttonConfirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <MemberPageHeader
        eyebrow={t('subscription.current.eyebrow')}
        title={t('subscription.current.title')}
        description={t('subscription.current.description')}
        actions={
          <Button
            onClick={() => void openPkgModal()}
            variant="outline-white"
          >
            {t('subscription.current.actionAvailable')}
          </Button>
        }
      />

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error && !subscription ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle size={40} className="text-red-400" />
          <p className="rogym-text-secondary">{error}</p>
          <Button
            onClick={() => navigate('/member/subscription/setup')}
            variant="primary"
          >
            {t('subscription.current.errorEmpty')}
          </Button>
        </div>
      ) : !subscription ? (
        <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center text-center py-16 gap-4">
          <ShoppingBag size={48} className="rogym-text-secondary" />
          <p className="rogym-text-secondary">{t('subscription.current.emptyState')}</p>
          <Button
            onClick={() => navigate('/member/subscription/setup')}
            variant="primary"
          >
            {t('subscription.current.errorEmpty')}
          </Button>
        </div>
      ) : (
        <>
          {/* Expiring alert */}
          {isExpiring && (
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4 rogym-sx-c090d129">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm flex-1">
                {t('subscription.current.expiringAlert', { days: daysLeft })}
              </p>
              <Button
                onClick={() => navigate('/member/subscription/renew')}
                variant="primary"
                className="text-sm px-4 py-2"
              >
                {t('subscription.current.buttonRenewNow')}
              </Button>
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1fr]">
            {/* ── LEFT: main subscription card ── */}
            <div className="rogym-card rogym-card--compact p-8 flex flex-col gap-6">
              <div>
                <Badge
                  label={t(`subscription.current.statusLabel.${getRealStatus(subscription)}`, { defaultValue: subscription.status })}
                  tone={SUB_STATUS_MAP[getRealStatus(subscription)]?.tone}
                />
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-3">
                  {subscription.packageName ?? pkg?.name ?? t('subscription.current.packageFallback')}
                </h2>
              </div>

              {/* Progress bar — hidden for pending (would show 0% meaninglessly) */}
              {subscription.status !== 'pending' && (
                <div>
                  <div className="flex justify-between mb-2 text-sm rogym-text-secondary">
                    <span>
                      {t('subscription.current.progressDays', { daysUsed, totalDays })}
                    </span>
                    <span className={isExpiring ? 'text-amber-500' : 'rogym-text-accent'}>
                      {t('subscription.current.daysLeft', { daysLeft })}
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
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 rogym-sx-6930dcd2">
                  <CalendarCheck size={16} className="rogym-sx-b2fbf853 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs rogym-text-secondary mb-0.5">{t('subscription.current.fieldStartDate')}</p>
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {formatDate(subscription.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 rogym-sx-6930dcd2">
                  <CalendarX
                    size={16}
                    className={`shrink-0 ${isExpiring ? 'text-amber-500' : 'rogym-text-secondary'}`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs rogym-text-secondary mb-0.5">{t('subscription.current.fieldEndDate')}</p>
                    <p
                      className={`text-xs sm:text-sm font-medium truncate ${isExpiring ? 'text-amber-400' : 'text-white'}`}
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
                    <p className="text-xs rogym-text-secondary mb-0.5">{t('subscription.current.fieldTrainer')}</p>
                    <p className="text-sm font-medium text-white">{subscription.trainerName}</p>
                  </div>
                </div>
              )}

              {/* Cancel + Renew buttons */}
              {(subscription.status === 'active' || subscription.status === 'pending') && (
                <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-white/5">
                  {!packageActive && subscription.status === 'active' && (
                    <p className="text-xs text-amber-400 text-center">
                      {t('subscription.current.cancelledNote')}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button
                      onClick={() => setCancelTarget(subscription)}
                      className="rogym-cancel-outline flex items-center justify-center gap-1.5 whitespace-nowrap w-full sm:w-auto rogym-sx-2fb3205c"
                    >
                      <XCircle size={14} />
                      {t('subscription.current.buttonCancel')}
                    </Button>
                    {packageActive && (
                      <Button
                        onClick={() => navigate('/member/subscription/renew')}
                        variant="primary"
                        className="flex items-center justify-center gap-1.5 whitespace-nowrap w-full sm:w-auto"
                      >
                        <RefreshCw size={14} />
                        {t('subscription.current.buttonRenew')}
                      </Button>
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
                  <h3 className="text-base font-bold text-white mb-4">{t('subscription.current.benefitsTitle')}</h3>
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
                  <h3 className="text-base font-bold text-white">{t('subscription.current.paymentHistoryTitle')}</h3>
                  <Button
                    onClick={() => navigate('/member/subscription/history')}
                    variant="text-accent"
                    className="flex items-center gap-1 text-sm"
                  >
                    {t('subscription.current.buttonViewAll')} <ChevronRight size={14} />
                  </Button>
                </div>
                {payments.length === 0 ? (
                  <p className="text-sm rogym-text-secondary py-4 text-center">
                    {t('subscription.current.noTransactions')}
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
                            label={p.status === 'success' ? t('subscription.current.paymentSuccess') : t('subscription.current.paymentFailed')}
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
              <h2 className="text-lg font-bold text-white">{t('subscription.current.packageModal.title')}</h2>
              <Button
                variant="icon"
                className="rogym-btn--elevated"
                onClick={() => setPkgModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </Button>
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
                  placeholder={t('subscription.current.packageModal.searchPlaceholder')}
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
              <span className="text-xs text-white/40">{t('subscription.current.packageModal.sortLabel')}</span>
              <button
                type="button"
                onClick={() => setPkgSortAsc((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:border-white/20 transition-colors"
              >
                <ArrowUpDown size={11} />
                {pkgSortAsc ? t('subscription.current.packageModal.sortAZ') : t('subscription.current.packageModal.sortZA')}
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
                        {t('subscription.current.packageModal.notFound')}
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
                                  <h3 className="break-words font-bold text-white">{p.name}</h3>
                                  {p.includesPt && (
                                    <span className="shrink-0 rounded-full bg-[rgba(66,224,158,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase text-[#42e09e]">
                                      {t('subscription.current.packageDetail.withPt')}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-xs rogym-text-secondary">
                                  <span>{t('subscription.current.packageDetail.days', { count: p.durationDays })}</span>
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
