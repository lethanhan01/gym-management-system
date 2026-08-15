import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label?: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string | null
  id?: string
  htmlFor?: string
  className?: string
  children: ReactNode
}

export function FormField({
  label,
  required,
  hint,
  error,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/80"
        >
          <span>{label}</span>
          {required && <span className="text-red-400">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs rogym-text-dim">{hint}</p>
      ) : null}
    </div>
  )
}
