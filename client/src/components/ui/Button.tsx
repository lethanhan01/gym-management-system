import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'outline-white'
  | 'outline-green'
  | 'outline-green-light'
  | 'dark'
  | 'elevated'
  | 'icon'
  | 'text'
  | 'text-muted'
  | 'text-accent'
  | 'nav-link'

export type ButtonSize =
  | 'default'
  | 'compact'
  | 'wide'
  | 'hero'
  | 'nav'

export interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  mobileFull?: boolean
  loading?: boolean
}

export function getButtonClasses({
  variant = 'primary',
  size = 'default',
  mobileFull,
  className,
}: BaseButtonProps & { className?: string }) {
  const isTextLink = variant.startsWith('text') || variant === 'nav-link'

  if (isTextLink) {
    return cn(
      variant === 'nav-link' ? 'nav-link-underline' : 'rogym-text-link',
      variant === 'text-muted' && 'rogym-text-link--muted',
      variant === 'text-accent' && 'rogym-text-link--accent',
      className
    )
  }

  return cn(
    'rogym-btn',
    variant === 'primary' && 'rogym-btn--primary',
    (variant === 'secondary' || variant === 'outline-white') && 'rogym-btn--outline-white',
    variant === 'danger' && 'rogym-btn--danger',
    variant === 'outline-green' && 'rogym-btn--outline-green',
    variant === 'outline-green-light' && 'rogym-btn--outline-green-light',
    variant === 'dark' && 'rogym-btn--dark',
    variant === 'elevated' && 'rogym-btn--elevated',
    variant === 'icon' && 'rogym-btn--icon rogym-btn--elevated',
    size === 'compact' && 'rogym-btn--compact',
    size === 'wide' && 'rogym-btn--wide',
    size === 'hero' && 'rogym-btn--hero',
    size === 'nav' && 'rogym-btn--nav',
    mobileFull && 'rogym-btn--mobile-full',
    className
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseButtonProps {
  wide?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size, wide, mobileFull, loading, className, children, disabled, type, ...props }, ref) => {
    const effectiveSize = wide ? 'wide' : size

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled || loading}
        className={getButtonClasses({ variant, size: effectiveSize, mobileFull, className })}
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

export interface ButtonLinkProps extends LinkProps, BaseButtonProps {
  wide?: boolean
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ variant = 'primary', size, wide, mobileFull, loading, className, children, ...props }, ref) => {
    const effectiveSize = wide ? 'wide' : size

    return (
      <Link
        ref={ref}
        className={getButtonClasses({ variant, size: effectiveSize, mobileFull, className })}
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
      </Link>
    )
  }
)
ButtonLink.displayName = 'ButtonLink'

export interface ButtonAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement>, BaseButtonProps {
  wide?: boolean
}

export const ButtonAnchor = forwardRef<HTMLAnchorElement, ButtonAnchorProps>(
  ({ variant = 'primary', size, wide, mobileFull, loading, className, children, ...props }, ref) => {
    const effectiveSize = wide ? 'wide' : size

    return (
      <a
        ref={ref}
        className={getButtonClasses({ variant, size: effectiveSize, mobileFull, className })}
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
      </a>
    )
  }
)
ButtonAnchor.displayName = 'ButtonAnchor'
