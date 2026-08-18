import { cn } from '@/lib/utils'
import type { SwitchSize } from './Switch'

export function getSwitchClasses({ checked, disabled, switchSize = 'md' }: { checked?: boolean; disabled?: boolean; switchSize?: SwitchSize }) {
  const trackSizes = { sm: 'h-5 w-9', md: 'h-6 w-11', lg: 'h-7 w-13' }
  return cn('rounded-full border border-white/20 bg-white/10 transition-all duration-200 shrink-0 touch-manipulation', trackSizes[switchSize], checked && 'border-[var(--rogym-teal)] bg-[var(--rogym-green)] shadow-[0_0_8px_rgba(6,195,132,0.25)]', disabled && 'cursor-not-allowed opacity-50', !disabled && 'active:scale-95')
}
