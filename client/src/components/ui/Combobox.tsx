import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  useMemo,
} from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Popover as RadixPopover } from 'radix-ui'
import { cn } from '@/lib/utils'
import { useFormField } from './form-field-context'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
  icon?: ReactNode
  badge?: ReactNode
  searchTerms?: string[]
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  clearable?: boolean
  error?: boolean | string
  className?: string
  triggerClassName?: string
  name?: string
  ariaLabel?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'min-h-[38px] h-[38px] text-xs px-3',
  md: 'min-h-[44px] h-11 text-sm px-3.5',
  lg: 'min-h-[50px] h-[50px] text-base px-4',
}

export function Combobox({
  options,
  value,
  defaultValue = '',
  onValueChange,
  onChange,
  placeholder = 'Chọn một tùy chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  emptyText = 'Không tìm thấy kết quả phù hợp.',
  disabled = false,
  clearable = true,
  error,
  className,
  triggerClassName,
  name,
  ariaLabel,
  required,
  size = 'md',
}: ComboboxProps) {
  const formField = useFormField()
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const effectiveValue = isControlled ? value : internalValue
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const effectiveDisabled = disabled || formField?.disabled
  const hasError = !!error || formField?.hasError

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === effectiveValue),
    [options, effectiveValue]
  )

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const query = search.toLowerCase().trim()
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query)
      const matchDesc = opt.description?.toLowerCase().includes(query)
      const matchTerms = opt.searchTerms?.some((term) =>
        term.toLowerCase().includes(query)
      )
      return matchLabel || matchDesc || matchTerms
    })
  }, [options, search])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearch('')
    }
  }, [open])

  function handleSelect(val: string) {
    if (!isControlled) {
      setInternalValue(val)
    }
    onValueChange?.(val)
    onChange?.(val)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    handleSelect('')
  }

  return (
    <RadixPopover.Root open={open} onOpenChange={effectiveDisabled ? undefined : setOpen}>
      <div className={cn('relative w-full', className)}>
        {name && <input type="hidden" name={name} value={effectiveValue} required={required} />}
        <RadixPopover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            aria-invalid={hasError}
            id={formField?.id}
            disabled={effectiveDisabled}
            className={cn(
              'group flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] font-normal text-white transition-colors duration-150',
              'hover:border-[var(--rogym-teal)]/50 hover:bg-white/[0.06]',
              'focus:border-[var(--rogym-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--rogym-teal)]/30',
              'disabled:pointer-events-none disabled:opacity-40 disabled:bg-white/[0.02]',
              hasError &&
                'border-red-500/80 focus:border-red-400 focus:ring-1 focus:ring-red-400/30',
              sizeClasses[size],
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
              {selectedOption?.icon && (
                <span className="shrink-0 rogym-text-dim">{selectedOption.icon}</span>
              )}
              {selectedOption ? (
                <span className="truncate text-white font-medium">
                  {selectedOption.label}
                </span>
              ) : (
                <span className="truncate rogym-text-dim">{placeholder}</span>
              )}
              {selectedOption?.badge && (
                <span className="shrink-0">{selectedOption.badge}</span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 rogym-text-dim">
              {clearable && selectedOption && !effectiveDisabled && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={handleClear}
                  className="p-0.5 rounded-md hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Xóa lựa chọn"
                >
                  <X size={14} />
                </span>
              )}
              <ChevronsUpDown size={15} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        </RadixPopover.Trigger>

        <RadixPopover.Portal>
          <RadixPopover.Content
            sideOffset={6}
            align="start"
            className="z-[95] w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[95vw] overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] p-2 text-white shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl duration-150 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            <div className="relative mb-2 flex items-center border-b border-white/10 pb-2 px-1">
              <Search size={15} className="absolute left-2.5 rogym-text-dim" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg bg-white/[0.05] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--rogym-teal)]/50"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {filteredOptions.length === 0 ? (
                <p className="py-6 text-center text-xs rogym-text-dim">{emptyText}</p>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === effectiveValue
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-[var(--rogym-teal)]/15 text-[var(--rogym-teal)] font-semibold'
                          : 'text-white/90 hover:bg-white/[0.06]',
                        option.disabled &&
                          'pointer-events-none opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{option.label}</p>
                          {option.description && (
                            <p className="text-[10px] rogym-text-dim truncate">
                              {option.description}
                            </p>
                          )}
                        </div>
                        {option.badge && <span className="shrink-0">{option.badge}</span>}
                      </div>

                      {isSelected && (
                        <Check size={14} className="text-[var(--rogym-teal)] shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </div>
    </RadixPopover.Root>
  )
}
