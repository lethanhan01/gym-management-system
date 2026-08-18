import { cn } from '@/lib/utils'

export function getTextareaClasses({ hasError, fullWidth, mobileFull, disabled, className }: { hasError?: boolean; fullWidth?: boolean; mobileFull?: boolean; disabled?: boolean; className?: string }) {
  return cn('rogym-input block font-body transition-colors duration-200 resize-y min-h-[96px] py-2.5 px-3.5 text-sm leading-relaxed touch-manipulation', fullWidth && 'w-full', mobileFull && 'w-full sm:w-auto', !fullWidth && !mobileFull && 'w-full', hasError && 'border-red-500/80 focus:border-red-400 focus:ring-1 focus:ring-red-400/30', disabled && 'cursor-not-allowed opacity-50', className)
}
