import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { MemberPage, MemberPageHeader, MemberSkeleton, MemberEmptyState, MemberErrorState } from '@/components/MemberUI'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

const PAGE_SIZE = 8

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  open:        { label: 'Chờ xử lý',     tone: 'warning' },
  in_progress: { label: 'Đang xử lý',    tone: 'info' },
  resolved:    { label: 'Đã giải quyết', tone: 'success' },
  rejected:    { label: 'Từ chối',       tone: 'muted' },
}

const TYPE_MAP: Record<string, string> = {
  staff:     'Nhân viên',
  equipment: 'Thiết bị',
  service:   'Dịch vụ',
}

const SEVERITY_MAP: Record<string, { label: string; tone: string }> = {
  low:    { label: 'Thấp',       tone: 'success' },
  medium: { label: 'Trung bình', tone: 'warning' },
  high:   { label: 'Cao',        tone: 'danger' },
}

const FILTER_TABS = [
  { label: 'Tất cả',         value: '' },
  { label: 'Chờ xử lý',      value: 'open' },
  { label: 'Đang xử lý',     value: 'in_progress' },
  { label: 'Đã giải quyết',  value: 'resolved' },
  { label: 'Từ chối',        value: 'rejected' },
]

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
  const { user } = useAuthStore()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingSet, setDeletingSet] = useState<Set<string>>(new Set())

  function load() {
    setFetchError(null)
    setLoading(true)
    feedbackService.list({ sort: 'created_at:desc', pageSize: 50 })
      .then(({ data }) => setFeedbacks(data))
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        if (err?.response?.status !== 403) {
          setFetchError(err?.response?.data?.message || 'Không thể tải danh sách phản hồi.')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user?.memberId) return
    load()
  }, [user?.memberId])

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
        eyebrow="Phản hồi"
        title="Phản hồi của tôi"
        description="Theo dõi trạng thái các phản hồi bạn đã gửi"
        actions={
          <Link to="/member/feedback/send" className="rogym-btn rogym-btn--primary px-5 py-2.5 text-sm">
            Gửi phản hồi mới
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
          title="Chưa có phản hồi nào"
          description={activeTab ? 'Không có phản hồi nào trong trạng thái này.' : 'Bạn chưa gửi phản hồi nào.'}
          action={
            !activeTab ? (
              <Link to="/member/feedback/send" className="rogym-btn rogym-btn--primary px-5 py-2.5 text-sm">
                Gửi phản hồi đầu tiên
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
                    <p className="text-xs rogym-sx-d88f932f" >Gửi lúc {fmtDate(fb.createdAt)}</p>
                    {fb.status === 'resolved' && fb.response && (
                      <p
                        className="text-xs max-w-xs text-right rogym-sx-4331cd11"
                        
                      >
                        Phản hồi: {fb.response}
                      </p>
                    )}
                  </div>

                  {isConfirming && (
                    <div
                      className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 rogym-sx-6a3fe515"
                      
                    >
                      <p className="flex-1 text-xs rogym-sx-1cfa11b1" >Xóa phản hồi này? Hành động không thể hoàn tác.</p>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs font-medium rogym-sx-2c9ff230"
                        
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleDelete(fb.feedbackId)}
                        disabled={isDeleting}
                        className="rogym-danger-button rounded-lg px-3 py-1.5 text-xs font-semibold"
                      >
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
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
