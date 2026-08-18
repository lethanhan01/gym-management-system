import {
  forwardRef,
  type ElementType,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type CardVariant =
  | 'default'
  | 'compact'
  | 'interactive'
  | 'glass'
  | 'bordered'
  | 'elevated'
  | 'accent'
  | 'warning'
  | 'danger'

export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg'
export type CardSemanticTag = 'div' | 'article' | 'section' | 'li' | 'aside'

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    'rogym-card rounded-2xl md:rounded-[24px] border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-md transition-all duration-200',
  compact:
    'rogym-card rogym-card--compact rounded-xl md:rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-sm transition-all duration-200',
  interactive:
    'rogym-card rogym-card--compact rounded-xl md:rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--rogym-border-teal-hover)] hover:bg-[var(--rogym-bg-card-hover)] hover:shadow-[var(--rogym-shadow-card)] active:scale-[0.99] cursor-pointer touch-manipulation group',
  glass:
    'rounded-2xl md:rounded-[24px] border border-white/10 bg-[var(--rogym-bg-glass)] shadow-[var(--rogym-shadow-glass)] backdrop-blur-xl transition-all duration-200',
  bordered:
    'rounded-2xl md:rounded-[24px] border-2 border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-md transition-all duration-200',
  elevated:
    'rounded-2xl md:rounded-[24px] border border-white/10 bg-[var(--rogym-bg-card)] shadow-2xl transition-all duration-200',
  accent:
    'rounded-2xl md:rounded-[24px] border border-[var(--rogym-teal)]/40 bg-[var(--rogym-teal)]/[0.04] shadow-[0_0_24px_rgba(66,224,158,0.12)] transition-all duration-200',
  warning:
    'rounded-2xl md:rounded-[24px] border border-amber-400/30 bg-amber-400/[0.04] shadow-sm transition-all duration-200',
  danger:
    'rounded-2xl md:rounded-[24px] border border-red-400/30 bg-red-400/[0.04] shadow-sm transition-all duration-200',
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: 'p-0',
  xs: 'p-2.5 sm:p-3',
  sm: 'p-3.5 sm:p-4 md:p-5',
  md: 'p-4 sm:p-5 md:p-6',
  lg: 'p-5 sm:p-6 md:p-8',
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant
  padding?: CardPadding
  as?: CardSemanticTag
  to?: string
  href?: string
  selected?: boolean
  disabled?: boolean
  loading?: boolean
  children?: ReactNode
}

export const Card = forwardRef<HTMLElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      as = 'div',
      to,
      href,
      selected,
      disabled,
      loading,
      children,
      onClick,
      onKeyDown,
      tabIndex,
      role,
      ...props
    },
    ref
  ) => {
    const isClickable = Boolean(onClick || to || href || variant === 'interactive')
    const effectiveRole = role ?? (isClickable && as !== 'article' && as !== 'section' ? 'button' : undefined)
    const effectiveTabIndex = disabled ? -1 : tabIndex ?? (isClickable ? 0 : undefined)

    const baseClasses = cn(
      'relative overflow-hidden text-[var(--rogym-text-primary)]',
      VARIANT_CLASSES[variant],
      PADDING_CLASSES[padding],
      selected && 'border-[var(--rogym-teal)] ring-1 ring-[var(--rogym-teal)]/30',
      disabled && 'opacity-50 pointer-events-none cursor-not-allowed',
      loading && 'pointer-events-none',
      isClickable &&
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rogym-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rogym-bg-base)]',
      className
    )

    const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
      if (onKeyDown) {
        onKeyDown(e)
        return
      }
      if (onClick && !disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onClick(e as unknown as React.MouseEvent<HTMLElement>)
      }
    }

    if (to && !disabled) {
      return (
        <Link
          to={to}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={baseClasses}
          aria-disabled={disabled}
          aria-selected={selected}
          aria-busy={loading}
          {...(props as HTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </Link>
      )
    }

    if (href && !disabled) {
      return (
        <a
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={baseClasses}
          aria-disabled={disabled}
          aria-selected={selected}
          aria-busy={loading}
          {...(props as HTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      )
    }

    const Component = as as ElementType

    return (
      <Component
        ref={ref}
        className={baseClasses}
        role={effectiveRole}
        tabIndex={effectiveTabIndex}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        aria-disabled={disabled}
        aria-selected={selected}
        aria-busy={loading}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
Card.displayName = 'Card'

/* ── Card Header ─────────────────────────────────────────────── */

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  responsive?: boolean
}

export function CardHeader({
  eyebrow,
  icon,
  actions,
  responsive = true,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex gap-3',
        responsive
          ? 'flex-col sm:flex-row sm:items-start sm:justify-between'
          : actions
            ? 'flex-row items-start justify-between'
            : 'flex-col',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--rogym-teal)]/15 text-[var(--rogym-teal)]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div className="space-y-1 min-w-0 flex-1">
          {eyebrow && (
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--rogym-teal)]">
              {eyebrow}
            </div>
          )}
          {children}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
}

/* ── Card Title ──────────────────────────────────────────────── */

export type CardTitleSize = 'sm' | 'md' | 'lg' | 'xl'
export type CardHeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span' | 'p'

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: CardHeadingTag
  size?: CardTitleSize
  truncate?: boolean
  lineClamp?: 1 | 2 | 3
}

const TITLE_SIZES: Record<CardTitleSize, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-base sm:text-lg font-bold',
  lg: 'text-lg sm:text-xl font-bold',
  xl: 'text-xl sm:text-2xl font-extrabold',
}

