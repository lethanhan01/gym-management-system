import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: string
  accent?: boolean
  trend?: {
    value: number | string
    isPositive?: boolean
    label?: string
  }
  loading?: boolean
  to?: string
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      icon,
      label,
      value,
      hint,
      accent = true,
      trend,
      loading = false,
      to,
      className,
      ...props
    },
    ref
  ) => {
    const cardClass = cn(
      'rogym-card rogym-card--compact p-5 flex flex-col justify-between transition-all duration-200',
      to &&
        'cursor-pointer hover:border-[var(--rogym-border-teal-hover)] hover:bg-[var(--rogym-bg-card-hover)] active:scale-[0.99] touch-manipulation',
      className
    )

    const content = (
      <>
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors shrink-0',
              accent
                ? 'bg-[var(--rogym-teal)]/15 text-[var(--rogym-teal)]'
                : 'bg-white/5 rogym-text-secondary'
            )}
            aria-hidden="true"
          >
            {icon}
          </div>

          {trend && !loading && (
            <span
              className={cn(
                'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full',
                trend.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              )}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse" aria-busy="true">
            <div className="h-8 w-24 rounded-lg bg-white/10" />
            <div className="h-4 w-32 rounded bg-white/5" />
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {value}
            </div>
            <div className="mt-1 text-sm font-medium rogym-text-secondary">
              {label}
            </div>
            {hint && (
              <div className="mt-2 text-xs rogym-text-dim leading-relaxed">
                {hint}
              </div>
            )}
          </div>
        )}
      </>
    )

    if (to) {
      return (
        <Link to={to} className={cardClass}>
          {content}
        </Link>
      )
    }

    return (
      <div ref={ref} className={cardClass} {...props}>
        {content}
      </div>
    )
  }
)
StatCard.displayName = 'StatCard'
