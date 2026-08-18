import { cn } from '@/lib/utils'
import type { InputSize } from './Input'

export function normalizeInputSize(size: InputSize = 'md'): 'sm' | 'md' | 'lg' {
  return size === 'sm' || size === 'lg' ? size : 'md'
}

export function getInputClasses({ inputSize = 'md', size, hasLeftIcon, hasRightIcon, hasError, fullWidth, mobileFull, disabled, className }: { inputSize?: InputSize; size?: InputSize; hasLeftIcon?: boolean; hasRightIcon?: boolean; hasError?: boolean; fullWidth?: boolean; mobileFull?: boolean; disabled?: boolean; className?: string }) {
  const effectiveSize = normalizeInputSize(size ?? inputSize)
  const sizeClasses = { sm: 'min-h-[38px] py-1.5 text-xs', md: 'min-h-[44px] py-2.5 text-sm', lg: 'min-h-[50px] py-3.5 text-base' }
  return cn('rogym-input block font-body transition-colors duration-200', fullWidth && 'w-full', mobileFull && 'w-full sm:w-auto', !fullWidth && !mobileFull && 'w-full', sizeClasses[effectiveSize], hasLeftIcon && 'pl-10', hasRightIcon && 'pr-10', hasError && 'border-red-500/80 focus:border-red-400 focus:ring-1 focus:ring-red-400/30', disabled && 'cursor-not-allowed opacity-50', className)
}
