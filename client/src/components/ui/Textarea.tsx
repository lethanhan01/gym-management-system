import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { getTextareaClasses } from './textarea-utils'

export interface BaseTextareaProps {
  error?: boolean | string
  fullWidth?: boolean
  mobileFull?: boolean
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseTextareaProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, fullWidth, mobileFull, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        aria-invalid={!!error}
        className={getTextareaClasses({
          hasError: !!error,
          fullWidth,
          mobileFull,
          disabled,
          className,
        })}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
