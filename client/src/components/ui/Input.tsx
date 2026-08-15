import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useState,
} from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type InputSize = 'sm' | 'md' | 'lg' | 'default'

export interface BaseInputProps {
  leftIcon?: ReactNode
  leadingIcon?: ReactNode
  rightIcon?: ReactNode
  trailingIcon?: ReactNode
  error?: boolean | string
  inputSize?: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg'
  showPasswordToggle?: boolean
  clearable?: boolean
  onClear?: () => void
  loading?: boolean
  fullWidth?: boolean
  mobileFull?: boolean
}

export function normalizeInputSize(size: InputSize = 'md'): 'sm' | 'md' | 'lg' {
  switch (size) {
    case 'sm':
      return 'sm'
    case 'lg':
      return 'lg'
    case 'md':
    case 'default':
    default:
      return 'md'
  }
}

export function getInputClasses({
  inputSize = 'md',
  size,
  hasLeftIcon,
  hasRightIcon,
  hasError,
  fullWidth,
  mobileFull,
  disabled,
  className,
}: {
  inputSize?: InputSize
  size?: InputSize
  hasLeftIcon?: boolean
  hasRightIcon?: boolean
  hasError?: boolean
  fullWidth?: boolean
  mobileFull?: boolean
  disabled?: boolean
  className?: string
}) {
  const effectiveSize = normalizeInputSize(size ?? inputSize)

  const sizeClasses = {
    sm: 'min-h-[38px] py-1.5 text-xs',
    md: 'min-h-[44px] py-2.5 text-sm',
    lg: 'min-h-[50px] py-3.5 text-base',
  }

  return cn(
    'rogym-input block font-body transition-colors duration-200',
    fullWidth && 'w-full',
    mobileFull && 'w-full sm:w-auto',
    !fullWidth && !mobileFull && 'w-full',
    sizeClasses[effectiveSize],
    hasLeftIcon && 'pl-10',
    hasRightIcon && 'pr-10',
    hasError &&
      'border-red-500/80 focus:border-red-400 focus:ring-1 focus:ring-red-400/30',
    disabled && 'cursor-not-allowed opacity-50',
    className
  )
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseInputProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      leftIcon,
      leadingIcon,
      rightIcon,
      trailingIcon,
      error,
      inputSize = 'md',
      size,
      showPasswordToggle,
      clearable,
      onClear,
      loading,
      fullWidth,
      mobileFull,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const effectiveLeftIcon = leftIcon ?? leadingIcon
    const effectiveRightIcon = rightIcon ?? trailingIcon
    const isPasswordType = type === 'password' && showPasswordToggle
    const actualType = isPasswordType
      ? showPassword
        ? 'text'
        : 'password'
      : type
    const hasValue = value !== undefined && value !== ''
    const showClearButton = clearable && hasValue && !disabled && !loading
    const hasRightContent =
      effectiveRightIcon || isPasswordType || showClearButton || loading

    return (
      <div
        className={cn(
          'relative flex items-center',
          fullWidth && 'w-full',
          mobileFull && 'w-full sm:w-auto',
          !fullWidth && !mobileFull && 'w-full'
        )}
      >
        {effectiveLeftIcon && (
          <div
            className="pointer-events-none absolute left-3.5 flex items-center justify-center rogym-text-dim shrink-0"
            aria-hidden="true"
          >
            {effectiveLeftIcon}
          </div>
        )}

        <input
          ref={ref}
          type={actualType}
          disabled={disabled || loading}
          aria-invalid={!!error}
          aria-busy={loading ? 'true' : undefined}
          value={value}
          className={getInputClasses({
            inputSize,
            size,
            hasLeftIcon: !!effectiveLeftIcon,
            hasRightIcon: !!hasRightContent,
            hasError: !!error,
            fullWidth,
            mobileFull,
            disabled: disabled || loading,
            className,
          })}
          {...props}
        />

        {loading ? (
          <div
            className="pointer-events-none absolute right-3.5 flex items-center justify-center rogym-text-dim shrink-0"
            aria-hidden="true"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        ) : isPasswordType ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-lg rogym-text-dim transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--rogym-teal)]/50 touch-manipulation"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : showClearButton ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={onClear}
            className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-lg rogym-text-dim transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--rogym-teal)]/50 touch-manipulation"
            aria-label="Xóa nội dung"
          >
            <X size={15} />
          </button>
        ) : effectiveRightIcon ? (
          <div
            className="pointer-events-none absolute right-3.5 flex items-center justify-center rogym-text-dim shrink-0"
            aria-hidden="true"
          >
            {effectiveRightIcon}
          </div>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
