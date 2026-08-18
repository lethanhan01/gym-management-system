import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { getBadgeClasses } from './badge-utils'

export type BadgeTone =
  | 'success'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'primary'
  | 'outline'
  | 'info'
  | 'purple'

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg'

export interface BaseBadgeProps {
  tone?: BadgeTone
  size?: BadgeSize
  badgeSize?: BadgeSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  truncate?: boolean
  interactive?: boolean
  children?: ReactNode
}

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    BaseBadgeProps {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      tone = 'muted',
      size = 'md',
      badgeSize,
      leftIcon,
      rightIcon,
      truncate,
      interactive,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={getBadgeClasses({
          tone,
          size,
          badgeSize,
          truncate,
          interactive,
          className,
        })}
        {...props}
      >
        {leftIcon && (
          <span className="inline-flex shrink-0 items-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children && (
          <span className={cn(truncate && 'truncate')}>{children}</span>
        )}
        {rightIcon && (
          <span className="inline-flex shrink-0 items-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </span>
    )
  }
)
Badge.displayName = 'Badge'
