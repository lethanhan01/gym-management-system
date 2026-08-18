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
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AccordionType = 'single' | 'multiple'
export type AccordionVariant = 'card' | 'separated' | 'flush'

interface AccordionContextValue {
  type: AccordionType
  variant: AccordionVariant
  isExpanded: (value: string) => boolean
  toggleItem: (value: string) => void
  baseId: string
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordionContext() {
  const ctx = useContext(AccordionContext)
  if (!ctx) {
    throw new Error('Accordion compound components must be used within an <Accordion> provider')
  }
  return ctx
}

interface AccordionItemContextValue {
  value: string
  disabled?: boolean
  isOpen: boolean
  itemId: string
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null)

function useAccordionItemContext() {
  const ctx = useContext(AccordionItemContext)
  if (!ctx) {
    throw new Error('AccordionTrigger and AccordionContent must be used within an <AccordionItem>')
  }
  return ctx
}

export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  type?: AccordionType
  variant?: AccordionVariant
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
  className?: string
  children?: ReactNode
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = 'single',
      variant = 'card',
      value: controlledValue,
      defaultValue,
      onValueChange,
      collapsible = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseId = useId()
    const [uncontrolledValue, setUncontrolledValue] = useState<string | string[]>(() => {
      if (defaultValue !== undefined) return defaultValue
      return type === 'multiple' ? [] : ''
    })

    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : uncontrolledValue

    const isExpanded = (itemValue: string): boolean => {
      if (type === 'multiple') {
        return Array.isArray(currentValue) && currentValue.includes(itemValue)
      }
      return currentValue === itemValue
    }

    const toggleItem = (itemValue: string) => {
      if (type === 'multiple') {
        const arr = Array.isArray(currentValue) ? [...currentValue] : []
        const index = arr.indexOf(itemValue)
        let nextArr: string[]
        if (index > -1) {
          nextArr = arr.filter((v) => v !== itemValue)
        } else {
          nextArr = [...arr, itemValue]
        }
        if (!isControlled) setUncontrolledValue(nextArr)
        onValueChange?.(nextArr)
      } else {
        let nextVal = itemValue
        if (currentValue === itemValue) {
          if (collapsible) nextVal = ''
          else return
        }
        if (!isControlled) setUncontrolledValue(nextVal)
        onValueChange?.(nextVal)
      }
    }

    return (
      <AccordionContext.Provider
        value={{
          type,
          variant,
          isExpanded,
          toggleItem,
          baseId,
        }}
      >
        <div ref={ref} className={cn('w-full space-y-2.5', className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = 'Accordion'

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
  className?: string
  children?: ReactNode
}

const ITEM_VARIANT_CLASSES: Record<AccordionVariant, string> = {
  card: 'rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] overflow-hidden transition-all duration-200 shadow-sm',
  separated: 'rounded-xl border border-white/10 bg-black/20 overflow-hidden transition-all duration-200',
  flush: 'border-b border-white/10 transition-all duration-200 first:border-t',
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, disabled = false, className, children, ...props }, ref) => {
    const { isExpanded, variant, baseId } = useAccordionContext()
    const isOpen = isExpanded(value)
    const itemId = `${baseId}-item-${value}`

    return (
      <AccordionItemContext.Provider value={{ value, disabled, isOpen, itemId }}>
        <div
          ref={ref}
          className={cn(
            ITEM_VARIANT_CLASSES[variant],
            disabled && 'opacity-50 pointer-events-none',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)
AccordionItem.displayName = 'AccordionItem'

export interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  leftIcon?: ReactNode
  badge?: ReactNode
  hideChevron?: boolean
  children?: ReactNode
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  (
    {
      className,
      leftIcon,
      badge,
      hideChevron = false,
      children,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const { toggleItem } = useAccordionContext()
    const { value, disabled, isOpen, itemId } = useAccordionItemContext()

    const headerId = `${itemId}-header`
    const panelId = `${itemId}-panel`

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return

      const currentTrigger = e.currentTarget
      const container = currentTrigger.closest('[data-accordion-root]') || currentTrigger.parentElement?.parentElement?.parentElement
      const triggers = container ? Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')) : []
      const currentIndex = triggers.indexOf(currentTrigger)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextTrigger = triggers[(currentIndex + 1) % triggers.length]
        nextTrigger?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevTrigger = triggers[(currentIndex - 1 + triggers.length) % triggers.length]
        prevTrigger?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        triggers[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        triggers[triggers.length - 1]?.focus()
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e)
          if (!e.defaultPrevented) {
            toggleItem(value)
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 text-left font-semibold text-white transition-all hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rogym-tone,var(--rogym-green))] select-none',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 min-w-0">
          {leftIcon && <span className="shrink-0 text-[var(--rogym-tone,var(--rogym-green))]">{leftIcon}</span>}
          <span className="truncate">{children}</span>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>

        {!hideChevron && (
          <ChevronDown
            size={18}
            className={cn(
              'shrink-0 text-[var(--rogym-text-dim)] transition-transform duration-200',
              isOpen && 'rotate-180 text-[var(--rogym-tone,var(--rogym-green))]'
            )}
          />
        )}
      </button>
    )
  }
)
AccordionTrigger.displayName = 'AccordionTrigger'

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: ReactNode
}

export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, itemId } = useAccordionItemContext()
    const headerId = `${itemId}-header`
    const panelId = `${itemId}-panel`

    if (!isOpen) return null

    return (
      <div
        ref={ref}
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          'px-4 sm:px-5 pb-4 pt-1 text-sm text-[var(--rogym-text-secondary)] border-t border-white/5 animate-in fade-in-50 duration-200 leading-relaxed',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AccordionContent.displayName = 'AccordionContent'

// ── Data-driven helper: AccordionGroup ──
export interface AccordionGroupItem {
  value: string
  title: ReactNode
  content: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

export interface AccordionGroupProps extends Omit<AccordionProps, 'children'> {
  items: AccordionGroupItem[]
}

export const AccordionGroup = forwardRef<HTMLDivElement, AccordionGroupProps>(
  (
    {
      items,
      type = 'single',
      variant = 'card',
      value,
      defaultValue,
      onValueChange,
      collapsible = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Accordion
        ref={ref}
        type={type}
        variant={variant}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        collapsible={collapsible}
        className={className}
        {...props}
      >
        {items.map((item) => (
          <AccordionItem key={item.value} value={item.value} disabled={item.disabled}>
            <AccordionTrigger leftIcon={item.icon} badge={item.badge}>
              {item.title}
            </AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  }
)
AccordionGroup.displayName = 'AccordionGroup'
