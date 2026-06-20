import { LoaderCircle } from 'lucide-react'
import { todayInput } from '@/lib/date'

interface OwnerDateRangeFilterProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onLoad: () => void
  loading?: boolean
  maxTo?: string
}

export function OwnerDateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onLoad,
  loading = false,
  maxTo,
}: OwnerDateRangeFilterProps) {
  const effectiveMaxTo = maxTo ?? todayInput()
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium rogym-text-dim">Từ ngày</label>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => onFromChange(e.target.value)}
          className="rogym-input"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium rogym-text-dim">Đến ngày</label>
        <input
          type="date"
          value={to}
          min={from}
          max={effectiveMaxTo}
          onChange={(e) => onToChange(e.target.value)}
          className="rogym-input"
        />
      </div>
      <button className="rogym-btn rogym-btn--primary" onClick={onLoad} disabled={loading}>
        {loading && <LoaderCircle size={15} className="animate-spin" />}
        Tải báo cáo
      </button>
    </div>
  )
}
