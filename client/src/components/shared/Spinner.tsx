import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// Vòng tròn xoay dùng chung cho mọi trạng thái lazy-load / loading.
export function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
      style={{ width: size, height: size }}
    />
  )
}

// Loader căn giữa cho Suspense fallback ở mức nội dung (trong layout đã render).
export function PageLoader({
  className,
  minHeight = '60vh',
  size = 36,
}: {
  className?: string
  minHeight?: string
  size?: number
}) {
  const { t } = useTranslation('common')
  return (
    <div
      role="status"
      aria-label={t('loading')}
      className={cn(
        'flex w-full items-center justify-center text-[var(--rogym-green)]',
        className
      )}
      style={{ minHeight }}
    >
      <Spinner size={size} />
    </div>
  )
}

// Loader phủ toàn màn hình cho fallback route-level (App, AuthLayout).
export function FullScreenLoader() {
  const { t } = useTranslation('common')
  return (
    <div
      role="status"
      aria-label={t('loading')}
      className="flex min-h-screen w-full items-center justify-center bg-[#080e0b] text-[var(--rogym-green)]"
    >
      <Spinner size={44} />
    </div>
  )
}
