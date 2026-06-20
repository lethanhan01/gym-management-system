import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'outline-white' | 'danger' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  wide?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', wide, loading, className, children, disabled, type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled || loading}
        className={cn(
          'rogym-btn',
          variant === 'primary' && 'rogym-btn--primary',
          variant === 'outline-white' && 'rogym-btn--outline-white',
          variant === 'danger' && 'rogym-btn--danger',
          variant === 'icon' && 'rogym-btn--icon rogym-btn--elevated',
          wide && 'rogym-btn--wide',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
