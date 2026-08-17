import { Fragment, forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepItem {
  id?: string | number
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  optional?: boolean
  disabled?: boolean
}

export type StepperOrientation = 'horizontal' | 'vertical'
export type StepperSize = 'sm' | 'md' | 'lg'

export interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  steps: StepItem[]
  activeStep: number
  orientation?: StepperOrientation
  size?: StepperSize
  clickable?: boolean
  onStepClick?: (stepIndex: number) => void
  className?: string
}

const SIZE_CONFIG: Record<
  StepperSize,
  { nodeSize: string; iconSize: number; textTitle: string; textDesc: string }
> = {
  sm: { nodeSize: 'w-7 h-7 text-xs', iconSize: 14, textTitle: 'text-xs', textDesc: 'text-[11px]' },
  md: { nodeSize: 'w-9 h-9 text-sm', iconSize: 16, textTitle: 'text-sm', textDesc: 'text-xs' },
  lg: { nodeSize: 'w-11 h-11 text-base font-bold', iconSize: 20, textTitle: 'text-base', textDesc: 'text-sm' },
}

export const Stepper = forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      steps,
      activeStep,
      orientation = 'horizontal',
      size = 'md',
      clickable = false,
      onStepClick,
      className,
      ...props
    },
    ref
  ) => {
    const cfg = SIZE_CONFIG[size]

    if (orientation === 'vertical') {
      return (
        <div ref={ref} className={cn('space-y-6', className)} {...props}>
          {steps.map((step, idx) => {
            const isCompleted = idx < activeStep
            const isCurrent = idx === activeStep
            const isLast = idx === steps.length - 1
            const isClickable = clickable && !step.disabled && idx <= activeStep

            let nodeStyle = ''
            if (isCompleted) {
              nodeStyle =
                'bg-[var(--rogym-tone,#06c384)] text-black border-[var(--rogym-tone,#06c384)] shadow-[0_0_12px_rgba(6,195,132,0.35)]'
            } else if (isCurrent) {
              nodeStyle =
                'bg-black/60 border-2 border-[var(--rogym-tone,#06c384)] text-[var(--rogym-tone,#06c384)] shadow-[0_0_15px_rgba(6,195,132,0.4)]'
            } else {
              nodeStyle =
                'bg-[#0b1610] border border-white/15 text-[var(--rogym-text-dim,#718579)]'
            }

            return (
              <div key={step.id ?? idx} className="relative flex items-start gap-4 group">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[17px] sm:left-[21px] top-9 -bottom-6 w-0.5 transition-colors duration-300',
                      idx < activeStep ? 'bg-[var(--rogym-tone,#06c384)]' : 'bg-white/10'
                    )}
                  />
                )}

                {/* Node */}
                <button
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(idx)}
                  className={cn(
                    'relative z-10 shrink-0 inline-flex items-center justify-center rounded-full font-bold transition-all duration-200 select-none',
                    cfg.nodeSize,
                    nodeStyle,
                    isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                  )}
                >
                  {isCompleted ? (
                    <Check size={cfg.iconSize} strokeWidth={3} />
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    idx + 1
                  )}
                </button>

                {/* Text info */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-semibold transition-colors',
                        cfg.textTitle,
                        isCurrent
                          ? 'text-white'
                          : isCompleted
                          ? 'text-white/90'
                          : 'text-[var(--rogym-text-dim,#718579)]'
                      )}
                    >
                      {step.title}
                    </span>
                    {step.optional && (
                      <span className="text-[11px] text-[var(--rogym-text-dim,#718579)]">
                        (Tùy chọn)
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p
                      className={cn(
                        'mt-0.5 text-[var(--rogym-text-dim,#718579)] leading-relaxed',
                        cfg.textDesc
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // Horizontal Stepper
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeStep
            const isCurrent = idx === activeStep
            const isLast = idx === steps.length - 1
            const isClickable = clickable && !step.disabled && idx <= activeStep

            let nodeStyle = ''
            if (isCompleted) {
              nodeStyle =
                'bg-[var(--rogym-tone,#06c384)] text-black border-[var(--rogym-tone,#06c384)] shadow-[0_0_12px_rgba(6,195,132,0.35)]'
            } else if (isCurrent) {
              nodeStyle =
                'bg-black/60 border-2 border-[var(--rogym-tone,#06c384)] text-[var(--rogym-tone,#06c384)] shadow-[0_0_15px_rgba(6,195,132,0.4)]'
            } else {
              nodeStyle =
                'bg-[#0b1610] border border-white/15 text-[var(--rogym-text-dim,#718579)]'
            }

            return (
              <Fragment key={step.id ?? idx}>
                <div className="flex flex-col items-center text-center group min-w-0">
                  {/* Step node */}
                  <button
                    type="button"
                    aria-current={isCurrent ? 'step' : undefined}
                    disabled={!isClickable}
                    onClick={() => isClickable && onStepClick?.(idx)}
                    className={cn(
                      'relative z-10 shrink-0 inline-flex items-center justify-center rounded-full font-bold transition-all duration-200 select-none',
                      cfg.nodeSize,
                      nodeStyle,
                      isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                    )}
                  >
                    {isCompleted ? (
                      <Check size={cfg.iconSize} strokeWidth={3} />
                    ) : step.icon ? (
                      step.icon
                    ) : (
                      idx + 1
                    )}
                  </button>

                  {/* Step title */}
                  <span
                    className={cn(
                      'mt-2 font-semibold transition-colors truncate max-w-[120px] sm:max-w-[160px]',
                      cfg.textTitle,
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                        ? 'text-white/90'
                        : 'text-[var(--rogym-text-dim,#718579)]'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span
                      className={cn(
                        'hidden sm:block mt-0.5 text-[var(--rogym-text-dim,#718579)] truncate max-w-[140px]',
                        cfg.textDesc
                      )}
                    >
                      {step.description}
                    </span>
                  )}
                </div>

                {/* Connecting line between steps */}
                {!isLast && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2 sm:mx-4 -mt-6 sm:-mt-8 transition-colors duration-300',
                      idx < activeStep ? 'bg-[var(--rogym-tone,#06c384)]' : 'bg-white/10'
                    )}
                  />
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    )
  }
)
Stepper.displayName = 'Stepper'

