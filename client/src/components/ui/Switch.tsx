import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode
  description?: ReactNode
  switchSize?: 'sm' | 'md'
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    { className, label, description, checked, disabled, onChange, id, switchSize = 'md', ...props },
    ref
  ) => {
    const isSm = switchSize === 'sm'

    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-center gap-3 select-none',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'rounded-full border border-white/20 bg-white/10 transition-colors duration-200',
              isSm ? 'h-5 w-9' : 'h-6 w-11',
              'peer-checked:border-[var(--rogym-teal)] peer-checked:bg-[var(--rogym-green)]',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--rogym-teal)]/50'
            )}
          >
            <div
              className={cn(
                'rounded-full bg-white transition-transform duration-200',
                isSm ? 'h-4 w-4 translate-y-0.5 translate-x-0.5' : 'h-5 w-5 translate-y-0.5 translate-x-0.5',
                checked && (isSm ? 'translate-x-4.5 bg-[var(--rogym-bg-base)]' : 'translate-x-5.5 bg-[var(--rogym-bg-base)]')
              )}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-sm font-medium text-white">{label}</span>}
            {description && <span className="text-xs rogym-text-dim">{description}</span>}
          </div>
        )}
      </label>
    )
  }
)
Switch.displayName = 'Switch'
