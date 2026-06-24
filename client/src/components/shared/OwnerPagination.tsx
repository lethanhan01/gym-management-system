import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface OwnerPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function OwnerPagination({ page, totalPages, onPageChange }: OwnerPaginationProps) {
  const { t } = useTranslation('common')

  if (totalPages <= 1) return null

  function goTo(p: number) {
    onPageChange(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        className="rogym-btn rogym-btn--icon rogym-btn--elevated"
        disabled={page === 1}
        onClick={() => goTo(page - 1)}
        aria-label={t('pagination.prev')}
      >
        <ChevronLeft size={17} />
      </button>
      <span className="text-sm rogym-text-secondary">
        {t('pagination.pageOf', { page, totalPages })}
      </span>
      <button
        type="button"
        className="rogym-btn rogym-btn--icon rogym-btn--elevated"
        disabled={page === totalPages}
        onClick={() => goTo(page + 1)}
        aria-label={t('pagination.next')}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  )
}
