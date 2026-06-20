import type { ReactNode } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] space-y-6', className)}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--rogym-border-section)] pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <div className="rogym-eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 rogym-text-secondary">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/5"
        />
      ))}
    </div>
  )
}

export function PageEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rogym-card rogym-card--compact flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 rogym-text-dim">
        <Search size={20} />
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm rogym-text-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rogym-card rogym-card--compact flex items-center gap-4 border-red-400/20 p-5">
      <AlertCircle className="shrink-0 text-red-300" size={22} />
      <div className="flex-1 text-sm text-red-200">{message}</div>
      {onRetry && (
        <button
          type="button"
          className="rogym-btn rogym-btn--outline-white px-4 py-2 text-xs"
          onClick={onRetry}
        >
          Thử lại
        </button>
      )}
    </div>
  )
}
