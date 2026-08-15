import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  description?: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, disabled, onChange, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-start gap-3 select-none',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <div className="relative mt-0.5 flex items-center">
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
              'flex h-5 w-5 items-center justify-center rounded-md border border-white/20 bg-white/5 transition-all duration-200',
              'peer-checked:border-[var(--rogym-teal)] peer-checked:bg-[var(--rogym-green-dark)] peer-checked:text-[var(--rogym-teal)]',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--rogym-teal)]/50',
              'hover:border-white/40'
            )}
          >
            {checked && <Check size={14} strokeWidth={3} />}
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
Checkbox.displayName = 'Checkbox'
