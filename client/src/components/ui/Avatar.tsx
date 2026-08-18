import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero'
export type AvatarShape = 'circle' | 'rounded'
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away'
export type AvatarTone = 'auto' | 'emerald' | 'teal' | 'sky' | 'purple' | 'amber' | 'rose' | 'neutral'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  name?: string
  fallback?: ReactNode
  size?: AvatarSize
  shape?: AvatarShape
  status?: AvatarStatus
  tone?: AvatarTone
  border?: boolean
  className?: string
  imageClassName?: string
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string; iconSize: number; statusSize: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', iconSize: 12, statusSize: 'w-1.5 h-1.5 ring-1' },
  sm: { container: 'w-8 h-8', text: 'text-xs', iconSize: 15, statusSize: 'w-2 h-2 ring-1' },
  md: { container: 'w-10 h-10', text: 'text-sm font-semibold', iconSize: 18, statusSize: 'w-2.5 h-2.5 ring-2' },
  lg: { container: 'w-12 h-12', text: 'text-base font-semibold', iconSize: 22, statusSize: 'w-3 h-3 ring-2' },
  xl: { container: 'w-16 h-16', text: 'text-lg font-bold', iconSize: 28, statusSize: 'w-3.5 h-3.5 ring-2' },
  '2xl': { container: 'w-20 h-20', text: 'text-xl font-bold', iconSize: 36, statusSize: 'w-4 h-4 ring-2' },
  hero: { container: 'w-24 h-24', text: 'text-2xl font-black', iconSize: 44, statusSize: 'w-5 h-5 ring-2' },
}

const STATUS_COLORS: Record<AvatarStatus, string> = {
  online: 'bg-emerald-400',
  busy: 'bg-red-400',
  away: 'bg-amber-400',
  offline: 'bg-zinc-500',
}

const TONE_CLASSES: Record<Exclude<AvatarTone, 'auto'>, string> = {
  emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
  teal: 'bg-teal-950/80 text-[var(--rogym-tone,var(--rogym-green))] border-teal-500/30',
  sky: 'bg-sky-950/80 text-sky-300 border-sky-500/30',
  purple: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
  amber: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-950/80 text-rose-300 border-rose-500/30',
  neutral: 'bg-white/5 text-[var(--rogym-text-secondary)] border-white/10',
}

const AUTO_TONES: Exclude<AvatarTone, 'auto'>[] = ['teal', 'emerald', 'sky', 'purple', 'amber', 'rose']

function getInitials(name?: string): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function hashTone(name?: string): Exclude<AvatarTone, 'auto'> {
  if (!name) return 'teal'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AUTO_TONES.length
  return AUTO_TONES[index]
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      fallback,
      size = 'md',
      shape = 'circle',
      status,
      tone = 'auto',
      border = true,
      className,
      imageClassName,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false)
    const hasImage = Boolean(src && !imageError)

    const initials = useMemo(() => {
      if (fallback && typeof fallback === 'string') return fallback
      return getInitials(name)
    }, [fallback, name])

    const resolvedTone = useMemo(() => {
      if (tone !== 'auto') return tone
      return hashTone(name || alt)
    }, [tone, name, alt])

    const sizeCfg = SIZE_CLASSES[size]
    const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
    const toneClass = TONE_CLASSES[resolvedTone]
    const borderClass = border ? 'border shadow-sm' : ''

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
          sizeCfg.container,
          roundedClass,
          borderClass,
          toneClass,
          className
        )}
        {...props}
      >
        {hasImage ? (
          <img
            src={src!}
            alt={alt || name || 'Avatar'}
            onError={() => setImageError(true)}
            className={cn('h-full w-full object-cover', roundedClass, imageClassName)}
          />
        ) : fallback && typeof fallback !== 'string' ? (
          fallback
        ) : initials ? (
          <span className={cn('tracking-wider', sizeCfg.text)}>{initials}</span>
        ) : (
          <User size={sizeCfg.iconSize} className="opacity-70" />
        )}

        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-[var(--rogym-bg-base)]',
              sizeCfg.statusSize,
              STATUS_COLORS[status]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number
  size?: AvatarSize
  className?: string
  children?: ReactNode
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ max = 4, size = 'md', className, children, ...props }, ref) => {
    const validChildren = Children.toArray(children).filter(isValidElement)
    const visibleAvatars = validChildren.slice(0, max)
    const remainingCount = validChildren.length - max

    const sizeCfg = SIZE_CLASSES[size]

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center -space-x-2.5', className)}
        {...props}
      >
        {visibleAvatars.map((child, index) =>
          cloneElement(child as React.ReactElement<AvatarProps>, {
            key: index,
            size,
            className: cn('ring-2 ring-[var(--rogym-bg-base)]', (child.props as AvatarProps).className),
          })
        )}

        {remainingCount > 0 && (
          <div
            className={cn(
              'relative inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--rogym-bg-elevated-green)] border border-white/10 text-white/90 font-bold ring-2 ring-[var(--rogym-bg-base)]',
              sizeCfg.container,
              sizeCfg.text
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = 'AvatarGroup'

