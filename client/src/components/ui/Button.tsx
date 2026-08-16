import { cn } from '@/lib/utils'
import {
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  type ReactNode,
  forwardRef,
} from 'react'
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
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'default'
  | 'compact'
  | 'wide'
  | 'hero'
  | 'nav'

export interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loading?: boolean
  loadingText?: string
  fullWidth?: boolean
  wide?: boolean
  mobileFull?: boolean
  responsiveIconOnly?: boolean
  truncate?: boolean
}

export function normalizeButtonSize(size: ButtonSize = 'default'): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'nav' | 'wide' {
  switch (size) {
    case 'xs':
      return 'xs'
    case 'sm':
    case 'compact':
      return 'sm'
    case 'lg':
      return 'lg'
    case 'xl':
    case 'hero':
      return 'xl'
    case 'nav':
      return 'nav'
    case 'wide':
      return 'wide'
    case 'md':
    case 'default':
    default:
      return 'md'
  }
}

export function getButtonClasses({
  variant = 'primary',
  size = 'default',
  fullWidth,
  wide,
  mobileFull,
  truncate,
  className,
}: BaseButtonProps & { className?: string }) {
  const isTextLink = variant.startsWith('text') || variant === 'nav-link'

  if (isTextLink) {
    return cn(
      variant === 'nav-link' ? 'nav-link-underline' : 'rogym-text-link',
      variant === 'text-muted' && 'rogym-text-link--muted',
      variant === 'text-accent' && 'rogym-text-link--accent',
      truncate && 'rogym-btn--truncate',
      className
    )
  }

  const normalizedSize = normalizeButtonSize(size)
  const isIconVariant = variant === 'icon'

  return cn(
    'rogym-btn',
    // Variant classes
    variant === 'primary' && 'rogym-btn--primary',
    (variant === 'secondary' || variant === 'outline-white') && 'rogym-btn--outline-white',
    variant === 'danger' && 'rogym-btn--danger',
    variant === 'outline-green' && 'rogym-btn--outline-green',
    variant === 'outline-green-light' && 'rogym-btn--outline-green-light',
    variant === 'dark' && 'rogym-btn--dark',
    variant === 'elevated' && 'rogym-btn--elevated',
    isIconVariant && 'rogym-btn--icon rogym-btn--elevated',

    // Icon size overrides
    isIconVariant && normalizedSize === 'xs' && 'rogym-btn--icon-xs',
    isIconVariant && normalizedSize === 'sm' && 'rogym-btn--icon-sm',
    isIconVariant && normalizedSize === 'lg' && 'rogym-btn--icon-lg',

    // Standard sizes (non-icon)
    !isIconVariant && normalizedSize === 'xs' && 'rogym-btn--xs',
    !isIconVariant && normalizedSize === 'sm' && 'rogym-btn--sm',
    !isIconVariant && normalizedSize === 'md' && 'rogym-btn--md',
    !isIconVariant && normalizedSize === 'lg' && 'rogym-btn--lg',
    !isIconVariant && normalizedSize === 'xl' && 'rogym-btn--xl',
    !isIconVariant && normalizedSize === 'nav' && 'rogym-btn--nav',

    // Width and layout modifiers
    (fullWidth || wide || normalizedSize === 'wide') && 'rogym-btn--full',
    mobileFull && 'rogym-btn--mobile-full',
    truncate && 'rogym-btn--truncate',

    className
  )
}

function getSpinnerClass(size: ButtonSize = 'default') {
  const normalizedSize = normalizeButtonSize(size)
  switch (normalizedSize) {
    case 'xs':
      return 'h-3 w-3 border-[1.5px]'
    case 'sm':
      return 'h-3.5 w-3.5 border-2'
    case 'lg':
    case 'xl':
      return 'h-5 w-5 border-2'
    case 'md':
    case 'nav':
    case 'wide':
    default:
      return 'h-4 w-4 border-2'
  }
}

interface ButtonContentProps extends BaseButtonProps {
  children?: ReactNode
}

