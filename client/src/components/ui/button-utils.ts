import { cn } from '@/lib/utils'
import type { BaseButtonProps, ButtonSize } from './Button'

export function normalizeButtonSize(size: ButtonSize = 'default'): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'nav' | 'wide' {
  switch (size) {
    case 'xs': return 'xs'
    case 'sm':
    case 'compact': return 'sm'
    case 'lg': return 'lg'
    case 'xl':
    case 'hero': return 'xl'
    case 'nav': return 'nav'
    case 'wide': return 'wide'
    default: return 'md'
  }
}

export function getButtonClasses({
  variant = 'primary', size = 'default', fullWidth, wide, mobileFull, truncate, className,
}: BaseButtonProps & { className?: string }) {
  const isTextLink = variant.startsWith('text') || variant === 'nav-link'
  if (isTextLink) return cn(variant === 'nav-link' ? 'nav-link-underline' : 'rogym-text-link', variant === 'text-muted' && 'rogym-text-link--muted', variant === 'text-accent' && 'rogym-text-link--accent', truncate && 'rogym-btn--truncate', className)

  const normalizedSize = normalizeButtonSize(size)
  const isIconVariant = variant === 'icon'
  return cn(
    'rogym-btn',
    variant === 'primary' && 'rogym-btn--primary',
    (variant === 'secondary' || variant === 'outline-white') && 'rogym-btn--outline-white',
    variant === 'danger' && 'rogym-btn--danger', variant === 'outline-green' && 'rogym-btn--outline-green', variant === 'outline-green-light' && 'rogym-btn--outline-green-light', variant === 'dark' && 'rogym-btn--dark', variant === 'elevated' && 'rogym-btn--elevated', isIconVariant && 'rogym-btn--icon rogym-btn--elevated',
    isIconVariant && normalizedSize === 'xs' && 'rogym-btn--icon-xs', isIconVariant && normalizedSize === 'sm' && 'rogym-btn--icon-sm', isIconVariant && normalizedSize === 'lg' && 'rogym-btn--icon-lg',
    !isIconVariant && normalizedSize === 'xs' && 'rogym-btn--xs', !isIconVariant && normalizedSize === 'sm' && 'rogym-btn--sm', !isIconVariant && normalizedSize === 'md' && 'rogym-btn--md', !isIconVariant && normalizedSize === 'lg' && 'rogym-btn--lg', !isIconVariant && normalizedSize === 'xl' && 'rogym-btn--xl', !isIconVariant && normalizedSize === 'nav' && 'rogym-btn--nav',
    (fullWidth || wide || normalizedSize === 'wide') && 'rogym-btn--full', mobileFull && 'rogym-btn--mobile-full', truncate && 'rogym-btn--truncate', className
  )
}
