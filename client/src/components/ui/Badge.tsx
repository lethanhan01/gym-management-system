import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'success' | 'accent' | 'warning' | 'danger' | 'muted' | 'primary' | 'outline'
export type BadgeSize = 'sm' | 'md'

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'border-[rgba(6,195,132,0.3)] bg-[rgba(6,195,132,0.12)] text-[#42e09e]',
  accent: 'border-[rgba(66,224,158,0.35)] bg-[rgba(66,224,158,0.12)] text-[#42e09e]',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  danger: 'border-red-400/30 bg-red-400/10 text-red-300',
  muted: 'border-white/10 bg-white/5 rogym-text-dim',
  primary: 'border-[var(--rogym-green)]/30 bg-[var(--rogym-green)]/15 text-[var(--rogym-teal)]',
  outline: 'border-white/20 bg-transparent text-white',
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  badgeSize?: BadgeSize
  children: ReactNode
}

export function Badge({
  tone = 'muted',
  badgeSize = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold select-none',
        TONE_CLASSES[tone],
        SIZE_CLASSES[badgeSize],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
