import { forwardRef, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { type InputSize, normalizeInputSize } from './Input'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  debounceMs?: number
  loading?: boolean
  inputSize?: InputSize
  size?: InputSize
  fullWidth?: boolean
  mobileFull?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  'aria-label'?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onSearch,
      placeholder,
      debounceMs = 300,
      loading = false,
      inputSize = 'md',
      size,
      fullWidth = true,
      mobileFull,
      disabled,
      autoFocus,
      className,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const { t } = useTranslation('common')
    const effectivePlaceholder = placeholder ?? t('search.placeholder')
    const effectiveAriaLabel = ariaLabel ?? t('button.search')
    const [localValue, setLocalValue] = useState(value)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const effectiveSize = normalizeInputSize(size ?? inputSize)

    useEffect(() => {
      setLocalValue(value)
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      setLocalValue(next)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(next)
        onSearch?.(next)
      }, debounceMs)
    }

    const handleClear = () => {
      setLocalValue('')
      onChange('')
      onSearch?.('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (timerRef.current) clearTimeout(timerRef.current)
        onChange(localValue)
        onSearch?.(localValue)
      } else if (e.key === 'Escape' && localValue) {
        handleClear()
      }
    }

    const sizeClasses = {
      sm: 'min-h-[38px] py-1.5 pl-8.5 pr-8 text-xs',
      md: 'min-h-[44px] py-2.5 pl-10 pr-9 text-sm',
      lg: 'min-h-[50px] py-3.5 pl-11 pr-10 text-base',
    }

    return (
      <div
        className={cn(
          'relative flex items-center',
          fullWidth && 'w-full',
          mobileFull && 'w-full sm:w-auto',
          !fullWidth && !mobileFull && 'w-full',
          className
        )}
      >
        <Search
          size={effectiveSize === 'sm' ? 14 : effectiveSize === 'lg' ? 18 : 16}
          className="pointer-events-none absolute left-3.5 rogym-text-dim shrink-0"
          aria-hidden="true"
        />

        <input
          ref={ref}
          type="search"
          autoFocus={autoFocus}
          disabled={disabled}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label={effectiveAriaLabel}
          placeholder={effectivePlaceholder}
          className={cn(
            'rogym-input block font-body transition-colors duration-200',
            fullWidth && 'w-full',
            mobileFull && 'w-full sm:w-auto',
            !fullWidth && !mobileFull && 'w-full',
            sizeClasses[effectiveSize],
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />

        {loading ? (
          <div
            className="pointer-events-none absolute right-3.5 flex items-center justify-center rogym-text-dim shrink-0"
            aria-hidden="true"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        ) : localValue ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-lg rogym-text-dim transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--rogym-teal)]/50 touch-manipulation active:scale-95"
            aria-label={t('search.clear')}
          >
            <X size={effectiveSize === 'sm' ? 13 : 15} />
          </button>
        ) : null}
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'
