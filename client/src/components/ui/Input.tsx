import { forwardRef, type InputHTMLAttributes, type ReactNode, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  error?: boolean | string
  inputSize?: 'sm' | 'md' | 'lg'
  showPasswordToggle?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      leadingIcon,
      trailingIcon,
      error,
      inputSize = 'md',
      showPasswordToggle,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPasswordType = type === 'password' && showPasswordToggle
    const actualType = isPasswordType ? (showPassword ? 'text' : 'password') : type

    const sizeClasses = {
      sm: 'py-1.5 text-xs',
      md: 'py-2.5 text-sm',
      lg: 'py-3.5 text-base',
    }

    return (
      <div className="relative flex w-full items-center">
        {leadingIcon && (
          <div className="pointer-events-none absolute left-3.5 flex items-center justify-center rogym-text-dim">
            {leadingIcon}
          </div>
        )}

        <input
          ref={ref}
          type={actualType}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn(
            'rogym-input w-full',
            sizeClasses[inputSize],
            leadingIcon && 'pl-10',
            (trailingIcon || isPasswordType) && 'pr-10',
            error && 'border-red-500/80 focus:border-red-400 focus:ring-1 focus:ring-red-400/30',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          {...props}
        />

        {isPasswordType ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3.5 flex items-center justify-center rogym-text-dim transition-colors hover:text-white"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : trailingIcon ? (
          <div className="pointer-events-none absolute right-3.5 flex items-center justify-center rogym-text-dim">
            {trailingIcon}
          </div>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
