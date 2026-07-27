import React from 'react'
import { toast as sonnerToast, type ExternalToast } from 'sonner'
import { NotificationToast, type NotificationTone } from '@/components/shared/NotificationUI'
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

function getIcon(tone: NotificationTone) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 size={16} />
    case 'error':
      return <AlertCircle size={16} />
    case 'warning':
      return <AlertTriangle size={16} />
    case 'info':
      return <Info size={16} />
  }
}

type ToastOptions = ExternalToast & {
  action?: {
    label: string
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  }
}

function customToast(message: React.ReactNode, tone: NotificationTone, options?: ToastOptions) {
  const className = ['rogym-sonner-toast', options?.className].filter(Boolean).join(' ')

  return sonnerToast.custom(
    (t) => (
      <NotificationToast
        tone={tone}
        message={message}
        icon={options?.icon || getIcon(tone)}
        action={
          options?.action ? (
            <button
              onClick={(e) => {
                if (options.action?.onClick) {
                  options.action.onClick(e)
                }
                sonnerToast.dismiss(t)
              }}
              className="rogym-text-link rogym-text-link--accent text-sm font-semibold"
            >
              {options.action.label}
            </button>
          ) : undefined
        }
        onClose={() => {
          if (options?.onDismiss) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options.onDismiss(t as any)
          }
          sonnerToast.dismiss(t)
        }}
      />
    ),
    { ...options, className }
  )
}

const toastFn = (message: string | React.ReactNode, options?: ToastOptions) => customToast(message, 'info', options)

export const toast = Object.assign(toastFn, {
  success: (message: string | React.ReactNode, options?: ToastOptions) => customToast(message, 'success', options),
  error: (message: string | React.ReactNode, options?: ToastOptions) => customToast(message, 'error', options),
  warning: (message: string | React.ReactNode, options?: ToastOptions) => customToast(message, 'warning', options),
  info: (message: string | React.ReactNode, options?: ToastOptions) => customToast(message, 'info', options),
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
})