export function CardTitle({
  as: Comp = 'h3',
  size = 'md',
  truncate = false,
  lineClamp,
  className,
  children,
  ...props
}: CardTitleProps) {
  return (
    <Comp
      className={cn(
        'tracking-tight text-white',
        TITLE_SIZES[size],
        truncate && 'truncate',
        lineClamp === 1 && 'line-clamp-1',
        lineClamp === 2 && 'line-clamp-2',
        lineClamp === 3 && 'line-clamp-3',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

/* ── Card Description ────────────────────────────────────────── */

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  lineClamp?: 1 | 2 | 3
}

export function CardDescription({
  lineClamp,
  className,
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn(
        'text-sm leading-relaxed rogym-text-secondary',
        lineClamp === 1 && 'line-clamp-1',
        lineClamp === 2 && 'line-clamp-2',
        lineClamp === 3 && 'line-clamp-3',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}

/* ── Card Media ──────────────────────────────────────────────── */

export type CardAspectRatio = '16/9' | '6/4' | '4/3' | '1/1' | '21/9' | 'auto'

export interface CardMediaProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  aspectRatio?: CardAspectRatio
  overlay?: boolean | 'dark' | 'gradient'
  badge?: ReactNode
  action?: ReactNode
  zoomOnHover?: boolean
}

const ASPECT_CLASSES: Record<CardAspectRatio, string> = {
  '16/9': 'aspect-[16/9]',
  '6/4': 'aspect-[6/4]',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  '21/9': 'aspect-[21/9]',
  auto: 'aspect-auto',
}

export function CardMedia({
  src,
  alt = '',
  aspectRatio = '6/4',
  overlay = false,
  badge,
  action,
  zoomOnHover = true,
  className,
  children,
  ...props
}: CardMediaProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-black/20 border-b border-white/5',
        ASPECT_CLASSES[aspectRatio],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn(
            'h-full w-full object-cover',
            zoomOnHover && 'transition-transform duration-300 group-hover:scale-105'
          )}
        />
      ) : (
        children
      )}

      {overlay === true || overlay === 'dark' ? (
        <div className="absolute inset-0 bg-black/40" />
      ) : overlay === 'gradient' ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      ) : null}

      {badge && (
        <div className="absolute left-3 top-3 z-10">
          {badge}
        </div>
      )}

      {action && (
        <div className="absolute right-3 top-3 z-10">
          {action}
        </div>
      )}
    </div>
  )
}

/* ── Card Content ────────────────────────────────────────────── */

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  noPaddingTop?: boolean
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

const SPACING_CLASSES = {
  none: '',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
}

export function CardContent({
  noPaddingTop = false,
  spacing = 'none',
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div
      className={cn(
        !noPaddingTop && 'pt-4',
        SPACING_CLASSES[spacing],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ── Card Footer ─────────────────────────────────────────────── */

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end' | 'between'
  bordered?: boolean
  responsiveStack?: boolean
}

const ALIGN_CLASSES = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}

export function CardFooter({
  align = 'end',
  bordered = true,
  responsiveStack = false,
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-4',
        ALIGN_CLASSES[align],
        bordered && 'border-t border-white/5',
        responsiveStack && 'flex-col sm:flex-row',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ── Card Ribbon ─────────────────────────────────────────────── */

export interface CardRibbonProps extends HTMLAttributes<HTMLSpanElement> {
  position?: 'top-left' | 'top-right'
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'purple' | 'primary'
}

const RIBBON_TONE_CLASSES = {
  accent: 'bg-[var(--rogym-teal)] text-[var(--rogym-green-dark)] font-bold',
  success: 'bg-emerald-500 text-white font-bold',
  warning: 'bg-amber-400 text-black font-bold',
  danger: 'bg-red-500 text-white font-bold',
  purple: 'bg-purple-500 text-white font-bold',
  primary: 'bg-[var(--rogym-green)] text-[var(--rogym-green-dark)] font-bold',
}

export function CardRibbon({
  position = 'top-right',
  tone = 'accent',
  className,
  children,
  ...props
}: CardRibbonProps) {
  return (
    <span
      className={cn(
        'absolute z-20 px-3 py-0.5 text-[11px] uppercase tracking-wider shadow-md',
        position === 'top-right'
          ? 'right-0 top-0 rounded-bl-xl'
          : 'left-0 top-0 rounded-br-xl',
        RIBBON_TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/* ── Card Skeleton ───────────────────────────────────────────── */

export interface CardSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  hasMedia?: boolean
  mediaAspect?: CardAspectRatio
  lines?: number
  hasHeader?: boolean
  hasFooter?: boolean
}

export function CardSkeleton({
  hasMedia = false,
  mediaAspect = '6/4',
  lines = 3,
  hasHeader = true,
  hasFooter = false,
  className,
  ...props
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rogym-card rounded-2xl border border-white/5 bg-[var(--rogym-bg-card)] overflow-hidden animate-pulse',
        className
      )}
      aria-busy="true"
      {...props}
    >
      {hasMedia && (
        <div className={cn('w-full bg-white/10', ASPECT_CLASSES[mediaAspect])} />
      )}
      <div className="p-5 space-y-4">
        {hasHeader && (
          <div className="space-y-2">
            <div className="h-5 w-2/3 rounded-lg bg-white/10" />
            <div className="h-3.5 w-1/3 rounded bg-white/5" />
          </div>
        )}
        <div className="space-y-2 pt-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3.5 rounded bg-white/5',
                i === lines - 1 ? 'w-4/5' : 'w-full'
              )}
            />
          ))}
        </div>
        {hasFooter && (
          <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
            <div className="h-8 w-20 rounded-lg bg-white/10" />
          </div>
        )}
      </div>
    </div>
  )
}
