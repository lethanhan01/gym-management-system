import { cn } from '@/lib/utils'
import type { CheckboxSize } from './Checkbox'

export function getCheckboxClasses({ checked, disabled, hasError, checkboxSize = 'md' }: { checked?: boolean; disabled?: boolean; hasError?: boolean; checkboxSize?: CheckboxSize }) {
  const sizeClasses = { sm: 'h-4 w-4 rounded', md: 'h-5 w-5 rounded-md', lg: 'h-6 w-6 rounded-md' }
  return cn('flex items-center justify-center border bg-white/5 transition-all duration-200 shrink-0 touch-manipulation', sizeClasses[checkboxSize], checked ? 'border-[var(--rogym-teal)] bg-[var(--rogym-green-dark)] text-[var(--rogym-teal)] shadow-[0_0_8px_rgba(6,195,132,0.25)]' : 'border-white/20 hover:border-white/40', hasError && 'border-red-500/80 ring-1 ring-red-500/30', disabled && 'cursor-not-allowed opacity-50', !disabled && 'active:scale-95')
}
