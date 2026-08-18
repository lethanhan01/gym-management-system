import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertTone = 'error' | 'warning' | 'info' | 'success' | 'neutral'
export type AlertVariant = 'subtle' | 'outline' | 'filled'

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone
  variant?: AlertVariant
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  onClose?: () => void
  closeAriaLabel?: string
  className?: string
  children?: ReactNode
}

const DEFAULT_ICONS: Record<AlertTone, ReactNode> = {
  error: <AlertCircle size={18} className="shrink-0" />,
  warning: <AlertTriangle size={18} className="shrink-0" />,
  info: <Info size={18} className="shrink-0" />,
  success: <CheckCircle2 size={18} className="shrink-0" />,
  neutral: <Info size={18} className="shrink-0" />,
}

const TONE_CLASSES: Record<AlertTone, Record<AlertVariant, string>> = {
  error: {
    subtle: 'bg-red-500/10 border-red-500/25 text-red-200',
    outline: 'bg-transparent border-red-500/40 text-red-300',
    filled: 'bg-red-950/80 border-red-500/40 text-red-100',
  },
  warning: {
    subtle: 'bg-amber-500/10 border-amber-500/25 text-amber-200',
    outline: 'bg-transparent border-amber-500/40 text-amber-300',
    filled: 'bg-amber-950/80 border-amber-500/40 text-amber-100',
  },
  info: {
    subtle: 'bg-sky-500/10 border-sky-500/25 text-sky-200',
    outline: 'bg-transparent border-sky-500/40 text-sky-300',
    filled: 'bg-sky-950/80 border-sky-500/40 text-sky-100',
  },
  success: {
    subtle: 'bg-[var(--rogym-tone,var(--rogym-green))]/10 border-[var(--rogym-tone,var(--rogym-green))]/25 text-[var(--rogym-teal)]',
    outline: 'bg-transparent border-[var(--rogym-tone,var(--rogym-green))]/40 text-[var(--rogym-tone,var(--rogym-green))]',
    filled: 'bg-[var(--rogym-bg-deep-alt)]/90 border-[var(--rogym-tone,var(--rogym-green))]/40 text-emerald-100',
  },
  neutral: {
    subtle: 'bg-white/5 border-white/10 text-[var(--rogym-text-secondary)]',
    outline: 'bg-transparent border-white/15 text-[var(--rogym-text-secondary)]',
    filled: 'bg-[var(--rogym-bg-card)] border-white/15 text-white',
  },
}

const ICON_COLORS: Record<AlertTone, string> = {
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-sky-400',
  success: 'text-[var(--rogym-tone,var(--rogym-green))]',
  neutral: 'text-[var(--rogym-text-dim)]',
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      tone = 'info',
      variant = 'subtle',
      title,
      description,
      icon,
      action,
      onClose,
      closeAriaLabel = 'Close alert',
      className,
      children,
      role,
      ...props
    },
    ref
  ) => {
    const renderedIcon = icon !== undefined ? icon : DEFAULT_ICONS[tone]
    const isAlertRole = tone === 'error' || tone === 'warning'
    const effectiveRole = role ?? (isAlertRole ? 'alert' : 'status')
    const ariaLive = isAlertRole ? 'assertive' : 'polite'

    return (
      <div
        ref={ref}
        role={effectiveRole}
        aria-live={ariaLive}
        className={cn(
          'relative flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border transition-all text-sm',
          TONE_CLASSES[tone][variant],
          className
        )}
        {...props}
      >
        {renderedIcon && (
          <span className={cn('shrink-0 mt-0.5', ICON_COLORS[tone])}>{renderedIcon}</span>
        )}

        <div className="flex-1 min-w-0">
          {title && <AlertTitle>{title}</AlertTitle>}
          {description && <AlertDescription>{description}</AlertDescription>}
          {children}
          {action && <div className="mt-2.5 flex items-center gap-2">{action}</div>}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeAriaLabel}
            className="shrink-0 p-1 -m-1 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            <X size={15} />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

export interface AlertTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string
  children?: ReactNode
}

export const AlertTitle = forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h4
        ref={ref}
        className={cn('font-semibold text-white tracking-wide mb-0.5', className)}
        {...props}
      >
        {children}
      </h4>
    )
  }
)
AlertTitle.displayName = 'AlertTitle'

export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string
  children?: ReactNode
}

export const AlertDescription = forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn('text-xs sm:text-sm text-inherit leading-relaxed', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AlertDescription.displayName = 'AlertDescription'

