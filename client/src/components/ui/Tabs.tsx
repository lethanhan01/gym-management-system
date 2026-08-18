import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

export type TabsVariant = 'pills' | 'segmented' | 'underline'
export type TabsSize = 'sm' | 'md' | 'lg'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
  variant: TabsVariant
  size: TabsSize
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error('Tabs compound components must be used within a <Tabs> provider')
  }
  return ctx
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  variant?: TabsVariant
  size?: TabsSize
  className?: string
  children?: ReactNode
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: controlledValue,
      defaultValue = '',
      onValueChange,
      variant = 'pills',
      size = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
    const baseId = useId()
    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : uncontrolledValue

    const handleValueChange = (val: string) => {
      if (!isControlled) {
        setUncontrolledValue(val)
      }
      onValueChange?.(val)
    }

    return (
      <TabsContext.Provider
        value={{
          value: currentValue,
          onValueChange: handleValueChange,
          variant,
          size,
          baseId,
        }}
      >
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = 'Tabs'

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: ReactNode
  'aria-label'?: string
}

const LIST_VARIANT_CLASSES: Record<TabsVariant, string> = {
  pills: 'flex items-center gap-1.5 p-1 bg-black/20 border border-white/5 rounded-2xl overflow-x-auto no-scrollbar',
  segmented: 'inline-flex items-center p-1 bg-[var(--rogym-bg-card-darker)] border border-[var(--rogym-border-teal-dim)] rounded-xl overflow-x-auto no-scrollbar',
  underline: 'flex items-center gap-6 border-b border-white/10 overflow-x-auto no-scrollbar',
}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, 'aria-label': ariaLabel, ...props }, ref) => {
    const { variant } = useTabsContext()

    return (
      <div
        ref={ref}
        role="tablist"
        aria-label={ariaLabel}
        className={cn(LIST_VARIANT_CLASSES[variant], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsList.displayName = 'TabsList'

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  disabled?: boolean
  leftIcon?: ReactNode
  badge?: ReactNode
  className?: string
  children?: ReactNode
}

const SIZE_CLASSES: Record<TabsSize, Record<TabsVariant, string>> = {
  sm: {
    pills: 'px-3 py-1.5 text-xs font-semibold rounded-xl min-h-[32px]',
    segmented: 'px-2.5 py-1 text-xs font-semibold rounded-lg min-h-[30px]',
    underline: 'pb-2.5 text-xs font-semibold min-h-[32px]',
  },
  md: {
    pills: 'px-4 py-2 text-sm font-semibold rounded-xl min-h-[40px]',
    segmented: 'px-3.5 py-1.5 text-sm font-semibold rounded-lg min-h-[36px]',
    underline: 'pb-3 text-sm font-semibold min-h-[38px]',
  },
  lg: {
    pills: 'px-5 py-2.5 text-base font-semibold rounded-xl min-h-[46px]',
    segmented: 'px-4.5 py-2 text-base font-semibold rounded-xl min-h-[42px]',
    underline: 'pb-3.5 text-base font-semibold min-h-[44px]',
  },
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  (
    {
      value,
      disabled = false,
      leftIcon,
      badge,
      className,
      children,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const { value: activeValue, onValueChange, variant, size, baseId } = useTabsContext()
    const isActive = activeValue === value
    const tabId = `${baseId}-tab-${value}`
    const panelId = `${baseId}-panel-${value}`

    const sizeClass = SIZE_CLASSES[size][variant]

    let variantStyle = ''
    if (variant === 'pills') {
      variantStyle = isActive
        ? 'bg-[var(--rogym-tone,var(--rogym-green))] text-black shadow-[var(--rogym-shadow-tone-md)] font-bold'
        : 'text-[var(--rogym-text-secondary)] hover:text-white hover:bg-white/5'
    } else if (variant === 'segmented') {
      variantStyle = isActive
        ? 'bg-[var(--rogym-tone,var(--rogym-green))]/15 text-[var(--rogym-tone,var(--rogym-green))] border border-[var(--rogym-tone,var(--rogym-green))]/30 font-bold shadow-sm'
        : 'text-[var(--rogym-text-dim)] hover:text-white hover:bg-white/5'
    } else if (variant === 'underline') {
      variantStyle = isActive
        ? 'text-[var(--rogym-tone,var(--rogym-green))] border-b-2 border-[var(--rogym-tone,var(--rogym-green))] font-bold'
        : 'text-[var(--rogym-text-dim)] hover:text-white border-b-2 border-transparent'
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented || disabled) return

      const currentTrigger = e.currentTarget
      const tablist = currentTrigger.closest('[role="tablist"]')
      const tabs = tablist ? Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')) : []
      const currentIndex = tabs.indexOf(currentTrigger)

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onValueChange(value)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextTab = tabs[(currentIndex + 1) % tabs.length]
        nextTab?.focus()
        nextTab?.click()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
        prevTab?.focus()
        prevTab?.click()
      } else if (e.key === 'Home') {
        e.preventDefault()
        tabs[0]?.focus()
        tabs[0]?.click()
      } else if (e.key === 'End') {
        e.preventDefault()
        tabs[tabs.length - 1]?.focus()
        tabs[tabs.length - 1]?.click()
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={tabId}
        aria-selected={isActive}
        aria-controls={panelId}
        tabIndex={isActive ? 0 : -1}
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e)
          if (!e.defaultPrevented) {
            onValueChange(value)
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rogym-tone,var(--rogym-green))] disabled:pointer-events-none disabled:opacity-40 select-none',
          sizeClass,
          variantStyle,
          className
        )}
        {...props}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {badge !== undefined && (
          <span
            className={cn(
              'inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full transition-colors',
              isActive
                ? 'bg-black/25 text-inherit'
                : 'bg-white/10 text-[var(--rogym-text-secondary)]'
            )}
          >
            {badge}
          </span>
        )}
      </button>
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  className?: string
  children?: ReactNode
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const { value: activeValue, baseId } = useTabsContext()
    const isActive = activeValue === value
    const tabId = `${baseId}-tab-${value}`
    const panelId = `${baseId}-panel-${value}`

    if (!isActive) return null

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId}
        tabIndex={0}
        className={cn('focus-visible:outline-none animate-in fade-in duration-200', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = 'TabsContent'

// ── Data-driven helper: TabsBar ──
export interface TabItem {
  value: string
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

export interface TabsBarProps extends Omit<TabsProps, 'children' | 'onChange'> {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  listClassName?: string
  'aria-label'?: string
}

export const TabsBar = forwardRef<HTMLDivElement, TabsBarProps>(
  (
    {
      items,
      value,
      onChange,
      variant = 'pills',
      size = 'md',
      className,
      listClassName,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <Tabs
        ref={ref}
        value={value}
        onValueChange={onChange}
        variant={variant}
        size={size}
        className={className}
        {...props}
      >
        <TabsList className={listClassName} aria-label={ariaLabel}>
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              leftIcon={item.icon}
              badge={item.badge}
              disabled={item.disabled}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    )
  }
)
TabsBar.displayName = 'TabsBar'

