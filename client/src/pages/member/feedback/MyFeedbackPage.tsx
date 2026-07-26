import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { MemberPage, MemberPageHeader, MemberSkeleton, MemberEmptyState, MemberErrorState } from '@/components/MemberUI'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

const PAGE_SIZE = 8

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}


function Badge({ label, tone = 'muted' }: { label: string; tone?: string }) {
  return (
    <span className="rogym-tone-badge is-compact" data-tone={tone}>
      {label}
    </span>
  )
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null

  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i)
    if (page < total - 2) pages.push('...')
    pages.push(total)
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rogym-pagination-button"
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="rogym-sx-a731f100">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`rogym-pagination-button ${p === page ? 'is-active' : ''}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        className="rogym-pagination-button"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}

export default function MyFeedbackPage() {
  const { t } = useTranslation('member')
  const user = useAuthStore(state => state.user)

  const STATUS_MAP: Record<string, { label: string; tone: string }> = {
    open:        { label: t('feedback.list.statusLabel.open'),        tone: 'warning' },
    in_progress: { label: t('feedback.list.statusLabel.in_progress'), tone: 'info' },
    resolved:    { label: t('feedback.list.statusLabel.resolved'),    tone: 'success' },
    rejected:    { label: t('feedback.list.statusLabel.rejected'),    tone: 'muted' },
  }

  const TYPE_MAP: Record<string, string> = {
    staff:     t('feedback.list.typeLabel.staff'),
    equipment: t('feedback.list.typeLabel.equipment'),
    service:   t('feedback.list.typeLabel.service'),
  }

  const SEVERITY_MAP: Record<string, { label: string; tone: string }> = {
    low:    { label: t('feedback.list.severityLabel.low'),    tone: 'success' },
    medium: { label: t('feedback.list.severityLabel.medium'), tone: 'warning' },
    high:   { label: t('feedback.list.severityLabel.high'),   tone: 'danger' },
  }

  const FILTER_TABS = [
    { label: t('feedback.list.filterAll'),        value: '' },
    { label: t('feedback.list.filterOpen'),       value: 'open' },
    { label: t('feedback.list.filterInProgress'), value: 'in_progress' },
    { label: t('feedback.list.filterResolved'),   value: 'resolved' },
    { label: t('feedback.list.filterRejected'),   value: 'rejected' },
  ]

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingSet, setDeletingSet] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    setFetchError(null)
    setLoading(true)
    feedbackService.list({ sort: 'created_at:desc', pageSize: 50 })
      .then(({ data }) => setFeedbacks(data))
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        if (err?.response?.status !== 403) {
          setFetchError(err?.response?.data?.message || t('feedback.list.errorLoad'))
        }
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    if (!user?.memberId) return
    load()
  }, [load, user?.memberId])

  async function handleDelete(feedbackId: string) {
    setDeletingSet(prev => new Set(prev).add(feedbackId))
    try {
      await feedbackService.delete(feedbackId)
      setFeedbacks(prev => prev.filter(f => f.feedbackId !== feedbackId))
      setDeletingId(null)
    } catch {
      // silently reset on error
    } finally {
      setDeletingSet(prev => { const s = new Set(prev); s.delete(feedbackId); return s })
    }
  }

  const countByStatus = feedbacks.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const filtered = activeTab ? feedbacks.filter(f => f.status === activeTab) : feedbacks
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function switchTab(val: string) {
    setActiveTab(val)
    setPage(1)
    setDeletingId(null)
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('feedback.list.eyebrow')}
        title={t('feedback.list.title')}
        description={t('feedback.list.description')}
        actions={
          <Link to="/member/feedback/send" className="rogym-btn rogym-btn--primary px-5 py-2.5 text-sm">
            {t('feedback.list.buttonSendNew')}
          </Link>
        }
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map(tab => {
          const count = tab.value ? (countByStatus[tab.value] ?? 0) : feedbacks.length
          return (
            <button
              key={tab.value}
              onClick={() => switchTab(tab.value)}
              className={`rogym-filter-chip rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.value ? 'is-active' : ''
              }`}
            >
              {tab.label}
              {!loading && count > 0 && (
                <span
                  className="rogym-filter-chip__count ml-1.5 inline-flex items-center justify-center rounded-full text-xs font-bold"
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : fetchError ? (
        <MemberErrorState message={fetchError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <MemberEmptyState
          title={t('feedback.list.emptyAll')}
          description={activeTab ? t('feedback.list.emptyFiltered') : t('feedback.list.emptyNone')}
          action={
            !activeTab ? (
              <Link to="/member/feedback/send" className="rogym-btn rogym-btn--primary px-5 py-2.5 text-sm">
                {t('feedback.list.buttonSendFirst')}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {paged.map(fb => {
              const status = STATUS_MAP[fb.status] ?? { label: fb.status, tone: 'muted' }
              const severity = SEVERITY_MAP[fb.severity] ?? { label: fb.severity, tone: 'muted' }
              const isConfirming = deletingId === fb.feedbackId
              const isDeleting = deletingSet.has(fb.feedbackId)
              return (
                <div
                  key={fb.feedbackId}
                  className="rogym-card rogym-card--compact rogym-sx-401e6d87"
                  
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge label={TYPE_MAP[fb.feedbackType] ?? fb.feedbackType} />
                      <Badge label={severity.label} tone={severity.tone} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge label={status.label} tone={status.tone} />
                      {!isConfirming && (
                        <button
                          onClick={() => setDeletingId(fb.feedbackId)}
                          title="Xóa phản hồi"
                          className="rogym-sx-38202e62"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p
                    className="mt-3 text-sm text-white rogym-sx-73cdf811"
                    
                  >
                    {fb.content}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-xs rogym-sx-d88f932f" >{t('feedback.list.sentAt', { date: fmtDate(fb.createdAt) })}</p>
                    {fb.status === 'resolved' && fb.response && (
                      <p
                        className="text-xs max-w-xs text-right rogym-sx-4331cd11"
                        
                      >
                        {t('feedback.list.responsePrefix', { response: fb.response })}
                      </p>
                    )}
                  </div>

                  {isConfirming && (
                    <div
                      className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 rogym-sx-6a3fe515"
                      
                    >
                      <p className="flex-1 text-xs rogym-sx-1cfa11b1" >{t('feedback.list.deleteConfirm')}</p>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs font-medium rogym-sx-2c9ff230"

                      >
                        {t('feedback.list.buttonCancelDelete')}
                      </button>
                      <button
                        onClick={() => handleDelete(fb.feedbackId)}
                        disabled={isDeleting}
                        className="rogym-danger-button rounded-lg px-3 py-1.5 text-xs font-semibold"
                      >
                        {isDeleting ? t('feedback.list.buttonDeleting') : t('feedback.list.buttonDelete')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Pagination page={page} total={totalPages} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </>
      )}
    </MemberPage>
  )
}
