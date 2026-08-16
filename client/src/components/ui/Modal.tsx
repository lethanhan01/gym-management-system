import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  size?: ModalSize
}

export function Modal({ open, title, children, onClose, footer, size = 'xl' }: ModalProps) {
  const { t } = useTranslation('common')
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* w-[90vw] ngăn modal chạm sát cạnh màn hình nhỏ; md:w-full trở lại full-width bên trong backdrop p-4 */}
      <div
        className={`max-h-[90vh] w-[90vw] md:w-full ${SIZE_CLASS[size]} overflow-y-auto rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-[var(--rogym-shadow-glass)]`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-bold text-white">
            {title}
          </h2>
          <Button
            variant="icon"
            size="sm"
            onClick={onClose}
            aria-label={t('button.close')}
          >
            <X size={16} />
          </Button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

