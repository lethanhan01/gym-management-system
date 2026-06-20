import { useEffect, useState, useCallback } from 'react'
import { LoaderCircle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Label } from 'recharts'
import { getApiError } from '@/lib/api-error'
import { todayInput } from '@/lib/date'
import {
  reportService,
  type EmployeePerformanceItem,
  type EmployeePerformanceDetail,
} from '@/services/report.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerModal,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
  OwnerSelect,
} from '@/components/OwnerUI'
import { scoreColor, scoreLabel } from '@/lib/score-utils'

type FilterMode = 'month' | 'quarter' | 'custom'
type MonthPeriod = { year: number; month: number }
type QuarterPeriod = { year: number; quarter: number }

const _now = new Date()
const CURRENT_YEAR = _now.getFullYear()
const PREVIOUS_MONTH_PERIOD = getPreviousMonthPeriod(_now)
const PREVIOUS_QUARTER_PERIOD = getPreviousQuarterPeriod(_now)
const FIRST_REPORT_YEAR = Math.min(2020, PREVIOUS_MONTH_PERIOD.year, PREVIOUS_QUARTER_PERIOD.year)
const LAST_REPORT_YEAR = Math.max(
  CURRENT_YEAR,
  PREVIOUS_MONTH_PERIOD.year,
  PREVIOUS_QUARTER_PERIOD.year,
)
const YEARS = Array.from(
  { length: LAST_REPORT_YEAR - FIRST_REPORT_YEAR + 1 },
  (_, i) => FIRST_REPORT_YEAR + i,
)

const MONTH_OPTIONS = [
  { value: 1, label: 'Tháng 1' },
  { value: 2, label: 'Tháng 2' },
  { value: 3, label: 'Tháng 3' },
  { value: 4, label: 'Tháng 4' },
  { value: 5, label: 'Tháng 5' },
  { value: 6, label: 'Tháng 6' },
  { value: 7, label: 'Tháng 7' },
  { value: 8, label: 'Tháng 8' },
  { value: 9, label: 'Tháng 9' },
  { value: 10, label: 'Tháng 10' },
  { value: 11, label: 'Tháng 11' },
  { value: 12, label: 'Tháng 12' },
]

const QUARTER_OPTIONS = [
  { value: 1, label: 'Quý 1 (Jan – Mar)' },
  { value: 2, label: 'Quý 2 (Apr – Jun)' },
  { value: 3, label: 'Quý 3 (Jul – Sep)' },
  { value: 4, label: 'Quý 4 (Oct – Dec)' },
]

const SHIFT_LABEL: Record<string, string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  evening: 'Ca tối',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getPreviousMonthPeriod(reference: Date): MonthPeriod {
  const currentMonth = reference.getMonth() + 1
  if (currentMonth === 1) return { year: reference.getFullYear() - 1, month: 12 }
  return { year: reference.getFullYear(), month: currentMonth - 1 }
}

