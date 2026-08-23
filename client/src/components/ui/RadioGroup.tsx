import * as React from 'react'
import { RadioGroup as RadixRadioGroup } from 'radix-ui'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Root>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Root> & {
    orientation?: 'horizontal' | 'vertical'
  }
>(({ className, orientation = 'vertical', ...props }, ref) => {
  return (
    <RadixRadioGroup.Root
      className={cn(
        'grid gap-2.5',
        orientation === 'horizontal' && 'grid-flow-col auto-cols-max gap-4',
        className
      )}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadixRadioGroup.Root.displayName

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadixRadioGroup.Item
      ref={ref}
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-white/30 text-[var(--rogym-teal)] ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rogym-teal)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:border-[var(--rogym-teal)] data-[state=checked]:bg-[var(--rogym-teal)]/20 transition-all flex items-center justify-center',
        className
      )}
      {...props}
    >
      <RadixRadioGroup.Indicator className="flex items-center justify-center">
        <Circle className="h-2 w-2 fill-[var(--rogym-teal)] text-[var(--rogym-teal)]" />
      </RadixRadioGroup.Indicator>
    </RadixRadioGroup.Item>
  )
})
RadioGroupItem.displayName = RadixRadioGroup.Item.displayName

export interface RadioCardProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  badge?: React.ReactNode
  icon?: React.ReactNode
}

/**
 * RadioCard component for choosing packages, plans, payment methods, or options.
 */
export const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  RadioCardProps
>(({ className, title, description, badge, icon, value, id, ...props }, ref) => {
  const generatedId = React.useId()
  const effectiveId = id ?? generatedId

  return (
    <RadixRadioGroup.Item
      ref={ref}
      id={effectiveId}
      value={value}
      className={cn(
        'group relative flex w-full items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-150',
        'hover:border-white/25 hover:bg-white/[0.05]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rogym-teal)] focus-visible:ring-offset-1',
        'data-[state=checked]:border-[var(--rogym-teal)] data-[state=checked]:bg-[var(--rogym-teal)]/[0.07] data-[state=checked]:shadow-[0_0_15px_rgba(6,195,132,0.15)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    >
      <div className="mt-0.5 shrink-0">
        <div className="flex h-4 w-4 items-center justify-center rounded-full border border-white/30 group-data-[state=checked]:border-[var(--rogym-teal)] group-data-[state=checked]:bg-[var(--rogym-teal)]/20 transition-colors">
          <RadixRadioGroup.Indicator className="flex items-center justify-center">
            <Circle className="h-2 w-2 fill-[var(--rogym-teal)] text-[var(--rogym-teal)]" />
          </RadixRadioGroup.Indicator>
        </div>
      </div>

      {icon && (
        <div className="mt-0.5 text-white/70 group-data-[state=checked]:text-[var(--rogym-teal)] shrink-0 transition-colors">
          {icon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white group-data-[state=checked]:text-white truncate">
            {title}
          </span>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {description && (
          <p className="mt-0.5 text-xs rogym-text-secondary line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </RadixRadioGroup.Item>
  )
})
RadioCard.displayName = 'RadioCard'
