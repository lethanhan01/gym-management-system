import * as React from 'react'
import { ToggleGroup as RadixToggleGroup } from 'radix-ui'
import { cn } from '@/lib/utils'

export interface SegmentedControlOption {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  count?: number
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  className?: string
  itemClassName?: string
}

const sizeClasses = {
  sm: {
    container: 'p-0.5 rounded-lg text-xs',
    item: 'py-1 px-2.5 text-xs rounded-md gap-1.5',
  },
  md: {
    container: 'p-1 rounded-xl text-sm',
    item: 'py-1.5 px-3.5 text-sm rounded-lg gap-2',
  },
  lg: {
    container: 'p-1.5 rounded-xl text-base',
    item: 'py-2 px-4.5 text-base rounded-lg gap-2.5',
  },
}

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className,
  itemClassName,
}: SegmentedControlProps) {
  const styles = sizeClasses[size]
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState(
    defaultValue ?? options[0]?.value
  )
  const effectiveValue = isControlled ? value : internalValue

  return (
    <RadixToggleGroup.Root
      type="single"
      value={effectiveValue}
      onValueChange={(val) => {
        // Enforce that SegmentedControl cannot be deselected to empty
        if (val && val !== effectiveValue) {
          if (!isControlled) {
            setInternalValue(val)
          }
          onValueChange?.(val)
        }
      }}
      disabled={disabled}
      className={cn(
        'inline-flex items-center border border-white/10 bg-white/[0.03] backdrop-blur-md',
        styles.container,
        fullWidth && 'w-full flex',
        className
      )}
    >

      {options.map((option) => (
        <RadixToggleGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled || disabled}
          className={cn(
            'inline-flex items-center justify-center font-medium text-white/70 transition-all duration-150 select-none',
            'hover:text-white hover:bg-white/[0.05]',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--rogym-teal)]',
            'data-[state=on]:bg-[var(--rogym-teal)] data-[state=on]:text-[var(--rogym-green-dark)] data-[state=on]:font-semibold data-[state=on]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
            'disabled:pointer-events-none disabled:opacity-40',
            styles.item,
            fullWidth && 'flex-1',
            itemClassName
          )}
        >
          {option.icon && <span className="shrink-0">{option.icon}</span>}
          <span className="truncate">{option.label}</span>
          {option.count !== undefined && (
            <span className="ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold bg-white/20 data-[state=on]:bg-[var(--rogym-green-dark)]/20">
              {option.count}
            </span>
          )}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  )
}
