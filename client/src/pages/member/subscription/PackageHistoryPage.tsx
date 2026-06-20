import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageSearch, ReceiptText, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from '@/components/MemberUI'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { formatDate } from '@/lib/date'

function Badge({ label, tone = 'muted' }: { label: string; tone?: string }) {
  return (
    <span className="rogym-tone-badge" data-tone={tone}>
      {label}
    </span>
  )
}

const SUB_STATUS: Record<string, { label: string; tone: string }> = {
  active:    { label: 'Đang hoạt động', tone: 'success' },
  pending:   { label: 'Chờ kích hoạt',  tone: 'warning' },
  expired:   { label: 'Đã hết hạn',     tone: 'muted' },
  cancelled: { label: 'Đã huỷ',         tone: 'danger' },
}

const PAY_STATUS: Record<string, { label: string; tone: string }> = {
  success: { label: 'Thành công', tone: 'success' },
  failed:  { label: 'Thất bại',   tone: 'danger' },
}

const PAGE_SIZE = 5

/* Island button group */
function IslandGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl overflow-hidden rogym-sx-82d3c837" >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rogym-island-option px-3 py-2 text-xs font-medium transition-colors ${
            value === opt.value ? 'is-active' : ''
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* Numbered pagination */
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null

  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i)
    if (page < total - 2) pages.push('...')
    pages.push(total)
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rogym-pagination-button"
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="rogym-sx-71088fc3">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`rogym-pagination-button ${p === page ? 'is-active' : ''}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        className="rogym-pagination-button"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}

export default function PackageHistoryPage() {
  const [activeTab, setActiveTab]   = useState<'subscriptions' | 'payments'>('subscriptions')
  const [subs, setSubs]             = useState<Subscription[]>([])
  const [payments, setPayments]     = useState<Payment[]>([])
  const [loadingSubs, setLoadingSubs]   = useState(true)
  const [loadingPays, setLoadingPays]   = useState(false)
  const [paysLoaded, setPaysLoaded]     = useState(false)
  const [page, setPage]             = useState(1)
  const [subPage, setSubPage]       = useState(1)
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'bank_card' | 'ewallet'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [sortDir, setSortDir]       = useState<'desc' | 'asc'>('desc')

  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    subscriptionService.getByMember(user.memberId)
      .then(data => setSubs(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(err => {
        if (err?.response?.status === 401) { clearAuth(); navigate('/login') }
      })
      .finally(() => setLoadingSubs(false))
  }, [user?.memberId, navigate, clearAuth])

  function loadPayments() {
    if (paysLoaded || !user?.memberId) return
    setLoadingPays(true)
    paymentService.listByMember(user.memberId)
      .then(data => { setPayments(data); setPaysLoaded(true) })
      .catch(() => {})
      .finally(() => setLoadingPays(false))
  }

  function handleTabChange(tab: 'subscriptions' | 'payments') {
    setActiveTab(tab)
    setPage(1)
    setSubPage(1)
    if (tab === 'payments') loadPayments()
  }

  const filteredPayments = payments
    .filter(p => {
      if (methodFilter !== 'all' && p.method !== methodFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      const diff = new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
      return sortDir === 'desc' ? diff : -diff
    })

  const totalPayPages = Math.ceil(filteredPayments.length / PAGE_SIZE)
  const pagedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalSubPages = Math.ceil(subs.length / PAGE_SIZE)
  const pagedSubs = subs.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE)

  const METHOD_OPTIONS = [
    { value: 'all' as const, label: 'Tất cả' },
    { value: 'cash' as const, label: 'Tiền mặt' },
    { value: 'bank_card' as const, label: 'Thẻ NH' },
    { value: 'ewallet' as const, label: 'Ví điện tử' },
  ]
  const STATUS_OPTIONS = [
    { value: 'all' as const, label: 'Tất cả' },
    { value: 'success' as const, label: 'Thành công' },
    { value: 'failed' as const, label: 'Thất bại' },
  ]

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Gói tập"
        title="Lịch sử"
        description="Xem lại các gói tập đã đăng ký và giao dịch thanh toán."
        actions={
          <button onClick={() => navigate('/member/subscription/current')} className="rogym-btn rogym-btn--outline-white">
            ← Gói hiện tại
          </button>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/5">
        {(['subscriptions', 'payments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`rogym-history-tab px-5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab ? 'is-active' : ''
            }`}
          >
            {tab === 'subscriptions' ? 'Lịch sử gói tập' : 'Lịch sử thanh toán'}
          </button>
        ))}
      </div>

      {/* Subscriptions tab */}
      {activeTab === 'subscriptions' && (
        loadingSubs ? (
          <MemberSkeleton rows={4} />
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PackageSearch size={48} className="rogym-text-secondary" />
            <p className="rogym-text-secondary">Chưa có lịch sử gói tập nào.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {pagedSubs.map(sub => {
                const st = SUB_STATUS[sub.status] ?? { label: sub.status, tone: 'muted' }
                return (
                  <div
                    key={sub.subscriptionId}
                    className="rogym-card rogym-card--compact px-5 py-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-white mb-1.5 rogym-sx-d63063a8" >
                          {sub.packageName ?? 'Gói tập'}
                        </p>
                        <p className="text-sm rogym-text-secondary">
                          {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                        </p>
                        {sub.status === 'cancelled' && sub.cancelledAt && (
                          <p className="text-xs text-red-400 mt-1">Huỷ lúc {formatDate(sub.cancelledAt)}</p>
                        )}
                      </div>
                      <Badge label={st.label} tone={st.tone} />
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination page={subPage} total={totalSubPages} onChange={p => { setSubPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          </>
        )
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <div>
          {/* Filters row */}
          <div className="flex gap-3 mb-5 flex-wrap items-center">
            <IslandGroup options={METHOD_OPTIONS} value={methodFilter} onChange={v => { setMethodFilter(v); setPage(1) }} />
            <IslandGroup options={STATUS_OPTIONS} value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />

            {/* Sort toggle */}
            <button
              onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1) }}
              className="rogym-sort-toggle flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors rogym-sx-3a671e25"
            >
              <ArrowUpDown size={13} />
              {sortDir === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
            </button>
          </div>

          {loadingPays ? (
            <MemberSkeleton rows={4} />
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <ReceiptText size={48} className="rogym-text-secondary" />
              <p className="rogym-text-secondary">Chưa có giao dịch nào.</p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div
                className="grid gap-4 px-4 mb-2 text-xs rogym-text-secondary rogym-sx-03afc6c9"
                
              >
                <span>Ngày</span><span>Gói</span><span>Phương thức</span><span>Số tiền</span><span>Trạng thái</span>
              </div>
              <div className="flex flex-col gap-2">
                {pagedPayments.map(p => {
                  const ps = PAY_STATUS[p.status] ?? { label: p.status, tone: 'muted' }
                  return (
                    <div
                      key={p.paymentId}
                      className="grid items-center gap-4 rounded-xl px-4 py-3 rogym-sx-88714df9"
                      
                    >
                      <span className="text-white">{formatDate(p.paidAt)}</span>
                      <span className="rogym-text-secondary truncate">{p.packageName ?? '—'}</span>
                      <span className="rogym-text-secondary">{getPaymentMethodLabel(p.method, true)}</span>
                      <span className="font-semibold rogym-sx-b2fbf853" >{formatVnd(p.amount)}</span>
                      <Badge label={ps.label} tone={ps.tone} />
                    </div>
                  )
                })}
              </div>
              <Pagination page={page} total={totalPayPages} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </>
          )}
        </div>
      )}
    </MemberPage>
  )
}
