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
  ArrowUpDown,
  Users,
  UserX,
} from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService, { type Package } from '@/services/package.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import {
  Page,
  PageHeader,
  PageSkeleton,
  Card,
  Button,
  Badge,
  Modal,
  ConfirmDialog,
  SearchToolbar,
  type BadgeTone,
} from '@/components/ui'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { parsePackageBenefits } from '@/lib/package'
import {
  gymDateKey,
  isSubscriptionActive,
  subscriptionEndDateKey,
} from '@/lib/subscription'
import { toast } from '@/lib/toast'

const SUB_STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
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
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
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
    <Page>
      {/* Cancel dialog */}
      {cancelTarget && (
        <ConfirmDialog
          open={!!cancelTarget}
          title={t('subscription.current.cancelDialog.title')}
          variant="danger"
          loading={cancelling}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancel}
          description={
            <div className="space-y-1">
              <p className="font-semibold text-white">
                {t('subscription.current.cancelDialog.titleWithName', {
                  name: cancelTarget.packageName ?? t('subscription.current.packageFallback'),
                })}
              </p>
              <p>
                {cancelTarget.status === 'pending'
                  ? t('subscription.current.cancelDialog.bodyPending')
                  : t('subscription.current.cancelDialog.bodyActive')}
              </p>
            </div>
          }
          cancelLabel={t('subscription.current.cancelDialog.buttonKeep')}
          confirmLabel={t('subscription.current.cancelDialog.buttonConfirmCancel')}
        />
      )}

      <PageHeader
        eyebrow={t('subscription.current.eyebrow')}
        title={t('subscription.current.title')}
        description={t('subscription.current.description')}
        actions={
          <Button onClick={() => void openPkgModal()} variant="outline-white">
            {t('subscription.current.actionAvailable')}
          </Button>
        }
      />

      {loading ? (
        <PageSkeleton rows={4} />
      ) : error && !subscription ? (
        <Card variant="compact" className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <AlertCircle size={40} className="text-red-400" />
          <p className="rogym-text-secondary">{error}</p>
          <Button onClick={() => navigate('/member/subscription/setup')} variant="primary">
            {t('subscription.current.errorEmpty')}
          </Button>
        </Card>
      ) : !subscription ? (
        <Card variant="compact" className="flex flex-col items-center justify-center text-center py-16 gap-4">
          <ShoppingBag size={48} className="rogym-text-secondary" />
          <p className="rogym-text-secondary">{t('subscription.current.emptyState')}</p>
          <Button onClick={() => navigate('/member/subscription/setup')} variant="primary">
            {t('subscription.current.errorEmpty')}
          </Button>
        </Card>
      ) : (
        <>
          {/* Expiring alert */}
          {isExpiring && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm flex-1">
                {t('subscription.current.expiringAlert', { days: daysLeft })}
              </p>
              <Button
                onClick={() => navigate('/member/subscription/renew')}
                variant="primary"
                size="compact"
              >
                {t('subscription.current.buttonRenewNow')}
              </Button>
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1fr]">
            {/* ── LEFT: main subscription card ── */}
            <Card variant="compact" className="p-8 flex flex-col gap-6">
              <div>
                <Badge
                  tone={SUB_STATUS_MAP[getRealStatus(subscription)]?.tone ?? 'muted'}
                >
                  {t(`subscription.current.statusLabel.${getRealStatus(subscription)}`, {
                    defaultValue: subscription.status,
                  })}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-3">
                  {subscription.packageName ?? pkg?.name ?? t('subscription.current.packageFallback')}
                </h2>
              </div>

              {/* Progress bar — hidden for pending */}
              {subscription.status !== 'pending' && (
                <div>
                  <div className="flex justify-between mb-2 text-sm rogym-text-secondary">
                    <span>
                      {t('subscription.current.progressDays', { daysUsed, totalDays })}
                    </span>
                    <span className={isExpiring ? 'text-amber-400' : 'text-[var(--rogym-teal)]'}>
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
                <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 sm:px-4 py-2.5 sm:py-3">
                  <CalendarCheck size={16} className="text-[var(--rogym-teal)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs rogym-text-secondary mb-0.5">{t('subscription.current.fieldStartDate')}</p>
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {formatDate(subscription.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 sm:px-4 py-2.5 sm:py-3">
                  <CalendarX
                    size={16}
                    className={`shrink-0 ${isExpiring ? 'text-amber-400' : 'rogym-text-secondary'}`}
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
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
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
                      variant="danger"
                      className="w-full sm:w-auto"
                    >
                      <XCircle size={14} />
                      {t('subscription.current.buttonCancel')}
                    </Button>
                    {packageActive && (
                      <Button
                        onClick={() => navigate('/member/subscription/renew')}
                        variant="primary"
                        className="w-full sm:w-auto"
                      >
                        <RefreshCw size={14} />
                        {t('subscription.current.buttonRenew')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* ── RIGHT: stacked cards ── */}
            <div className="flex flex-col gap-4">
              {/* Benefits */}
              {benefits.length > 0 && (
                <Card variant="compact">
                  <h3 className="text-base font-bold text-white mb-4">{t('subscription.current.benefitsTitle')}</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm rogym-text-secondary">
                        <Check size={14} className="text-[var(--rogym-teal)]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Payment history preview */}
              <Card variant="compact">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">{t('subscription.current.paymentHistoryTitle')}</h3>
                  <Button
                    onClick={() => navigate('/member/subscription/history')}
                    variant="text-accent"
                    size="compact"
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
                          <span className="text-sm font-semibold text-[var(--rogym-teal)]">
                            {formatVnd(p.amount)}
                          </span>
                          <Badge
                            tone={p.status === 'success' ? 'success' : 'danger'}
                          >
                            {p.status === 'success'
                              ? t('subscription.current.paymentSuccess')
                              : t('subscription.current.paymentFailed')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Package list modal */}
      <Modal
        open={pkgModalOpen}
        title={t('subscription.current.packageModal.title')}
        onClose={() => setPkgModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          {/* Search + PT toggle */}
          <SearchToolbar
            variant="plain"
            layout="row"
            placeholder={t('subscription.current.packageModal.searchPlaceholder')}
            value={pkgSearch}
            onChange={setPkgSearch}
            filters={
              <Button
                type="button"
                variant={pkgPtFilter === 'pt' ? 'primary' : 'outline-white'}
                size="compact"
                onClick={() =>
                  setPkgPtFilter((f) => (f === 'all' ? 'pt' : f === 'pt' ? 'no-pt' : 'all'))
                }
              >
                {pkgPtFilter === 'pt' ? (
                  <span className="flex items-center gap-1">
                    <Users size={12} /> Có PT
                  </span>
                ) : pkgPtFilter === 'no-pt' ? (
                  <span className="flex items-center gap-1">
                    <UserX size={12} /> Không PT
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ArrowUpDown size={12} /> Lọc PT
                  </span>
                )}
              </Button>
            }
          />

          {/* Sort row */}
          <div className="flex items-center gap-2">
            <span className="text-xs rogym-text-dim">{t('subscription.current.packageModal.sortLabel')}</span>
            <Button
              variant="outline-white"
              size="compact"
              onClick={() => setPkgSortAsc((v) => !v)}
            >
              <ArrowUpDown size={11} />
              {pkgSortAsc ? t('subscription.current.packageModal.sortAZ') : t('subscription.current.packageModal.sortZA')}
            </Button>
          </div>

          {/* List */}
          <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
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
                        <Card
                          key={p.packageId}
                          variant="compact"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="break-words font-bold text-white">{p.name}</h3>
                                {p.includesPt && (
                                  <Badge tone="accent" badgeSize="sm">
                                    {t('subscription.current.packageDetail.withPt')}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs rogym-text-secondary">
                                <span>{t('subscription.current.packageDetail.days', { count: p.durationDays })}</span>
                                <span className="font-semibold text-[var(--rogym-teal)]">
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
                                    className="mt-0.5 shrink-0 text-[var(--rogym-teal)]"
                                  />
                                  {b}
                                </li>
                              ))}
                            </ul>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )
              })()
            )}
          </div>
        </div>
      </Modal>
    </Page>
  )
}
