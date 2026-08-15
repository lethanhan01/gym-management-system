import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckboxSize = 'sm' | 'md' | 'lg'

export interface BaseCheckboxProps {
  label?: ReactNode
  description?: ReactNode
  error?: boolean | string
  checkboxSize?: CheckboxSize
}

export function getCheckboxClasses({
  checked,
  disabled,
  hasError,
  checkboxSize = 'md',
}: {
  checked?: boolean
  disabled?: boolean
  hasError?: boolean
  checkboxSize?: CheckboxSize
}) {
  const sizeClasses = {
    sm: 'h-4 w-4 rounded',
    md: 'h-5 w-5 rounded-md',
    lg: 'h-6 w-6 rounded-md',
  }

  return cn(
    'flex items-center justify-center border bg-white/5 transition-all duration-200 shrink-0 touch-manipulation',
    sizeClasses[checkboxSize],
    checked
      ? 'border-[var(--rogym-teal)] bg-[var(--rogym-green-dark)] text-[var(--rogym-teal)] shadow-[0_0_8px_rgba(6,195,132,0.25)]'
      : 'border-white/20 hover:border-white/40',
    hasError && 'border-red-500/80 ring-1 ring-red-500/30',
    disabled && 'cursor-not-allowed opacity-50',
    !disabled && 'active:scale-95'
  )
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
