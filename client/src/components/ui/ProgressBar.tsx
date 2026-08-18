import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ProgressBarTone =
  | 'primary'
  | 'cyan'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
export type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  tone?: ProgressBarTone
  size?: ProgressBarSize
  label?: ReactNode
  hint?: ReactNode
  showValue?: boolean
  valueFormatter?: (value: number, percentage: number) => ReactNode
  animated?: boolean
  striped?: boolean
  className?: string
  trackClassName?: string
  barClassName?: string
  'aria-label'?: string
}

const SIZE_CLASSES: Record<ProgressBarSize, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
  xl: 'h-5',
}

const TONE_CLASSES: Record<ProgressBarTone, string> = {
  primary: 'bg-[var(--rogym-tone,var(--rogym-green))] shadow-[0_0_10px_rgba(6,195,132,0.4)]',
  cyan: 'bg-[var(--rogym-teal)] shadow-[0_0_10px_rgba(66,224,158,0.4)]',
  success: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]',
  warning: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]',
  danger: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
  purple: 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.4)]',
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      tone = 'primary',
      size = 'md',
      label,
      hint,
      showValue = false,
      valueFormatter,
      animated = false,
      striped = false,
      className,
      trackClassName,
      barClassName,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const clampedValue = Math.min(Math.max(0, value), max)
    const percentage = max > 0 ? Math.round((clampedValue / max) * 100) : 0

    const formattedValue = valueFormatter
      ? valueFormatter(clampedValue, percentage)
      : `${percentage}%`

    const hasHeader = label || hint || showValue

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {hasHeader && (
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            {label ? (
              <span id={`${autoId}-label`} className="font-medium text-white/90">
                {label}
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              {hint && (
                <span className="text-[var(--rogym-text-dim)]">{hint}</span>
              )}
              {showValue && (
                <span className="font-semibold text-white font-mono">{formattedValue}</span>
              )}
            </div>
          </div>
        )}

        <div
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={ariaLabel}
          aria-labelledby={label ? `${autoId}-label` : undefined}
          className={cn(
            'w-full overflow-hidden rounded-full bg-white/10 border border-white/5',
            SIZE_CLASSES[size],
            trackClassName
          )}
        >
          <div
            style={{ width: `${percentage}%` }}
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              TONE_CLASSES[tone],
              animated && 'animate-pulse',
              striped &&
                'bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]',
              barClassName
            )}
          />
        </div>
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