export function ButtonContent({
  size = 'default',
  leftIcon,
  rightIcon,
  loading,
  loadingText,
  responsiveIconOnly,
  truncate,
  children,
}: ButtonContentProps) {
  const effectiveContent = loading && loadingText ? loadingText : children
  const spinnerClass = getSpinnerClass(size)

  if (loading) {
    return (
      <>
        <span
          className={cn(
            'inline-block animate-spin rounded-full border-current border-t-transparent shrink-0',
            spinnerClass
          )}
          aria-hidden="true"
        />
        {effectiveContent && (
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-0',
              truncate && 'truncate',
              responsiveIconOnly && 'hidden sm:inline-flex'
            )}
          >
            {effectiveContent}
          </span>
        )}
      </>
    )
  }

  return (
    <>
      {leftIcon && (
        <span className="inline-flex shrink-0 items-center justify-center" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      {children && (
        <span
          className={cn(
            'inline-flex items-center justify-center gap-1.5 min-w-0 max-w-full text-center',
            truncate && 'truncate',
            responsiveIconOnly && leftIcon && 'hidden sm:inline-flex'
          )}
        >
          {children}
        </span>
      )}
      {rightIcon && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center',
            responsiveIconOnly && 'hidden sm:inline-flex'
          )}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}
    </>
  )
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    BaseButtonProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'default',
      leftIcon,
      rightIcon,
      loading = false,
      loadingText,
      fullWidth,
      wide,
      mobileFull,
      responsiveIconOnly,
      truncate,
      className,
      children,
      disabled,
      type,
      ...props
    },
    ref
  ) => {
    const isActuallyDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={isActuallyDisabled}
        aria-busy={loading ? 'true' : undefined}
        aria-disabled={isActuallyDisabled ? 'true' : undefined}
        className={getButtonClasses({
          variant,
          size,
          fullWidth,
          wide,
          mobileFull,
          truncate,
          className,
        })}
        {...props}
      >
        <ButtonContent
          size={size}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          loading={loading}
          loadingText={loadingText}
          responsiveIconOnly={responsiveIconOnly}
          truncate={truncate}
        >
          {children}
        </ButtonContent>
      </button>
    )
  }
)
Button.displayName = 'Button'

export interface ButtonLinkProps extends LinkProps, BaseButtonProps {
  disabled?: boolean
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    {
      variant = 'primary',
      size = 'default',
      leftIcon,
      rightIcon,
      loading = false,
      loadingText,
      fullWidth,
      wide,
      mobileFull,
      responsiveIconOnly,
      truncate,
      className,
      children,
      disabled,
      to,
      tabIndex,
      onClick,
      ...props
    },
    ref
  ) => {
    const isActuallyDisabled = disabled || loading

    return (
      <Link
        ref={ref}
        to={isActuallyDisabled ? '#' : to}
        tabIndex={isActuallyDisabled ? -1 : tabIndex}
        aria-busy={loading ? 'true' : undefined}
        aria-disabled={isActuallyDisabled ? 'true' : undefined}
        onClick={(e) => {
          if (isActuallyDisabled) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
          onClick?.(e)
        }}
        className={cn(
          getButtonClasses({
            variant,
            size,
            fullWidth,
            wide,
            mobileFull,
            truncate,
            className,
          }),
          isActuallyDisabled && 'pointer-events-none opacity-50 cursor-not-allowed'
        )}
        {...props}
      >
        <ButtonContent
          size={size}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          loading={loading}
          loadingText={loadingText}
          responsiveIconOnly={responsiveIconOnly}
          truncate={truncate}
        >
          {children}
        </ButtonContent>
      </Link>
    )
  }
)
ButtonLink.displayName = 'ButtonLink'

export interface ButtonAnchorProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>,
    BaseButtonProps {
  disabled?: boolean
}

export const ButtonAnchor = forwardRef<HTMLAnchorElement, ButtonAnchorProps>(
  (
    {
      variant = 'primary',
      size = 'default',
      leftIcon,
      rightIcon,
      loading = false,
      loadingText,
      fullWidth,
      wide,
      mobileFull,
      responsiveIconOnly,
      truncate,
      className,
      children,
      disabled,
      href,
      tabIndex,
      onClick,
      ...props
    },
    ref
  ) => {
    const isActuallyDisabled = disabled || loading

    return (
      <a
        ref={ref}
        href={isActuallyDisabled ? undefined : href}
        tabIndex={isActuallyDisabled ? -1 : tabIndex}
        aria-busy={loading ? 'true' : undefined}
        aria-disabled={isActuallyDisabled ? 'true' : undefined}
        onClick={(e) => {
          if (isActuallyDisabled) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
          onClick?.(e)
        }}
        className={cn(
          getButtonClasses({
            variant,
            size,
            fullWidth,
            wide,
            mobileFull,
            truncate,
            className,
          }),
          isActuallyDisabled && 'pointer-events-none opacity-50 cursor-not-allowed'
        )}
        {...props}
      >
        <ButtonContent
          size={size}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          loading={loading}
          loadingText={loadingText}
          responsiveIconOnly={responsiveIconOnly}
          truncate={truncate}
        >
          {children}
        </ButtonContent>
      </a>
    )
  }
)
ButtonAnchor.displayName = 'ButtonAnchor'
