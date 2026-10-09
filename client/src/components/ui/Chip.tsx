import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ChipTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
export type ChipSize = 'sm' | 'md' | 'lg'

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  tone?: ChipTone
  size?: ChipSize
  selected?: boolean
  removable?: boolean
  onRemove?: () => void
  disabled?: boolean
  icon?: React.ReactNode
  asButton?: boolean
}

const toneClasses: Record<ChipTone, { default: string; selected: string }> = {
  default: {
    default: 'bg-white/[0.06] text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20',
    selected: 'bg-white/20 text-white border-white/40 ring-1 ring-white/30',
  },
  accent: {
    default: 'bg-[var(--rogym-teal)]/10 text-[var(--rogym-teal)] border-[var(--rogym-teal)]/30 hover:bg-[var(--rogym-teal)]/20',
    selected: 'bg-[var(--rogym-teal)] text-[var(--rogym-green-dark)] border-[var(--rogym-teal)] font-semibold shadow-[0_0_12px_rgba(66,224,158,0.35)]',
  },
  success: {
    default: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20',
    selected: 'bg-emerald-500 text-emerald-950 border-emerald-500 font-semibold',
  },
  warning: {
    default: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20',
    selected: 'bg-amber-500 text-amber-950 border-amber-500 font-semibold',
  },
  danger: {
    default: 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20',
    selected: 'bg-red-500 text-white border-red-500 font-semibold',
  },
  info: {
    default: 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20',
    selected: 'bg-sky-500 text-sky-950 border-sky-500 font-semibold',
  },
}

const sizeClasses: Record<ChipSize, string> = {
  sm: 'text-[11px] h-6 px-2 gap-1 rounded-lg',
  md: 'text-xs h-7 px-2.5 gap-1.5 rounded-xl',
  lg: 'text-sm h-8 px-3.5 gap-2 rounded-xl',
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      className,
      label,
      tone = 'default',
      size = 'md',
      selected = false,
      removable = false,
      onRemove,
      disabled = false,
      icon,
      onClick,
      ...props
    },
    ref
  ) => {
    const isInteractive = !!onClick && !disabled
    const toneStyle = selected ? toneClasses[tone].selected : toneClasses[tone].default

    if (isInteractive && !removable) {
      return (
        <button
          ref={ref as unknown as React.Ref<HTMLButtonElement>}
          type="button"
          disabled={disabled}
          onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
          className={cn(
            'inline-flex items-center justify-center font-medium border transition-all select-none',
            toneStyle,
            sizeClasses[size],
            'cursor-pointer active:scale-95',
            className
          )}
          {...(props as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
        </button>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium border transition-all select-none',
          toneStyle,
          sizeClasses[size],
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
        {removable && onRemove && (
          <button
            type="button"
            tabIndex={0}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-white/20 transition-colors opacity-70 hover:opacity-100"
            aria-label="Xóa"
          >
            <X size={size === 'sm' ? 12 : 14} />
          </button>
        )}
      </div>
    )
  }
)
Chip.displayName = 'Chip'
