import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCheckboxClasses } from './checkbox-utils'

export type CheckboxSize = 'sm' | 'md' | 'lg'

export interface BaseCheckboxProps {
  label?: ReactNode
  description?: ReactNode
  error?: boolean | string
  checkboxSize?: CheckboxSize
}

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>,
    BaseCheckboxProps {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      checkboxSize = 'md',
      checked,
      disabled,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    return (
      <label
        htmlFor={id}
        className={cn(
          'group inline-flex min-h-[44px] items-start gap-3 select-none py-1.5 touch-manipulation',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <div className="relative mt-0.5 flex items-center shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            aria-invalid={!!error}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              getCheckboxClasses({
                checked,
                disabled,
                hasError: !!error,
                checkboxSize,
              }),
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--rogym-teal)]/50'
            )}
            aria-hidden="true"
          >
            {checked && (
              <Check
                size={checkboxSize === 'sm' ? 12 : checkboxSize === 'lg' ? 16 : 14}
                strokeWidth={3}
              />
            )}
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
            {error && typeof error === 'string' && (
              <span className="text-xs text-red-400 mt-1">{error}</span>
            )}
          </div>
        )}
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'
