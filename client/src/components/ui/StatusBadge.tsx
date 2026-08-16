import { forwardRef } from 'react'
import { statusLabel, statusTone, type StatusTone } from '@/lib/status'
import { Badge, type BadgeProps, type BadgeTone, type BadgeSize } from './Badge'

export type { StatusTone }

export interface StatusBadgeProps extends Omit<BadgeProps, 'tone' | 'children'> {
  status: string
  tone?: StatusTone | BadgeTone
  label?: string
  size?: BadgeSize
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, tone, label, size = 'md', className, ...props }, ref) => {
    const effectiveTone = (tone ?? statusTone(status)) as BadgeTone
    const effectiveLabel = label ?? statusLabel(status)

    return (
      <Badge
        ref={ref}
        tone={effectiveTone}
        size={size}
        className={className}
        {...props}
      >
        {effectiveLabel}
      </Badge>
    )
  }
)
StatusBadge.displayName = 'StatusBadge'
