import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserPlus,
  RefreshCw,
  LoaderCircle,
  Info,
} from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatVnd } from '@/lib/currency'
import { todayInput } from '@/lib/date'
import { OWNER_ACCENT } from '@/lib/owner-constants'
import {
  reportService,
  type RevenueBreakdown,
  type RenewalData,
  type TopPackageItem,
} from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerSelect,
  OwnerStatCard,
} from '@/components/OwnerUI'

type FilterMode = 'week' | 'month' | 'quarter' | 'custom'

const _now = new Date()
const CURRENT_YEAR = _now.getFullYear()
const CURRENT_MONTH = _now.getMonth() + 1
const CURRENT_QUARTER = Math.ceil(CURRENT_MONTH / 3)

function getCurrentISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const CURRENT_WEEK = getCurrentISOWeek(_now)
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i)
const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1)

const MONTH_OPTIONS = [
  { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' },
  { value: 3, label: 'Tháng 3' }, { value: 4, label: 'Tháng 4' },
  { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
  { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' },
  { value: 9, label: 'Tháng 9' }, { value: 10, label: 'Tháng 10' },
  { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' },
]

const QUARTER_OPTIONS = [
  { value: 1, label: 'Quý 1 (Jan – Mar)' }, { value: 2, label: 'Quý 2 (Apr – Jun)' },
  { value: 3, label: 'Quý 3 (Jul – Sep)' }, { value: 4, label: 'Quý 4 (Oct – Dec)' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Mọi phương thức' }, { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_card', label: 'Chuyển khoản / Thẻ' }, { value: 'ewallet', label: 'Ví điện tử' },
]

const DOW_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function pad(n: number) { return String(n).padStart(2, '0') }

// Capped at today (for API calls)
function getWeekRange(year: number, week: number): { from: string; to: string } {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1))
  const weekStart = new Date(monday)
  weekStart.setUTCDate(monday.getUTCDate() + (week - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const today = fmt(new Date())
  return { from: fmt(weekStart), to: fmt(weekEnd) > today ? today : fmt(weekEnd) }
}

// Full Mon–Sun (for display – future days shown as empty)
function getFullWeekRange(year: number, week: number): { from: string; to: string } {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1))
  const weekStart = new Date(monday)
  weekStart.setUTCDate(monday.getUTCDate() + (week - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(weekStart), to: fmt(weekEnd) }
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` }
}

function getQuarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = quarter * 3
  const lastDay = new Date(year, endMonth, 0).getDate()
  return { from: `${year}-${pad(startMonth)}-01`, to: `${year}-${pad(endMonth)}-${pad(lastDay)}` }
}

function getPreviousRange(from: string, to: string): { from: string; to: string } {
  const start = new Date(from)
  const end = new Date(to)
  const diffMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(prevStart), to: fmt(prevEnd) }
}

// Build all dates from `from` to `to` grouped into 7-col ISO weeks (Mon=col0)
function buildWeeks(from: string, to: string): (string | null)[][] {
  const dates: string[] = []
  const cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  const firstDow = (new Date(from + 'T00:00:00').getDay() + 6) % 7
  const padded: (string | null)[] = [...Array(firstDow).fill(null), ...dates]
  const weeks: (string | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7)
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function getCellColor(amount: number, max: number): string {
  if (max === 0 || amount === 0) return 'rgba(255,255,255,0.05)'
  const r = amount / max
  if (r < 0.25) return 'rgba(6,195,132,0.18)'
  if (r < 0.5) return 'rgba(6,195,132,0.38)'
  if (r < 0.75) return 'rgba(6,195,132,0.60)'
  return 'rgba(6,195,132,0.82)'
}

function formatVndShort(amount: number): string {
  if (amount <= 0) return ''
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`
  return String(amount)
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function GridTooltip({
  x, y, date, amount,
}: { x: number; y: number; date: string; amount: number }) {
  return (
    <div
      className="fixed z-50 rounded-xl border border-white/10 bg-[#1a2d22] px-3 py-2 text-sm shadow-xl pointer-events-none"
      style={{ left: x + 14, top: y - 58 }}
    >
      <p className="text-xs rogym-text-dim">
        {new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', {
          day: 'numeric', month: 'numeric', year: 'numeric',
        })}
      </p>
      <p className="font-bold rogym-text-green">{formatVnd(amount)}</p>
    </div>
  )
}

// ─── Revenue Day Grid ─────────────────────────────────────────────────────────

function RevenueDayGrid({
  data,
  displayFrom,
  displayTo,
  mode,
  todayStr,
}: {
  data: RevenueBreakdown[]
  displayFrom: string
  displayTo: string
  mode: FilterMode
  todayStr: string
}) {
  const [tip, setTip] = useState<{ x: number; y: number; date: string; amount: number } | null>(null)

  const amountMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of data) m.set(r.date, Number(r.amount))
    return m
  }, [data])

  const maxAmount = useMemo(
    () => (data.length > 0 ? Math.max(...data.map((r) => Number(r.amount))) : 1),
    [data],
  )

  const weeks = useMemo(() => buildWeeks(displayFrom, displayTo), [displayFrom, displayTo])

  // ── Week: single row, tall cells, header baked in ──────────────────────────
  if (mode === 'week') {
    const days = weeks[0] ?? []
    return (
      <div className="grid grid-cols-7 gap-2" onMouseLeave={() => setTip(null)}>
        {days.map((date, di) => {
          const isFuture = date ? date > todayStr : false
          const amount = date ? (amountMap.get(date) ?? 0) : 0
          const d = date ? new Date(date + 'T00:00:00') : null
          const hasRevenue = !isFuture && amount > 0
          return (
            <div
              key={di}
              className="rounded-xl flex flex-col items-center justify-center gap-1 min-h-[84px] px-1 py-3 transition-colors"
              style={{
                backgroundColor: date
                  ? isFuture
                    ? 'rgba(255,255,255,0.03)'
                    : getCellColor(amount, maxAmount)
                  : 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseMove={hasRevenue ? (e) => setTip({ x: e.clientX, y: e.clientY, date: date!, amount }) : undefined}
            >
              {date && (
                <>
                  <span className="text-[11px] rogym-text-dim font-medium">{DOW_HEADERS[di]}</span>
                  <span className="text-sm font-bold text-white">
                    {d!.getDate()}/{d!.getMonth() + 1}
                  </span>
                  {isFuture ? (
                    <span className="text-[10px] rogym-text-dim">—</span>
                  ) : hasRevenue ? (
                    <span className="text-xs font-semibold rogym-text-green leading-tight text-center">
                      {formatVndShort(amount)}
                    </span>
                  ) : (
                    <span className="text-[10px] rogym-text-dim">Trống</span>
                  )}
                </>
              )}
            </div>
          )
        })}
        {tip && <GridTooltip {...tip} />}
      </div>
    )
  }

  // ── Month / Quarter / Custom: calendar grid ────────────────────────────────
  const isMonth = mode === 'month'
  const cellH = isMonth ? 'min-h-[56px]' : 'min-h-[40px]'
  const dateSize = isMonth ? 'text-xs' : 'text-[10px]'
  const amtSize = isMonth ? 'text-[11px]' : 'text-[10px]'
  const gap = isMonth ? 'gap-1.5' : 'gap-1'

  let prevMonth = -1

  return (
    <div onMouseLeave={() => setTip(null)}>
      {/* DOW header */}
      <div className={`grid grid-cols-7 ${gap} mb-1`}>
        {DOW_HEADERS.map((h) => (
          <div key={h} className="text-center text-[10px] font-semibold rogym-text-dim py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const firstReal = week.find((d) => d !== null)
          const firstRealMonth = firstReal
            ? new Date(firstReal + 'T00:00:00').getMonth()
            : -1
          const showMonthLabel = !isMonth && firstReal && firstRealMonth !== prevMonth
          if (showMonthLabel) prevMonth = firstRealMonth

          return (
            <div key={wi}>
              {showMonthLabel && firstReal && (
                <p className="text-[10px] font-semibold rogym-text-dim pt-2 pb-0.5 pl-0.5">
                  Tháng {new Date(firstReal + 'T00:00:00').getMonth() + 1}
                </p>
              )}
              <div className={`grid grid-cols-7 ${gap}`}>
                {week.map((date, di) => {
                  const isFuture = date ? date > todayStr : false
                  const amount = date ? (amountMap.get(date) ?? 0) : 0
                  const d = date ? new Date(date + 'T00:00:00') : null
                  const hasRevenue = !isFuture && amount > 0
                  return (
                    <div
                      key={di}
                      className={`rounded-lg ${cellH} flex flex-col items-center justify-center gap-0.5 px-1`}
                      style={{
                        backgroundColor: !date
                          ? 'transparent'
                          : isFuture
                            ? 'rgba(255,255,255,0.02)'
                            : getCellColor(amount, maxAmount),
                      }}
                      onMouseMove={
                        hasRevenue
                          ? (e) => setTip({ x: e.clientX, y: e.clientY, date: date!, amount })
                          : undefined
                      }
                    >
                      {date && (
                        <>
                          <span
                            className={`${dateSize} font-medium leading-tight ${
                              isFuture ? 'rogym-text-dim opacity-40' : 'rogym-text-dim'
                            }`}
                          >
                            {d!.getDate()}
                          </span>
                          {hasRevenue && (
                            <span
                              className={`${amtSize} font-semibold text-white leading-tight text-center`}
                            >
                              {formatVndShort(amount)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-1.5 mt-4">
        <span className="text-[10px] rogym-text-dim">Ít hơn</span>
        {[0, 0.18, 0.38, 0.60, 0.82].map((op, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-[3px]"
            style={{
              backgroundColor:
                op === 0 ? 'rgba(255,255,255,0.05)' : `rgba(6,195,132,${op})`,
            }}
          />
        ))}
        <span className="text-[10px] rogym-text-dim">Nhiều hơn</span>
      </div>

      {tip && <GridTooltip {...tip} />}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [mode, setMode] = useState<FilterMode>('month')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [week, setWeek] = useState(CURRENT_WEEK)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [quarter, setQuarter] = useState(CURRENT_QUARTER)
  const [customFrom, setCustomFrom] = useState(
    () => `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-01`,
  )
  const [customTo, setCustomTo] = useState(todayInput)
  const [paymentMethod, setPaymentMethod] = useState('')

  const [data, setData] = useState<RevenueBreakdown[]>([])
  const [prevTotal, setPrevTotal] = useState<string>('0')
  const [renewals, setRenewals] = useState<RenewalData | null>(null)
  const [newMembers, setNewMembers] = useState(0)
  const [topPackages, setTopPackages] = useState<TopPackageItem[]>([])
  const [showAllPackages, setShowAllPackages] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Display range: full period for the selected filter (uncapped for week mode)
  const [loadedDisplay, setLoadedDisplay] = useState<{ from: string; to: string } | null>(null)

  const total = useMemo(() => data.reduce((sum, r) => sum + Number(r.amount), 0), [data])
  const growth = useMemo(() => {
    const prev = Number(prevTotal)
    if (prev === 0) return null
    return ((total - prev) / prev) * 100
  }, [total, prevTotal])
  const uniqueDays = useMemo(() => new Set(data.map((r) => r.date)).size, [data])

  const todayStr = todayInput()
  const isPartial = loadedDisplay ? loadedDisplay.to > todayStr : false

  const load = useCallback(
    (from: string, to: string) => {
      // Backend rejects to > today (VN). Cap for API calls.
      const today = todayInput()
      const effectiveTo = to > today ? today : to
      setLoading(true)
      setError(null)
      const prevRange = getPreviousRange(from, effectiveTo)
      const method = paymentMethod || undefined
      Promise.all([
        reportService.getRevenue(from, effectiveTo, method),
        reportService.getRevenue(prevRange.from, prevRange.to, method),
        reportService.getRenewals(from, effectiveTo),
        reportService.getMembers(from, effectiveTo),
        reportService.getTopPackages(from, effectiveTo),
      ])
        .then(([current, prev, renewalResult, memberResult, topPkgResult]) => {
          setData(current.breakdown)
          setPrevTotal(prev.total)
          setRenewals(renewalResult)
          setNewMembers(memberResult.total)
          setTopPackages(topPkgResult)
          setShowAllPackages(false)
        })
        .catch((err) => setError(getApiError(err, 'Không tải được báo cáo doanh thu.')))
        .finally(() => setLoading(false))
    },
    [paymentMethod],
  )

  const handleLoad = useCallback(() => {
    if (mode === 'week') {
      const api = getWeekRange(year, week)       // capped at today for API
      const disp = getFullWeekRange(year, week)  // full Mon–Sun for display
      setLoadedDisplay(disp)
      load(api.from, api.to)
    } else if (mode === 'month') {
      const r = getMonthRange(year, month)
      setLoadedDisplay(r)
      load(r.from, r.to)
    } else if (mode === 'quarter') {
      const r = getQuarterRange(year, quarter)
      setLoadedDisplay(r)
      load(r.from, r.to)
    } else {
      setLoadedDisplay({ from: customFrom, to: customTo })
      load(customFrom, customTo)
    }
  }, [mode, year, week, month, quarter, customFrom, customTo, load])

  useEffect(() => {
    if (mode !== 'custom') handleLoad()
  }, [mode, year, week, month, quarter, handleLoad])

  const isPositive = growth === null || growth >= 0

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Tài chính"
        title="Báo cáo doanh thu"
        description="Theo dõi doanh thu, cơ cấu và hiệu suất bán hàng."
      />

      {/* Bộ lọc */}
      <div className="rogym-card rogym-card--compact space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
            {(['week', 'month', 'quarter', 'custom'] as FilterMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (m === 'custom') setData([])
                  setMode(m)
                }}
                className={`rogym-filter-chip rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  mode === m ? 'is-active' : ''
                }`}
              >
                {m === 'week' ? 'Tuần' : m === 'month' ? 'Tháng' : m === 'quarter' ? 'Quý' : 'Tùy chỉnh'}
              </button>
            ))}
          </div>
          <OwnerSelect value={paymentMethod} onValueChange={setPaymentMethod} ariaLabel="Phương thức thanh toán">
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </OwnerSelect>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {(mode === 'week' || mode === 'month' || mode === 'quarter') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Năm</label>
              <OwnerSelect value={String(year)} onValueChange={(v) => setYear(Number(v))} ariaLabel="Năm">
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </OwnerSelect>
            </div>
          )}

          {mode === 'week' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Tuần</label>
              <OwnerSelect value={String(week)} onValueChange={(v) => setWeek(Number(v))} ariaLabel="Tuần">
                {WEEKS.map((w) => <option key={w} value={w}>Tuần {w}</option>)}
              </OwnerSelect>
            </div>
          )}

          {mode === 'month' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Tháng</label>
              <OwnerSelect value={String(month)} onValueChange={(v) => setMonth(Number(v))} ariaLabel="Tháng">
                {MONTH_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </OwnerSelect>
            </div>
          )}

          {mode === 'quarter' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Quý</label>
              <OwnerSelect value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))} ariaLabel="Quý">
                {QUARTER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </OwnerSelect>
            </div>
          )}

          {mode === 'custom' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium rogym-text-dim">Từ ngày</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rogym-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium rogym-text-dim">Đến ngày</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rogym-input"
                />
              </div>
              <button
                className="rogym-btn rogym-btn--primary self-end"
                onClick={handleLoad}
                disabled={loading}
              >
                {loading && <LoaderCircle size={15} className="animate-spin" />}
                Xem báo cáo
              </button>
            </>
          )}
        </div>
      </div>

      {loading && data.length === 0 ? (
        <OwnerSkeleton rows={4} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={handleLoad} />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OwnerStatCard
              icon={<DollarSign size={18} />}
              label="Tổng doanh thu"
              value={formatVnd(total)}
              hint={`${uniqueDays} ngày có giao dịch`}
              accent
            />
            <OwnerStatCard
              icon={<UserPlus size={18} />}
              label="Hội viên mới"
              value={String(newMembers)}
              hint="Đăng ký trong kỳ"
              accent={false}
            />
            <OwnerStatCard
              icon={<RefreshCw size={18} />}
              label="Tỷ lệ gia hạn"
              value={renewals?.renewalRate != null ? `${renewals.renewalRate.toFixed(1)}%` : '—'}
              hint={renewals ? `${renewals.renewed} gia hạn · ${renewals.churned} rời bỏ` : 'Chưa có dữ liệu'}
              accent={false}
            />
            <OwnerStatCard
              icon={
                <span className={!isPositive ? 'text-red-400' : ''}>
                  {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </span>
              }
              label="So với kỳ trước"
              value={growth === null ? '—' : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
              hint={`Kỳ trước: ${formatVnd(Number(prevTotal))}`}
              accent={isPositive}
            />
          </div>

          {/* Chart card */}
          {data.length === 0 && !loading ? (
            <OwnerEmptyState
              title="Không có doanh thu trong khoảng này"
              description="Thử chọn khoảng thời gian khác."
            />
          ) : loadedDisplay ? (
            <div className="rogym-card rogym-card--compact p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-base font-bold text-white">Doanh thu theo thời gian</h2>
                {isPartial && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
                    <Info size={13} className="text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-300">
                      Tạm tính từ{' '}
                      {new Date(loadedDisplay.from + 'T00:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}{' '}
                      đến{' '}
                      {new Date(todayStr + 'T00:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
              <RevenueDayGrid
                data={data}
                displayFrom={loadedDisplay.from}
                displayTo={loadedDisplay.to}
                mode={mode}
                todayStr={todayStr}
              />
            </div>
          ) : null}

          {/* Top gói tập bán chạy */}
          {topPackages.length > 0 && (
            <div className="rogym-card rogym-card--compact p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">Top gói tập bán chạy</h2>
                {topPackages.length > 3 && (
                  <button
                    type="button"
                    className="text-xs rogym-text-dim hover:text-white transition-colors"
                    onClick={() => setShowAllPackages((prev) => !prev)}
                  >
                    {showAllPackages ? 'Thu gọn' : `Xem thêm (${topPackages.length - 3} gói)`}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {(showAllPackages ? topPackages : topPackages.slice(0, 3)).map((pkg, index) => {
                  const maxCount = topPackages[0].count
                  const barWidth = maxCount > 0 ? (pkg.count / maxCount) * 100 : 0
                  return (
                    <div key={pkg.packageId} className="flex items-center gap-4">
                      <span className="w-5 shrink-0 text-center text-sm font-bold rogym-text-dim">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white">{pkg.name}</span>
                          <span className="shrink-0 text-xs rogym-text-dim">{pkg.count} lượt</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: OWNER_ACCENT,
                                opacity: index === 0 ? 1 : 0.5 + 0.15 * (1 - index / topPackages.length),
                              }}
                            />
                          </div>
                          <span className="shrink-0 text-xs rogym-text-secondary">
                            {pkg.durationDays} ngày · {formatVnd(Number(pkg.price))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </OwnerPage>
  )
}
