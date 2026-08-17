import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  Page,
  PageEmptyState,
  PageErrorState,
  PageHeader,
  PageSkeleton,
  Pagination,
  type BadgeTone,
} from '@/components/ui'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

const PAGE_SIZE = 8

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MyFeedbackPage() {
  const { t } = useTranslation('member')
  const user = useAuthStore(state => state.user)

  const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
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

  const SEVERITY_MAP: Record<string, { label: string; tone: BadgeTone }> = {
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
    <Page>
      <PageHeader
        eyebrow={t('feedback.list.eyebrow')}
        title={t('feedback.list.title')}
        description={t('feedback.list.description')}
        actions={
          <ButtonLink to="/member/feedback/send" variant="primary" size="sm">
            {t('feedback.list.buttonSendNew')}
          </ButtonLink>
        }
      />

      <main className="space-y-6">
        {/* Filter tabs */}
        <nav aria-label="Feedback filters" className="flex flex-wrap gap-2">
          {FILTER_TABS.map(tab => {
            const count = tab.value ? (countByStatus[tab.value] ?? 0) : feedbacks.length
            return (
              <button
                key={tab.value}
                type="button"
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
        </nav>

        {loading ? (
          <PageSkeleton rows={4} />
        ) : fetchError ? (
          <PageErrorState message={fetchError} onRetry={load} />
        ) : filtered.length === 0 ? (
          <PageEmptyState
            title={t('feedback.list.emptyAll')}
            description={activeTab ? t('feedback.list.emptyFiltered') : t('feedback.list.emptyNone')}
            action={
              !activeTab ? (
                <ButtonLink to="/member/feedback/send" variant="primary" size="sm">
                  {t('feedback.list.buttonSendFirst')}
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <section aria-label={t('feedback.list.title')} className="space-y-6">
            <div className="flex flex-col gap-3">
              {paged.map(fb => {
                const status = STATUS_MAP[fb.status] ?? { label: fb.status, tone: 'muted' as BadgeTone }
                const severity = SEVERITY_MAP[fb.severity] ?? { label: fb.severity, tone: 'muted' as BadgeTone }
                return (
                  <Card
                    as="article"
                    key={fb.feedbackId}
                    variant="compact"
                    className="p-4"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="muted">{TYPE_MAP[fb.feedbackType] ?? fb.feedbackType}</Badge>
                        <Badge tone={severity.tone}>{severity.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <Button
                          variant="icon"
                          size="sm"
                          onClick={() => setDeletingId(fb.feedbackId)}
                          title={t('feedback.list.buttonDelete')}
                          className="rogym-sx-38202e62"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </header>

                    <p className="mt-3 text-sm text-white rogym-sx-73cdf811">
                      {fb.content}
                    </p>

                    <footer className="mt-3 flex items-center justify-between gap-4">
                      <p className="text-xs rogym-sx-d88f932f">{t('feedback.list.sentAt', { date: fmtDate(fb.createdAt) })}</p>
                      {fb.status === 'resolved' && fb.response && (
                        <p className="text-xs max-w-xs text-right rogym-sx-4331cd11">
                          {t('feedback.list.responsePrefix', { response: fb.response })}
                        </p>
                      )}
                    </footer>
                  </Card>
                )
              })}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />

            <ConfirmDialog
              open={deletingId !== null}
              title={t('feedback.list.buttonDelete')}
              description={t('feedback.list.deleteConfirm')}
              confirmLabel={t('feedback.list.buttonDelete')}
              cancelLabel={t('feedback.list.buttonCancelDelete')}
              variant="danger"
              loading={deletingId ? deletingSet.has(deletingId) : false}
              onConfirm={() => { if (deletingId) return handleDelete(deletingId) }}
              onClose={() => setDeletingId(null)}
            />
          </section>
        )}
      </main>
    </Page>
  )
}

