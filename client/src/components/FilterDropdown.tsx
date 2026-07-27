import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FilterDropdown({
  open,
  onOpenChange,
  activeCount = 0,
  children,
  onApply,
  onClear,
  title,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCount?: number
  children: ReactNode
  onApply: () => void
  onClear?: () => void
  title?: string
  className?: string
}) {
  const { t: tc } = useTranslation('common')
  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "rogym-filter-trigger flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
          activeCount > 0 && "is-active"
        )}
      >
        <SlidersHorizontal size={13} />
        {tc('button.filter', 'Lọc')}
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold rogym-sx-fc269f1b">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 min-w-[260px] rounded-[20px] border border-[rgba(6,195,132,0.25)] bg-[#0a1f17] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            {title && (
              <p className="mb-4 text-sm font-bold text-white">{title}</p>
            )}
            
            <div className="space-y-4 mb-5">
              {children}
            </div>

            <div className="flex justify-end gap-2">
              {onClear && (
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white px-4"
                  onClick={onClear}
                >
                  {tc('button.clear', 'Xóa lọc')}
                </button>
              )}
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white px-4"
                onClick={() => onOpenChange(false)}
              >
                {tc('button.cancel')}
              </button>
              <button
                type="button"
                className="rogym-btn rogym-btn--primary px-4"
                onClick={() => {
                  onApply()
                  onOpenChange(false)
                }}
              >
                {tc('button.save')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
