import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import paymentService, { type Payment } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Page,
  PageEmptyState,
  PageHeader,
  PageSkeleton,
  Pagination,
  ResponsiveTable,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui'

import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { formatVnd } from '@/lib/currency'
import { formatDate } from '@/lib/date'

const SUB_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' | 'danger' }> = {
  active:    { label: 'Đang hoạt động', tone: 'success' },
  pending:   { label: 'Chờ kích hoạt',  tone: 'warning' },
  expired:   { label: 'Đã hết hạn',     tone: 'muted' },
  cancelled: { label: 'Đã huỷ',         tone: 'danger' },
}

const PAY_STATUS: Record<string, { label: string; tone: 'success' | 'danger' | 'muted' }> = {
  success: { label: 'Thành công', tone: 'success' },
  failed:  { label: 'Thất bại',   tone: 'danger' },
}

const PAGE_SIZE = 5

function IslandGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (val: T) => void
}) {
  return (
    <div className="inline-flex rounded-xl p-1 bg-white/5 border border-white/10 gap-1">
      {options.map(opt => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'primary' : 'outline-white'}
          size="sm"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

const METHOD_OPTIONS = [
  { value: 'all', label: 'Tất cả PT' },
  { value: 'vietqr', label: 'VietQR' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'card', label: 'Thẻ' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'success', label: 'Thành công' },
  { value: 'failed', label: 'Thất bại' },
]

export default function PackageHistoryPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const memberId = user?.memberId ? String(user.memberId) : ''

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions')

  // Subscriptions state
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [subPage, setSubPage] = useState(1)

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPays, setLoadingPays] = useState(true)
  const [methodFilter, setMethodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!memberId) return

    setLoadingSubs(true)
    subscriptionService.getByMember(memberId)
      .then(res => {
        const sorted = (res ?? []).slice().sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setSubs(sorted)
      })
      .catch(() => setSubs([]))
      .finally(() => setLoadingSubs(false))

    setLoadingPays(true)
    paymentService.listByMember(memberId)
      .then(res => setPayments(res ?? []))
      .catch(() => setPayments([]))
      .finally(() => setLoadingPays(false))
  }, [memberId])

  // Filtered & sorted payments
  const filteredPayments = payments
    .filter(p => methodFilter === 'all' || p.method === methodFilter)
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => {
      const ta = new Date(a.paidAt).getTime()
      const tb = new Date(b.paidAt).getTime()
      return sortDir === 'desc' ? tb - ta : ta - tb
    })

  // Pagination for subscriptions
  const totalSubPages = Math.max(1, Math.ceil(subs.length / PAGE_SIZE))
  const pagedSubs = subs.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE)

  // Pagination for payments
  const totalPayPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE))
  const pagedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Page>
      <PageHeader
        eyebrow={t('subscription.history.eyebrow')}
        title={t('subscription.history.title')}
        description={t('subscription.history.description')}
        actions={
          <Button
            variant="outline-white"
            size="sm"
            onClick={() => navigate('/member/subscription/current')}
          >
            {t('subscription.history.backToCurrent')}
          </Button>
        }
      />

      <nav className="mb-6">
        <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as 'subscriptions' | 'payments')}>
          <TabsList>
            <TabsTrigger value="subscriptions">{t('subscription.history.tabSubscriptions')}</TabsTrigger>
            <TabsTrigger value="payments">{t('subscription.history.tabPayments')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </nav>


      {/* Subscriptions tab */}
      {activeTab === 'subscriptions' && (
        loadingSubs ? (
          <PageSkeleton rows={4} />
        ) : subs.length === 0 ? (
          <PageEmptyState
            title={t('subscription.history.emptySubscriptions')}
          />
        ) : (
          <main className="space-y-4">
            <div className="flex flex-col gap-3">
              {pagedSubs.map(sub => {
                const st = SUB_STATUS[sub.status] ?? { label: sub.status, tone: 'muted' }
                const statusLabel = t(`subscription.history.statusLabel.${sub.status}`, { defaultValue: st.label })
                return (
                  <Card
                    as="article"
                    key={sub.subscriptionId}
                    variant="compact"
                    padding="sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle size="sm" as="p" className="mb-1.5 rogym-sx-d63063a8">
                          {sub.packageName ?? t('subscription.history.packageFallback')}
                        </CardTitle>
                        <p className="text-sm rogym-text-secondary">
                          {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                        </p>
                        {sub.status === 'cancelled' && sub.cancelledAt && (
                          <p className="text-xs text-red-400 mt-1">{t('subscription.history.cancelledAt', { date: formatDate(sub.cancelledAt) })}</p>
                        )}
                      </div>
                      <Badge tone={st.tone}>{statusLabel}</Badge>
                    </div>
                  </Card>
                )
              })}
            </div>
            <Pagination
              page={subPage}
              totalPages={totalSubPages}
              onPageChange={p => { setSubPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />
          </main>
        )
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <main className="space-y-4">
          {/* Filters row */}
          <section className="flex gap-3 mb-5 flex-wrap items-center">
            <IslandGroup options={METHOD_OPTIONS} value={methodFilter} onChange={v => { setMethodFilter(v); setPage(1) }} />
            <IslandGroup options={STATUS_OPTIONS} value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />

            <Button
              variant="outline-white"
              size="sm"
              onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1) }}
              leftIcon={<ArrowUpDown size={13} />}
            >
              {sortDir === 'desc' ? t('subscription.history.sortNewest') : t('subscription.history.sortOldest')}
            </Button>
          </section>

          {loadingPays ? (
            <PageSkeleton rows={4} />
          ) : filteredPayments.length === 0 ? (
            <PageEmptyState
              title={t('subscription.history.emptyPayments')}
            />
          ) : (
            <>
              <ResponsiveTable<Payment>
                columns={[
                  { key: 'date', header: t('subscription.history.tableDate'), render: (p) => <span className="text-white">{formatDate(p.paidAt)}</span> },
                  { key: 'pkg', header: t('subscription.history.tablePackage'), render: (p) => <span className="text-white/80">{p.packageName ?? '—'}</span> },
                  { key: 'method', header: t('subscription.history.tableMethod'), render: (p) => <span className="text-white/70">{getPaymentMethodLabel(p.method, true)}</span> },
                  { key: 'amount', header: t('subscription.history.tableAmount'), render: (p) => <span className="font-semibold text-[var(--rogym-teal)]">{formatVnd(p.amount)}</span> },
                  {
                    key: 'status',
                    header: t('subscription.history.tableStatus'),
                    render: (p) => {
                      const ps = PAY_STATUS[p.status] ?? { label: p.status, tone: 'muted' }
                      const payStatusLabel = t(`subscription.history.payStatusLabel.${p.status}`, { defaultValue: ps.label })
                      return <Badge tone={ps.tone}>{payStatusLabel}</Badge>
                    },
                  },
                ]}
                data={pagedPayments}
                keyExtractor={(p) => String(p.paymentId)}
              />
              <Pagination
                page={page}
                totalPages={totalPayPages}
                onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            </>
          )}
        </main>
      )}
    </Page>
  )
}

