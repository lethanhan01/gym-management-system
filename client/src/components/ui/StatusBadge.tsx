import { statusLabel, statusTone, type StatusTone } from '@/lib/status'
import { Badge, type BadgeTone } from './Badge'

export type { StatusTone }

export interface StatusBadgeProps {
  status: string
  tone?: StatusTone | BadgeTone
  label?: string
  className?: string
}

export function StatusBadge({ status, tone, label, className }: StatusBadgeProps) {
  const effectiveTone = (tone ?? statusTone(status)) as BadgeTone
  const effectiveLabel = label ?? statusLabel(status)

  return (
    <Badge tone={effectiveTone} className={className}>
      {effectiveLabel}
    </Badge>
  )
}
