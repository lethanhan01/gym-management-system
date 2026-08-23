import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, ButtonLink, type ButtonSize, type ButtonVariant } from './Button'
import { cn } from '@/lib/utils'

export interface BackButtonProps {
  to?: string
  label?: string
  onClick?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  iconOnly?: boolean
}

export function BackButton({
  to,
  label = 'Quay lại',
  onClick,
  variant = 'outline-white',
  size = 'compact',
  className,
  iconOnly = false,
}: BackButtonProps) {
  const navigate = useNavigate()

  if (to) {
    return (
      <ButtonLink
        to={to}
        variant={iconOnly ? 'icon' : variant}
        size={iconOnly ? 'sm' : size}
        leftIcon={<ArrowLeft size={16} />}
        className={cn('shrink-0', className)}
        aria-label={label}
      >
        {!iconOnly && label}
      </ButtonLink>
    )
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? 'icon' : variant}
      size={iconOnly ? 'sm' : size}
      leftIcon={<ArrowLeft size={16} />}
      onClick={onClick ?? (() => navigate(-1))}
      className={cn('shrink-0', className)}
      aria-label={label}
    >
      {!iconOnly && label}
    </Button>
  )
}
