interface OwnerPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function OwnerPagination({ page, totalPages, onPageChange }: OwnerPaginationProps) {
  if (totalPages <= 1) return null

  function goTo(p: number) {
    onPageChange(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
        disabled={page === 1}
        onClick={() => goTo(page - 1)}
      >
        Trước
      </button>
      <span className="text-sm rogym-text-secondary">
        Trang {page} / {totalPages}
      </span>
      <button
        className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
        disabled={page === totalPages}
        onClick={() => goTo(page + 1)}
      >
        Sau
      </button>
    </div>
  )
}
