import type { AriaRole, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotificationTone = 'success' | 'error' | 'warning' | 'info'

function defaultRole(tone: NotificationTone): AriaRole {
  return tone === 'error' || tone === 'warning' ? 'alert' : 'status'
}

export function NotificationToast({
  tone,
  message,
  icon,
  action,
  onClose,
  role,
}: {
  tone: NotificationTone
  message: ReactNode
  icon?: ReactNode
  action?: ReactNode
  onClose?: () => void
  role?: AriaRole
}) {
  return (
    <div className="rogym-notification-toast" data-tone={tone} role={role ?? defaultRole(tone)}>
      {icon && <span className="rogym-notification-toast__icon">{icon}</span>}
      <div className="rogym-notification-toast__message">{message}</div>
      {action && <div className="rogym-notification-toast__action">{action}</div>}
      {onClose && (
        <button
          type="button"
          className="rogym-notification-toast__close"
          onClick={onClose}
          aria-label="Close notification"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export function NotificationAlert({
  tone,
  message,
  title,
  action,
  role,
}: {
  tone: NotificationTone
  message: ReactNode
  title?: ReactNode
  action?: ReactNode
  role?: AriaRole
}) {
  return (
    <div className="rogym-notification-alert" data-tone={tone} role={role ?? defaultRole(tone)}>
      <div className="rogym-notification-alert__content">
        {title && <div className="rogym-notification-alert__title">{title}</div>}
        <div className="rogym-notification-alert__message">{message}</div>
      </div>
      {action && <div className="rogym-notification-alert__action">{action}</div>}
    </div>
  )
}

export function NotificationPanel({
  children,
  titleId,
  className,
}: {
  children: ReactNode
  titleId?: string
  className?: string
}) {
  return (
    <div
      className={cn('rogym-notification-panel', className)}
      role="region"
      aria-labelledby={titleId}
    >
      {children}
    </div>
  )
}