function getPreviousQuarterPeriod(reference: Date): QuarterPeriod {
  const currentQuarter = Math.ceil((reference.getMonth() + 1) / 3)
  if (currentQuarter === 1) return { year: reference.getFullYear() - 1, quarter: 4 }
  return { year: reference.getFullYear(), quarter: currentQuarter - 1 }
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` }
}

function getQuarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = quarter * 3
  const lastDay = new Date(year, endMonth, 0).getDate()
  return {
    from: `${year}-${pad(startMonth)}-01`,
    to: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
  }
}

function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

function PerfTooltipContent({
  active,
  actualMinutes,
  expectedMinutes,
}: {
  active?: boolean
  actualMinutes: number
  expectedMinutes: number
}) {
  if (!active) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--rogym-bg-card)] px-3 py-2 text-xs shadow-xl">
      <p className="rogym-text-secondary">
        Thực tế: <span className="font-semibold text-white">{minutesToHours(actualMinutes)}h</span>
      </p>
      <p className="rogym-text-secondary">
        Kỳ vọng:{' '}
        <span className="font-semibold text-white">{minutesToHours(expectedMinutes)}h</span>
      </p>
    </div>
  )
}

function PerformancePieCard({
  emp,
  onViewDetail,
}: {
  emp: EmployeePerformanceItem
  onViewDetail: (staffId: string) => void
}) {
  const perf = emp.performancePercent
  const chartData = [
    { name: 'Thực tế', value: perf },
    { name: 'Còn lại', value: Math.max(0, 100 - perf) },
  ]

  return (
    <div className="rogym-card flex flex-col items-center gap-3 p-5 text-center">
      <div>
        <p className="font-mono text-xs rogym-text-dim">{emp.staffCode}</p>
        <p className="mt-0.5 font-semibold text-white leading-tight">{emp.fullName}</p>
        <p className="text-xs rogym-text-secondary capitalize">{emp.position}</p>
      </div>

      <PieChart width={140} height={140}>
        <Pie
          data={chartData}
          cx={70}
          cy={70}
          innerRadius={48}
          outerRadius={62}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
          strokeWidth={0}
        >
          <Label
            value={`${perf}%`}
            position="center"
            fill="white"
            style={{ fontSize: '20px', fontWeight: 700 }}
          />
          <Cell fill="var(--rogym-green)" />
          <Cell fill="rgba(255,255,255,0.08)" />
        </Pie>
        <Tooltip
          content={({ active }) => (
            <PerfTooltipContent
              active={active}
              actualMinutes={emp.actualMinutes}
              expectedMinutes={emp.expectedMinutes}
            />
          )}
        />
      </PieChart>

      <div className="text-xs rogym-text-dim space-y-0.5">
        <p>
          Thực tế:{' '}
          <span className="text-white font-medium">{minutesToHours(emp.actualMinutes)}h</span>
        </p>
        <p>
          Kỳ vọng:{' '}
          <span className="text-white font-medium">{minutesToHours(emp.expectedMinutes)}h</span>
        </p>
      </div>

      <OwnerBadge
        label={scoreLabel(emp.avgFeedbackSeverityScore)}
        color={scoreColor(emp.avgFeedbackSeverityScore)}
      />

      <button
        className="rogym-btn rogym-btn--secondary w-full text-xs"
        onClick={() => onViewDetail(emp.staffId)}
      >
        Xem chi tiết
      </button>
    </div>
  )
}

export default function EmployeePerformanceReportPage() {
  const [mode, setMode] = useState<FilterMode>('month')
  const [monthYear, setMonthYear] = useState(PREVIOUS_MONTH_PERIOD.year)
  const [month, setMonth] = useState(PREVIOUS_MONTH_PERIOD.month)
  const [quarterYear, setQuarterYear] = useState(PREVIOUS_QUARTER_PERIOD.year)
  const [quarter, setQuarter] = useState(PREVIOUS_QUARTER_PERIOD.quarter)
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  })
  const [customTo, setCustomTo] = useState(todayInput)
  const [data, setData] = useState<EmployeePerformanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRange, setCurrentRange] = useState<{ from: string; to: string } | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<EmployeePerformanceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const load = useCallback((from: string, to: string) => {
    setLoading(true)
    setError(null)
    reportService
      .getEmployeePerformance(from, to)
      .then((result) => {
        setData(result)
        setCurrentRange({ from, to })
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }, [])

  const handleLoad = useCallback(() => {
    if (mode === 'month') {
      const r = getMonthRange(monthYear, month)
      load(r.from, r.to)
    } else if (mode === 'quarter') {
      const r = getQuarterRange(quarterYear, quarter)
      load(r.from, r.to)
    } else {
      load(customFrom, customTo)
    }
  }, [mode, monthYear, month, quarterYear, quarter, customFrom, customTo, load])

  useEffect(() => {
    if (mode !== 'custom') handleLoad()
  }, [mode, monthYear, month, quarterYear, quarter, handleLoad])

  const selectedYear = mode === 'quarter' ? quarterYear : monthYear
  const handleYearChange = (value: string) => {
    const nextYear = Number(value)
    if (mode === 'quarter') setQuarterYear(nextYear)
    else setMonthYear(nextYear)
  }

  function openDetail(staffId: string) {
    if (!currentRange) return
    setDetailOpen(true)
    setDetailData(null)
    setDetailLoading(true)
    setDetailError(null)
    reportService
      .getEmployeePerformanceDetail(staffId, currentRange.from, currentRange.to)
      .then(setDetailData)
      .catch((err) => setDetailError(getApiError(err)))
      .finally(() => setDetailLoading(false))
  }

  const detailStaffName = detailData?.fullName ?? '...'

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Hiệu suất nhân viên"
        description="Hiệu suất làm việc theo thời gian thực tế / kỳ vọng của từng nhân viên"
      />

      {/* Bộ lọc */}
      <div className="rogym-card rogym-card--compact space-y-4 p-5">
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 w-fit">
          {(['month', 'quarter', 'custom'] as FilterMode[]).map((m) => (
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
              {m === 'month' ? 'Tháng' : m === 'quarter' ? 'Quý' : 'Tùy chỉnh'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {(mode === 'month' || mode === 'quarter') && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium rogym-text-dim">Năm</label>
                <OwnerSelect
                  value={String(selectedYear)}
                  onValueChange={handleYearChange}
                  ariaLabel="Năm"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </OwnerSelect>
              </div>

              {mode === 'month' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium rogym-text-dim">Tháng</label>
                  <OwnerSelect
                    value={String(month)}
                    onValueChange={(v) => setMonth(Number(v))}
                    ariaLabel="Tháng"
                  >
                    {MONTH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </OwnerSelect>
                </div>
              )}

              {mode === 'quarter' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium rogym-text-dim">Quý</label>
                  <OwnerSelect
                    value={String(quarter)}
                    onValueChange={(v) => setQuarter(Number(v))}
                    ariaLabel="Quý"
                  >
                    {QUARTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </OwnerSelect>
                </div>
              )}
            </>
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
                  max={todayInput()}
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
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={handleLoad} />
      ) : data.length === 0 ? (
        <OwnerEmptyState
          title="Không có dữ liệu"
          description="Không có nhân viên nào trong khoảng thời gian này."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((emp) => (
              <PerformancePieCard key={emp.staffId} emp={emp} onViewDetail={openDetail} />
            ))}
          </div>

          <div className="flex items-center gap-6 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-xs rogym-text-dim">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" /> 1.0–1.5: Tốt
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 1.5–2.5: Trung bình
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" /> 2.5–3.0: Cần cải thiện
            </span>
          </div>
        </>
      )}

      {/* Modal chi tiết hiệu suất */}
      <OwnerModal
        open={detailOpen}
        title={`Chi tiết hiệu suất — ${detailStaffName}`}
        onClose={() => setDetailOpen(false)}
        size="2xl"
      >
        {detailLoading ? (
          <OwnerSkeleton rows={5} />
        ) : detailError ? (
          <p className="text-sm text-red-400">{detailError}</p>
        ) : detailData ? (
          <div className="space-y-6">
            {/* Danh sách chấm công */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Danh sách chấm công</h3>
              {detailData.attendanceLogs.length === 0 ? (
                <p className="text-xs rogym-text-dim">Không có dữ liệu chấm công.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-left rogym-text-dim">
                        <th className="px-4 py-2.5 font-medium">Ngày</th>
                        <th className="px-4 py-2.5 font-medium">Check-in</th>
                        <th className="px-4 py-2.5 font-medium">Check-out</th>
                        <th className="px-4 py-2.5 font-medium text-right">Thời gian (h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {detailData.attendanceLogs.map((log) => (
                        <tr key={log.logId} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-white">{log.date}</td>
                          <td className="px-4 py-2.5 rogym-text-secondary">
                            {formatTime(log.checkIn)}
                          </td>
                          <td className="px-4 py-2.5 rogym-text-secondary">
                            {log.checkOut ? (
                              formatTime(log.checkOut)
                            ) : (
                              <span className="rogym-text-dim">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-white">
                            {log.durationMinutes != null ? (
                              minutesToHours(log.durationMinutes)
                            ) : (
                              <span className="rogym-text-dim">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Danh sách ca làm việc */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Danh sách ca làm việc</h3>
              {detailData.schedules.length === 0 ? (
                <p className="text-xs rogym-text-dim">Không có ca làm việc nào.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-left rogym-text-dim">
                        <th className="px-4 py-2.5 font-medium">Ngày</th>
                        <th className="px-4 py-2.5 font-medium">Ca</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {detailData.schedules.map((s) => (
                        <tr key={s.scheduleId} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-white">{s.workDate}</td>
                          <td className="px-4 py-2.5 rogym-text-secondary">
                            {SHIFT_LABEL[s.shift] ?? s.shift}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </OwnerModal>
    </OwnerPage>
  )
}
