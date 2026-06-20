import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronRight, RotateCcw, Search, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { formatVnd } from '@/lib/currency'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import paymentService from '@/services/payment.service'
import packageService, { type Package } from '@/services/package.service'
import trainerService, { type Trainer } from '@/services/trainer.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffStatusBadge,
} from '@/components/StaffUI'

type PaymentMethod = 'cash' | 'bank_card' | 'ewallet'
type WizardStep = 'select-member' | 'review-sub' | 'select-package' | 'select-trainer' | 'payment' | 'success'
type WizardMode = 'renew' | 'new'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_card', label: 'Thẻ ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
]

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'pending_verification', label: 'Chờ xác thực' },
  { value: 'locked', label: 'Đã khóa' },
]

function stepToNumber(step: WizardStep): number {
  if (step === 'select-member') return 1
  if (step === 'review-sub' || step === 'select-package' || step === 'select-trainer') return 2
  return 3
}

function StepIndicator({ step, mode }: { step: WizardStep; mode: WizardMode | null }) {
  const current = stepToNumber(step)
  const steps = [
    { n: 1, label: 'Chọn hội viên' },
    { n: 2, label: mode === 'new' ? 'Chọn gói mới' : 'Thông tin gói' },
    { n: 3, label: 'Thanh toán' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done = current > s.n
        const active = current === s.n
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  done
                    ? 'bg-[var(--rogym-green)] text-white'
                    : active
                      ? 'border-2 border-[var(--rogym-green)] text-[var(--rogym-green)]'
                      : 'border border-white/20 rogym-text-dim',
                ].join(' ')}
              >
                {done ? <Check size={16} strokeWidth={2.5} /> : s.n}
              </div>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap',
                  active ? 'text-[var(--rogym-teal)]' : done ? 'rogym-text-secondary' : 'rogym-text-dim',
                ].join(' ')}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  'flex-1 h-px mx-3 mb-5',
                  done ? 'bg-[var(--rogym-green)]' : 'bg-white/10',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Select member ────────────────────────────────────────────────────

function subStatusTone(status: string | undefined) {
  if (status === 'active') return 'success'
  if (status === 'expired') return 'danger'
  if (status === 'pending') return 'warning'
  return 'muted'
}

