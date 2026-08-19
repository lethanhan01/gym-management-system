import type { ReactNode } from 'react'

export function ProfileInfoRow({
  label,
  value,
  isPlaceholder,
}: {
  label: string
  value: ReactNode
  isPlaceholder?: boolean
}) {
  const isString = typeof value === 'string'
  const isMuted =
    isPlaceholder ||
    (isString &&
      (value === '--' ||
        value === '—' ||
        value === '未登録' ||
        value === 'Chưa cập nhật' ||
        value === 'Chưa phân công' ||
        value === 'Not updated' ||
        value === 'Not assigned'))

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 text-sm">
      <span className="shrink-0 min-w-[90px] sm:min-w-[130px] rogym-text-dim">{label}</span>
      <div className={`min-w-0 flex-1 text-right font-medium break-words ${isMuted ? 'text-white/40 italic' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}

