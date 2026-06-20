import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

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
      <div
        className={`max-h-[90vh] w-full ${SIZE_CLASS[size]} overflow-y-auto rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
