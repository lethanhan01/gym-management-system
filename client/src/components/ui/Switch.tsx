import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SwitchSize = 'sm' | 'md' | 'lg'

export interface BaseSwitchProps {
  label?: ReactNode
  description?: ReactNode
  switchSize?: SwitchSize
  size?: SwitchSize
  loading?: boolean
}

export function getSwitchClasses({
  checked,
  disabled,
  switchSize = 'md',
}: {
  checked?: boolean
  disabled?: boolean
  switchSize?: SwitchSize
}) {
  const trackSizes = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-13',
  }

  return cn(
    'rounded-full border border-white/20 bg-white/10 transition-all duration-200 shrink-0 touch-manipulation',
    trackSizes[switchSize],
    checked && 'border-[var(--rogym-teal)] bg-[var(--rogym-green)] shadow-[0_0_8px_rgba(6,195,132,0.25)]',
    disabled && 'cursor-not-allowed opacity-50',
    !disabled && 'active:scale-95'
  )
}

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
    BaseSwitchProps {}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      label,
      description,
      checked,
      disabled,
      onChange,
      id,
      switchSize,
      size = 'md',
      loading,
      ...props
    },
    ref
  ) => {
    const effectiveSize = switchSize ?? size
    const isSm = effectiveSize === 'sm'
    const isLg = effectiveSize === 'lg'

    return (
      <label
        htmlFor={id}
        className={cn(
          'group inline-flex min-h-[44px] items-center gap-3 select-none py-1.5 touch-manipulation',
          disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <div className="relative flex items-center shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled || loading}
            aria-checked={checked}
            aria-busy={loading ? 'true' : undefined}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              getSwitchClasses({
                checked,
                disabled: disabled || loading,
                switchSize: effectiveSize,
              }),
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--rogym-teal)]/50'
            )}
            aria-hidden="true"
          >
            <div
              className={cn(
                'rounded-full bg-white transition-transform duration-200 flex items-center justify-center',
                isSm
                  ? 'h-4 w-4 translate-y-0.5 translate-x-0.5'
                  : isLg
                  ? 'h-5.5 w-5.5 translate-y-0.5 translate-x-0.5'
                  : 'h-5 w-5 translate-y-0.5 translate-x-0.5',
                checked &&
                  (isSm
                    ? 'translate-x-4.5 bg-[var(--rogym-bg-base)]'
                    : isLg
                    ? 'translate-x-6.5 bg-[var(--rogym-bg-base)]'
                    : 'translate-x-5.5 bg-[var(--rogym-bg-base)]')
              )}
            >
              {loading && (
                <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent text-emerald-800" />
              )}
            </div>
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col select-none">
            {label && (
              <span className="text-sm font-medium text-white group-hover:text-white/90 transition-colors">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs rogym-text-dim mt-0.5">{description}</span>
            )}
          </div>
        )}
      </label>
    )
  }
)
Switch.displayName = 'Switch'
