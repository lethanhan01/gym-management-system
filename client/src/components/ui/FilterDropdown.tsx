import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export type FilterDropdownSize = 'sm' | 'md' | 'lg'

export interface FilterDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCount?: number
  children: ReactNode
  onApply: () => void
  onClear?: () => void
  title?: string
  className?: string
  size?: FilterDropdownSize
  triggerClassName?: string
}

const sizeClasses: Record<FilterDropdownSize, string> = {
  sm: 'min-h-[38px] h-[38px] w-[38px] sm:w-auto px-0 sm:px-3 text-xs gap-1.5 justify-center',
  md: 'min-h-[44px] h-11 w-11 sm:w-auto px-0 sm:px-3.5 text-sm gap-2 justify-center',
  lg: 'min-h-[50px] h-[50px] w-[50px] sm:w-auto px-0 sm:px-4 text-base gap-2.5 justify-center',
}

const iconSizes: Record<FilterDropdownSize, number> = {
  sm: 13,
  md: 15,
  lg: 17,
}

const badgeClasses: Record<FilterDropdownSize, string> = {
  sm: 'h-4 min-w-[16px] px-1 text-[10px]',
  md: 'h-5 min-w-[20px] px-1.5 text-xs',
  lg: 'h-5 min-w-[20px] px-1.5 text-xs',
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
  size = 'md',
  triggerClassName,
}: FilterDropdownProps) {
  const { t: tc } = useTranslation('common')
  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={tc('button.filter', 'Lọc')}
        className={cn(
          'rogym-filter-trigger flex items-center rounded-xl font-semibold transition-colors',
          sizeClasses[size],
          activeCount > 0 && 'is-active w-auto px-2.5 sm:px-3.5',
          triggerClassName
        )}
      >
        <SlidersHorizontal size={iconSizes[size]} className="shrink-0" />
        <span className="hidden sm:inline">{tc('button.filter', 'Lọc')}</span>
        {activeCount > 0 && (
          <span
            className={cn(
              'flex items-center justify-center rounded-full bg-[var(--rogym-teal)] font-bold text-[var(--rogym-green-dark)] shrink-0',
              badgeClasses[size]
            )}
          >
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
