import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  animated?: boolean
  style?: CSSProperties
}

const ROUNDED_CLASSES = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      width,
      height,
      rounded = 'xl',
      animated = true,
      style,
      ...props
    },
    ref
  ) => {
    const inlineStyle: CSSProperties = {
      ...style,
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }

    return (
      <div
        ref={ref}
        aria-hidden="true"
        style={inlineStyle}
        className={cn(
          'bg-white/[0.07] border border-white/5',
          ROUNDED_CLASSES[rounded],
          animated && 'animate-pulse',
          className
        )}
        {...props}
      />
    )
  }
)
Skeleton.displayName = 'Skeleton'

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number
  gap?: 1 | 2 | 3 | 4 | 6
  lastLineWidth?: string
  className?: string
  lineHeight?: number | string
}

const GAP_CLASSES: Record<number, string> = {
  1: 'space-y-1',
  2: 'space-y-2',
  3: 'space-y-3',
  4: 'space-y-4',
  6: 'space-y-6',
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      lines = 3,
      gap = 2,
      lastLineWidth = '65%',
      className,
      lineHeight = 14,
      ...props
    },
    ref
  ) => {
    const lineArray = Array.from({ length: lines })
    const gapClass = GAP_CLASSES[gap] ?? 'space-y-2'

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn('flex flex-col w-full', gapClass, className)}
        {...props}
      >
        {lineArray.map((_, index) => {
          const isLast = index === lines - 1
          return (
            <Skeleton
              key={index}
              height={lineHeight}
              width={isLast && lines > 1 ? lastLineWidth : '100%'}
              rounded="md"
            />
          )
        })}
      </div>
    )
  }
)
SkeletonText.displayName = 'SkeletonText'

export interface SkeletonCircleProps extends Omit<SkeletonProps, 'rounded'> {
  size?: number | string
}

export const SkeletonCircle = forwardRef<HTMLDivElement, SkeletonCircleProps>(
  ({ size = 40, className, ...props }, ref) => {
    return (
      <Skeleton
        ref={ref}
        width={size}
        height={size}
        rounded="full"
        className={cn('shrink-0', className)}
        {...props}
      />
    )
  }
)
SkeletonCircle.displayName = 'SkeletonCircle'

