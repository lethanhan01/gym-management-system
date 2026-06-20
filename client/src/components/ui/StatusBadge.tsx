import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'accent' | 'warning' | 'danger' | 'muted'

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'border-[rgba(6,195,132,0.3)] bg-[rgba(6,195,132,0.12)] text-[#42e09e]',
  accent: 'border-[rgba(66,224,158,0.35)] bg-[rgba(66,224,158,0.12)] text-[#42e09e]',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  danger: 'border-red-400/30 bg-red-400/10 text-red-300',
  muted: 'border-white/10 bg-white/5 rogym-text-dim',
}

interface StatusBadgeProps {
  status: string
  tone: StatusTone
}

export function StatusBadge({ status, tone }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        TONE_CLASSES[tone]
      )}
    >
      {status}
    </span>
  )
}
