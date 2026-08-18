import { cn } from '@/lib/utils'
import type { BadgeSize, BaseBadgeProps } from './Badge'

export function normalizeBadgeSize(size: BadgeSize = 'md'): BadgeSize {
  return size
}

const TONE_CLASSES: Record<NonNullable<BaseBadgeProps['tone']>, string> = {
  success: 'border-[var(--rogym-green)]/30 bg-[var(--rogym-green)]/15 text-[var(--rogym-teal)]',
  accent: 'border-[var(--rogym-teal)]/35 bg-[var(--rogym-teal)]/15 text-[var(--rogym-teal)]',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  danger: 'border-red-400/30 bg-red-400/10 text-red-300',
  muted: 'border-white/10 bg-white/5 rogym-text-dim',
  primary: 'border-[var(--rogym-green)]/40 bg-[var(--rogym-green)] text-[var(--rogym-green-dark)] font-bold',
  outline: 'border-white/20 bg-transparent text-white',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  purple: 'border-purple-400/30 bg-purple-400/10 text-purple-300',
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.25 text-[10px] gap-0.5',
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
}

export function getBadgeClasses({
  tone = 'muted',
  size = 'md',
  badgeSize,
  truncate,
  interactive,
  className,
}: BaseBadgeProps & { className?: string }) {
  const effectiveSize = normalizeBadgeSize(badgeSize ?? size)

  return cn(
    'inline-flex items-center justify-center rounded-full border font-semibold select-none shrink-0 transition-colors duration-150',
    TONE_CLASSES[tone],
    SIZE_CLASSES[effectiveSize],
    truncate && 'max-w-full',
    interactive && 'cursor-pointer hover:opacity-85 active:scale-95 touch-manipulation',
    className
  )
}