function SelectMemberStep({ onSelect }: { onSelect: (m: TrainerStudentSummary) => void }) {
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [members, setMembers] = useState<TrainerStudentSummary[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    memberService
      .list({
        page,
        pageSize: 12,
        search: appliedSearch || undefined,
        status: statusFilter || undefined,
      })
      .then((res) => {
        setMembers(res.data)
        setTotalPages(Math.max(1, Math.ceil(res.total / 12)))
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải danh sách hội viên.')))
      .finally(() => setLoading(false))
  }, [page, appliedSearch, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  function applySearch() {
    setPage(1)
    setAppliedSearch(search)
  }

  function changeStatus(val: string) {
    setPage(1)
    setStatusFilter(val)
  }

  return (
    <div className="space-y-4">
      {/* Search + filter chips — one row */}
      <div className="rogym-card rogym-card--compact p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim" size={16} />
          <input
            className="rogym-input pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Tên, email hoặc mã hội viên..."
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => changeStatus(f.value)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                statusFilter === f.value
                  ? 'bg-[var(--rogym-green)] border-[var(--rogym-green)] text-white'
                  : 'border-white/15 rogym-text-secondary hover:border-white/30 hover:text-white',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button type="button" className="rogym-btn rogym-btn--primary h-9 px-4 text-sm" onClick={applySearch}>
          Tìm
        </button>
      </div>

      {loading ? (
        <StaffSkeleton rows={5} />
      ) : error ? (
        <StaffErrorState message={error} onRetry={load} />
      ) : members.length === 0 ? (
        <StaffEmptyState title="Không tìm thấy hội viên" description="Thử thay đổi từ khóa hoặc bộ lọc." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                <tr>
                  <th className="px-5 py-4">Hội viên</th>
                  <th className="px-5 py-4">Gói tập</th>
                  <th className="px-5 py-4">Hết hạn</th>
                  <th className="px-5 py-4">Trạng thái gói</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.memberId} className="border-t border-white/5 bg-[var(--rogym-bg-card)]">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{m.fullName}</div>
                      <div className="mt-0.5 text-xs rogym-text-dim">
                        {m.memberCode} · {m.email}
                      </div>
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {m.activeSubscription?.packageName ?? (
                        <span className="rogym-text-dim italic">Chưa có gói</span>
                      )}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {m.activeSubscription?.endDate
                        ? formatDate(m.activeSubscription.endDate)
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {m.activeSubscription ? (
                        <span
                          className="rogym-tone-badge"
                          data-tone={subStatusTone(m.activeSubscription.status)}
                        >
                          {m.activeSubscription.status === 'active'
                            ? 'Đang hoạt động'
                            : m.activeSubscription.status === 'expired'
                              ? 'Đã hết hạn'
                              : m.activeSubscription.status === 'pending'
                                ? 'Chờ thanh toán'
                                : m.activeSubscription.status}
                        </span>
                      ) : (
                        <span className="rogym-tone-badge" data-tone="muted">Chưa có gói</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        className="rogym-text-link rogym-text-link--accent"
                        onClick={() => onSelect(m)}
                      >
                        Chọn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {members.map((m) => (
              <button
                key={m.memberId}
                type="button"
                className="rogym-card rogym-card--compact rogym-card--interactive w-full p-5 text-left"
                onClick={() => onSelect(m)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                      <UserRound size={19} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{m.fullName}</div>
                      <div className="text-xs rogym-text-dim">{m.memberCode}</div>
                    </div>
                  </div>
                  <span
                    className="rogym-tone-badge shrink-0"
                    data-tone={subStatusTone(m.activeSubscription?.status)}
                  >
                    {m.activeSubscription?.status === 'active'
                      ? 'Đang HĐ'
                      : m.activeSubscription?.status === 'expired'
                        ? 'Hết hạn'
                        : 'Chưa có'}
                  </span>
                </div>
                <div className="mt-2.5 text-sm rogym-text-secondary">
                  {m.activeSubscription?.packageName ?? 'Chưa có gói tập'}
                  {m.activeSubscription?.endDate && (
                    <span className="ml-1.5 text-xs rogym-text-dim">
                      · đến {formatDate(m.activeSubscription.endDate)}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="rogym-text-link rogym-text-link--accent text-sm">Chọn →</span>
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </button>
              <span className="text-sm rogym-text-secondary">{page}/{totalPages}</span>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Step 2a: Review subscription (renew flow) ────────────────────────────────

function ReviewSubscriptionStep({
  member,
  onBack,
  onProceed,
  onProceedNew,
}: {
  member: TrainerStudentSummary
  onBack: () => void
  onProceed: (sub: Subscription) => void
  onProceedNew: () => void
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noRenewable, setNoRenewable] = useState(false)
  const [packageInactive, setPackageInactive] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const subId = member.activeSubscription?.subscriptionId
    if (!subId) {
      setNoRenewable(true)
      setLoading(false)
      return
    }

    subscriptionService
      .get(subId)
      .then((sub) => {
        const statusOk = sub.status === 'active' || sub.status === 'expired'
        const pkgOk = sub.package?.status === 'active'
        if (!statusOk) {
          setNoRenewable(true)
        } else if (!pkgOk) {
          setPackageInactive(true)
          setSubscription(sub)
        } else {
          setSubscription(sub)
        }
      })
      .catch(() => setError('Không thể tải thông tin gói tập.'))
      .finally(() => setLoading(false))
  }, [member])

  if (loading) {
    return (
      <div className="space-y-4">
        <StaffSkeleton rows={3} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Member info card */}
      <div className="rogym-card rogym-card--compact p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
          <UserRound size={22} />
        </div>
        <div>
          <div className="font-bold text-white">{member.fullName}</div>
          <div className="text-sm rogym-text-dim">
            {member.memberCode} · {member.email}
          </div>
        </div>
        <StaffStatusBadge status={member.status} />
      </div>

      {error && <StaffErrorState message={error} />}

      {noRenewable && !error && (
        <div className="rogym-card rogym-card--compact p-6 text-center space-y-4">
          <div>
            <p className="font-medium text-white">Không có gói tập phù hợp để gia hạn</p>
            <p className="mt-1 text-sm rogym-text-dim">
              Hội viên này chưa có gói tập hoặc gói đã bị huỷ.
              Nhân viên có thể đăng ký gói mới ngay tại đây.
            </p>
          </div>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={onProceedNew}
          >
            Đăng ký gói mới cho hội viên
          </button>
        </div>
      )}

      {subscription && (
        <div className="rogym-card rogym-card--compact p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Thông tin gói tập hiện tại</h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoPair label="Tên gói" value={subscription.packageName ?? '—'} />
            <InfoPair
              label="Trạng thái"
              value={
                subscription.status === 'active'
                  ? 'Đang hoạt động'
                  : subscription.status === 'expired'
                    ? 'Đã hết hạn'
                    : subscription.status
              }
            />
            <InfoPair label="Ngày bắt đầu" value={formatDate(subscription.startDate)} />
            <InfoPair label="Ngày hết hạn" value={formatDate(subscription.endDate)} />
            {subscription.daysLeft !== null && subscription.daysLeft > 0 && (
              <InfoPair label="Còn lại" value={`${subscription.daysLeft} ngày`} />
            )}
            {subscription.package && (
              <>
                <InfoPair label="Thời hạn gia hạn" value={`${subscription.package.durationDays} ngày`} />
                <InfoPair
                  label="Phí gia hạn"
                  value={formatVnd(Number(subscription.package.price))}
                />
              </>
            )}
          </div>

          {subscription.package && (
            <div className="flex items-center justify-between rounded-xl border border-[rgba(6,195,132,0.25)] bg-[rgba(6,195,132,0.06)] px-4 py-3">
              <div>
                <span className="rogym-text-secondary text-sm">Gia hạn thêm </span>
                <span className="font-semibold text-white">{subscription.package.durationDays} ngày</span>
              </div>
              <span className="text-lg font-bold text-[var(--rogym-teal)]">
                {formatVnd(Number(subscription.package.price))}
              </span>
            </div>
          )}
        </div>
      )}

      {packageInactive && subscription && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            Gói <strong className="text-amber-200">{subscription.packageName}</strong> đã ngừng bán — không thể gia hạn.
            Hội viên vẫn sử dụng đến hết hạn. Nếu muốn, hãy đăng ký gói mới.
          </span>
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onBack}>
          Quay lại
        </button>
        {subscription && !packageInactive && (
          <button
            type="button"
            className="rogym-btn rogym-btn--primary flex items-center gap-2"
            onClick={() => onProceed(subscription)}
          >
            Tiến hành gia hạn <ChevronRight size={16} />
          </button>
        )}
        {packageInactive && (
          <button
            type="button"
            className="rogym-btn rogym-btn--primary flex items-center gap-2"
            onClick={onProceedNew}
          >
            Đăng ký gói mới <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step 2b: Select package (new subscription flow) ─────────────────────────

function SelectPackageStep({
  member,
  onBack,
  onSelect,
}: {
  member: TrainerStudentSummary
  onBack: () => void
  onSelect: (pkg: Package) => void
}) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Package | null>(null)

  useEffect(() => {
    packageService
      .list({ status: 'active' })
      .then((res) => setPackages(res.data))
      .catch(() => setError('Không thể tải danh sách gói tập.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      {/* Member info card */}
      <div className="rogym-card rogym-card--compact p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
          <UserRound size={22} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-white">{member.fullName}</div>
          <div className="text-sm rogym-text-dim">{member.memberCode} · {member.email}</div>
        </div>
        <span className="rogym-tone-badge" data-tone="muted">Chưa có gói</span>
      </div>

      {loading ? (
        <StaffSkeleton rows={3} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : packages.length === 0 ? (
        <StaffEmptyState
          title="Không có gói tập nào"
          description="Chưa có gói tập đang hoạt động. Liên hệ quản lý để thêm gói mới."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isSelected = selected?.packageId === pkg.packageId
            return (
              <button
                key={pkg.packageId}
                type="button"
                onClick={() => setSelected(pkg)}
                className={[
                  'rogym-card rogym-card--interactive text-left p-5 space-y-2 transition-all',
                  isSelected ? 'border-[var(--rogym-green)] bg-[rgba(6,195,132,0.06)]' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-white">{pkg.name}</div>
                  {isSelected ? (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--rogym-green)]">
                      <Check size={12} className="text-white" strokeWidth={2.5} />
                    </div>
                  ) : pkg.includesPt ? (
                    <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--rogym-teal)] text-[var(--rogym-teal)]">
                      Có PT
                    </span>
                  ) : null}
                </div>
                <div className="text-xl font-bold text-[var(--rogym-teal)]">
                  {formatVnd(Number(pkg.price))}
                </div>
                <div className="text-sm rogym-text-secondary">
                  {pkg.durationDays} ngày{pkg.includesPt ? ' · Kèm PT cá nhân' : ''}
                </div>
                {pkg.benefits && (
                  <p className="text-xs rogym-text-dim line-clamp-2">{pkg.benefits}</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onBack}>
          Quay lại
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary flex items-center gap-2"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Tiến hành thanh toán <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Step 2c: Select trainer (PT packages only) ───────────────────────────────

function SelectTrainerStep({
  member,
  selectedPackage,
  onBack,
  onSelect,
}: {
  member: TrainerStudentSummary
  selectedPackage: Package
  onBack: () => void
  onSelect: (trainer: Trainer) => void
}) {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Trainer | null>(null)

  useEffect(() => {
    trainerService
      .list()
      .then(setTrainers)
      .catch(() => setError('Không thể tải danh sách PT.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="rogym-card rogym-card--compact p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
          <UserRound size={22} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-white">{member.fullName}</div>
          <div className="text-sm rogym-text-dim">Gói: {selectedPackage.name}</div>
        </div>
        <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--rogym-teal)] text-[var(--rogym-teal)]">
          Có PT
        </span>
      </div>

      <p className="text-sm rogym-text-secondary px-1">
        Gói này bao gồm PT cá nhân. Vui lòng chọn PT phụ trách cho hội viên.
      </p>

      {loading ? (
        <StaffSkeleton rows={4} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : trainers.length === 0 ? (
        <StaffEmptyState title="Không có PT nào" description="Liên hệ quản lý để thêm PT." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trainers.map((trainer) => {
            const isSelected = selected?.staffId === trainer.staffId
            return (
              <button
                key={trainer.staffId}
                type="button"
                onClick={() => setSelected(trainer)}
                className={[
                  'rogym-card rogym-card--interactive text-left p-5 space-y-1 transition-all',
                  isSelected ? 'border-[var(--rogym-green)] bg-[rgba(6,195,132,0.06)]' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-white">{trainer.fullName}</div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--rogym-green)]">
                      <Check size={12} className="text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div className="text-sm rogym-text-secondary capitalize">{trainer.position}</div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onBack}>
          Quay lại
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary flex items-center gap-2"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Tiến hành thanh toán <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Payment ──────────────────────────────────────────────────────────

function PaymentStep({
  mode,
  member,
  subscription,
  selectedPackage,
  selectedTrainer,
  onBack,
  onSuccess,
}: {
  mode: WizardMode
  member: TrainerStudentSummary
  subscription: Subscription | null
  selectedPackage: Package | null
  selectedTrainer: Trainer | null
  onBack: () => void
  onSuccess: (newEndDate: string, packageName: string) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [txRef, setTxRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const price =
    mode === 'renew'
      ? (subscription?.package ? Number(subscription.package.price) : 0)
      : (selectedPackage ? Number(selectedPackage.price) : 0)

  const durationDays =
    mode === 'renew'
      ? (subscription?.package?.durationDays ?? 0)
      : (selectedPackage?.durationDays ?? 0)

  const displayName =
    mode === 'renew'
      ? (subscription?.packageName ?? '—')
      : (selectedPackage?.name ?? '—')

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'renew' && subscription) {
        const result = await subscriptionService.renew(subscription.subscriptionId, {
          method,
          ...(txRef.trim() ? { transactionReference: txRef.trim() } : {}),
        })
        onSuccess(result.endDate, result.packageName ?? displayName)
      } else if (mode === 'new' && selectedPackage) {
        const sub = await subscriptionService.create(
          member.memberId,
          selectedPackage.packageId,
          selectedTrainer?.staffId
        )
        await paymentService.create({
          memberId: Number(member.memberId),
          subscriptionId: Number(sub.subscriptionId),
          method,
          amount: Number(selectedPackage.price),
          ...(txRef.trim() ? { transactionReference: txRef.trim() } : {}),
        })
        onSuccess(sub.endDate, selectedPackage.name)
      }
    } catch (err) {
      setError(getApiError(err, 'Không thể xử lý thanh toán. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rogym-card rogym-card--compact p-5 space-y-3">
        <h3 className="text-sm font-bold text-white mb-1">
          {mode === 'renew' ? 'Xác nhận gia hạn' : 'Xác nhận đăng ký gói mới'}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="text-xs rogym-text-dim mb-1">Hội viên</div>
            <div className="font-medium text-white">{member.fullName}</div>
            <div className="text-xs rogym-text-dim">{member.memberCode}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="text-xs rogym-text-dim mb-1">
              {mode === 'renew' ? 'Gói gia hạn' : 'Gói đăng ký'}
            </div>
            <div className="font-medium text-white">{displayName}</div>
            <div className="text-xs rogym-text-dim">+{durationDays} ngày</div>
          </div>
          {selectedTrainer && (
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 col-span-2">
              <div className="text-xs rogym-text-dim mb-1">PT phụ trách</div>
              <div className="font-medium text-white">{selectedTrainer.fullName}</div>
              <div className="text-xs rogym-text-dim capitalize">{selectedTrainer.position}</div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[rgba(6,195,132,0.25)] bg-[rgba(6,195,132,0.06)] px-4 py-3">
          <span className="rogym-text-secondary font-medium">Tổng thanh toán</span>
          <span className="text-lg font-bold text-[var(--rogym-teal)]">{formatVnd(price)}</span>
        </div>
      </div>

      {/* Payment form */}
      <div className="rogym-card rogym-card--compact p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Phương thức thanh toán</h3>

        <div className="flex gap-3 flex-wrap">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={[
                'rogym-card rogym-card--interactive px-4 py-2.5 text-sm font-medium transition-all',
                method === m.value
                  ? 'border-[var(--rogym-green)] bg-[rgba(6,195,132,0.08)] text-[var(--rogym-teal)]'
                  : 'rogym-text-secondary',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>

        {method !== 'cash' && (
          <label className="block space-y-2">
            <span className="rogym-field-label">Mã giao dịch (tuỳ chọn)</span>
            <input
              className="rogym-input"
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
              placeholder="Nhập mã giao dịch nếu có"
            />
          </label>
        )}
      </div>

      {error && <StaffErrorState message={error} />}

      <div className="flex justify-between">
        <button
          type="button"
          className="rogym-btn rogym-btn--outline-white"
          onClick={onBack}
          disabled={submitting}
        >
          Quay lại
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting
            ? 'Đang xử lý...'
            : mode === 'renew'
              ? `Xác nhận gia hạn — ${formatVnd(price)}`
              : `Xác nhận đăng ký — ${formatVnd(price)}`}
        </button>
      </div>
    </div>
  )
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState({
  mode,
  memberName,
  packageName,
  newEndDate,
  onReset,
}: {
  mode: WizardMode
  memberName: string
  packageName: string
  newEndDate: string
  onReset: () => void
}) {
  const isNew = mode === 'new'
  return (
    <div className="flex flex-col items-center text-center py-12 space-y-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--rogym-green)]">
        <Check size={28} className="text-white" strokeWidth={2.5} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">
          {isNew ? 'Đăng ký gói thành công!' : 'Gia hạn thành công!'}
        </h2>
        <p className="mt-1 rogym-text-secondary text-sm">
          Gói <strong>{packageName}</strong> của <strong>{memberName}</strong> đã được{' '}
          {isNew ? 'kích hoạt' : 'gia hạn'}.
        </p>
        <p className="mt-1 text-sm rogym-text-dim">
          Hết hạn: <strong className="text-white">{formatDate(newEndDate)}</strong>
        </p>
      </div>
      <button
        type="button"
        className="rogym-btn rogym-btn--primary flex items-center gap-2"
        onClick={onReset}
      >
        <RotateCcw size={15} />
        {isNew ? 'Đăng ký cho hội viên khác' : 'Gia hạn cho hội viên khác'}
      </button>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="text-xs rogym-text-dim">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RenewalPage() {
  const [step, setStep] = useState<WizardStep>('select-member')
  const [mode, setMode] = useState<WizardMode | null>(null)
  const [selectedMember, setSelectedMember] = useState<TrainerStudentSummary | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null)
  const [successData, setSuccessData] = useState<{ endDate: string; packageName: string } | null>(null)

  function handleSelectMember(m: TrainerStudentSummary) {
    setSelectedMember(m)
    setStep('review-sub')
  }

  function handleProceedToPayment(sub: Subscription) {
    setMode('renew')
    setSubscription(sub)
    setStep('payment')
  }

  function handleProceedNew() {
    setMode('new')
    setStep('select-package')
  }

  function handleSelectPackage(pkg: Package) {
    setSelectedPackage(pkg)
    if (pkg.includesPt) {
      setStep('select-trainer')
    } else {
      setStep('payment')
    }
  }

  function handleSelectTrainer(trainer: Trainer) {
    setSelectedTrainer(trainer)
    setStep('payment')
  }

  function handleSuccess(endDate: string, packageName: string) {
    setSuccessData({ endDate, packageName })
    setStep('success')
  }

  function reset() {
    setStep('select-member')
    setMode(null)
    setSelectedMember(null)
    setSubscription(null)
    setSelectedPackage(null)
    setSelectedTrainer(null)
    setSuccessData(null)
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Dịch vụ tại quầy"
        title="Gia hạn gói tập"
        description="Tìm hội viên để gia hạn hoặc đăng ký gói tập mới."
      />

      {step !== 'success' && <StepIndicator step={step} mode={mode} />}

      {step === 'select-member' && <SelectMemberStep onSelect={handleSelectMember} />}

      {step === 'review-sub' && selectedMember && (
        <ReviewSubscriptionStep
          member={selectedMember}
          onBack={() => setStep('select-member')}
          onProceed={handleProceedToPayment}
          onProceedNew={handleProceedNew}
        />
      )}

      {step === 'select-package' && selectedMember && (
        <SelectPackageStep
          member={selectedMember}
          onBack={() => setStep('review-sub')}
          onSelect={handleSelectPackage}
        />
      )}

      {step === 'select-trainer' && selectedMember && selectedPackage && (
        <SelectTrainerStep
          member={selectedMember}
          selectedPackage={selectedPackage}
          onBack={() => setStep('select-package')}
          onSelect={handleSelectTrainer}
        />
      )}

      {step === 'payment' && selectedMember && mode && (
        <PaymentStep
          mode={mode}
          member={selectedMember}
          subscription={subscription}
          selectedPackage={selectedPackage}
          selectedTrainer={selectedTrainer}
          onBack={() => {
            if (mode === 'renew') setStep('review-sub')
            else if (selectedPackage?.includesPt) setStep('select-trainer')
            else setStep('select-package')
          }}
          onSuccess={handleSuccess}
        />
      )}

      {step === 'success' && selectedMember && successData && mode && (
        <SuccessState
          mode={mode}
          memberName={selectedMember.fullName}
          packageName={successData.packageName}
          newEndDate={successData.endDate}
          onReset={reset}
        />
      )}
    </StaffPage>
  )
}
