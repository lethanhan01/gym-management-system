import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface FilterDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCount?: number
  children: ReactNode
  onApply: () => void
  onClear?: () => void
  title?: string
  className?: string
}

export function FilterDropdown({
  open,
  onOpenChange,
  activeCount = 0,
  children,
  onApply,
  onClear,
  title,
  className,
}: FilterDropdownProps) {
  const { t: tc } = useTranslation('common')
  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          'rogym-filter-trigger flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
          activeCount > 0 && 'is-active'
        )}
      >
        <SlidersHorizontal size={13} />
        {tc('button.filter', 'Lọc')}
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--rogym-teal)] text-[10px] font-bold text-[var(--rogym-green-dark)]">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 min-w-[260px] rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {title && <p className="mb-4 text-sm font-bold text-white">{title}</p>}

            <div className="mb-5 space-y-4">{children}</div>

            <div className="flex justify-end gap-2">
              {onClear && (
                <Button
                  variant="outline-white"
                  size="compact"
                  onClick={onClear}
                >
                  {tc('button.clear', 'Xóa lọc')}
                </Button>
              )}
              <Button
                variant="outline-white"
                size="compact"
                onClick={() => onOpenChange(false)}
              >
                {tc('button.cancel')}
              </Button>
              <Button
                variant="primary"
                size="compact"
                onClick={() => {
                  onApply()
                  onOpenChange(false)
                }}
              >
                {tc('button.save')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
