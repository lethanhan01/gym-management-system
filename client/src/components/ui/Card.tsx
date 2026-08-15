import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CardVariant = 'default' | 'compact' | 'interactive' | 'glass' | 'bordered'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses: Record<CardVariant, string> = {
      default: 'rogym-card p-6',
      compact: 'rogym-card rogym-card--compact p-5',
      interactive:
        'rogym-card rogym-card--compact p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--rogym-border-teal-hover)] hover:shadow-[var(--rogym-shadow-card)] cursor-pointer',
      glass:
        'rounded-2xl border border-white/10 bg-[var(--rogym-bg-glass)] p-6 shadow-[var(--rogym-shadow-glass)] backdrop-blur-xl',
      bordered:
        'rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] p-6',
    }

    return (
      <div ref={ref} className={cn(variantClasses[variant], className)} {...props}>
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  actions?: ReactNode
}

export function CardHeader({ className, actions, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        actions && 'flex-row items-center justify-between',
        className
      )}
      {...props}
    >
      <div className="space-y-1">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div'
}

export function CardTitle({ as: Comp = 'h3', className, children, ...props }: CardTitleProps) {
  return (
    <Comp
      className={cn('text-lg font-bold tracking-tight text-white', className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm rogym-text-secondary', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('pt-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 border-t border-white/5 pt-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
