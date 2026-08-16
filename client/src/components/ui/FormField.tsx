import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string | null
  id?: string
  htmlFor?: string
  fullWidth?: boolean
  children: ReactNode
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      required,
      hint,
      error,
      htmlFor,
      fullWidth = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-1.5',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {label && (
          <label
            htmlFor={htmlFor}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/80 select-none"
          >
            <span>{label}</span>
            {required && (
              <span className="text-red-400 font-bold" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {children}

        {error ? (
          <p
            role="alert"
            className="text-xs text-red-400 font-medium animate-in fade-in duration-200"
          >
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs rogym-text-dim">{hint}</p>
        ) : null}
      </div>
    )
  }
)
FormField.displayName = 'FormField'
