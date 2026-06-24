import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffModal,
  StaffPage,
  StaffPageHeader,
  StaffSelect,
  StaffSkeleton,
  StaffStatusBadge,
  SubmitButton,
} from '@/components/StaffUI'

export default function StaffFeedbackPage() {
  const { t } = useTranslation('staff')
  const { t: tCommon } = useTranslation('common')

  const FEEDBACK_STATUS_OPTIONS = [
    { value: '', label: t('feedback.statusAll') },
    { value: 'open', label: t('feedback.statusOpen') },
    { value: 'in_progress', label: t('feedback.statusInProgress') },
    { value: 'resolved', label: t('feedback.statusResolved') },
    { value: 'rejected', label: t('feedback.statusRejected') },
  ]

  const NEXT_STATUS_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
    open: [
      { value: 'in_progress', label: t('feedback.actionInProgress') },
      { value: 'rejected', label: t('feedback.actionReject') },
    ],
    in_progress: [
      { value: 'resolved', label: t('feedback.actionResolved') },
      { value: 'rejected', label: t('feedback.actionReject') },
    ],
  }

  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const feedbackType = searchParams.get('type') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const [data, setData] = useState<Feedback[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Feedback | null>(null)
  const [nextStatus, setNextStatus] = useState('')
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    feedbackService
      .list({
        status: status || undefined,
        feedbackType: feedbackType || undefined,
        page,
        pageSize: 15,
        sort: 'createdAt:desc',
      })
      .then((result) => {
        setData(result.data)
        setTotal(result.total)
      })
      .catch((err) => setError(getApiError(err, t('feedback.loadFailed'))))
      .finally(() => setLoading(false))
  }, [status, feedbackType, page, t])

  useEffect(() => {
    load()
  }, [load])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  function openDetail(fb: Feedback) {
    setSelected(fb)
    setNextStatus(NEXT_STATUS_OPTIONS[fb.status]?.[0]?.value ?? '')
    setResponse(fb.response ?? '')
    setSaveError(null)
  }

  function closeDetail() {
    setSelected(null)
    setNextStatus('')
    setResponse('')
    setSaveError(null)
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault()
    if (!selected || !nextStatus) return
    setSaving(true)
    setSaveError(null)
    try {
      await feedbackService.updateStatus(selected.feedbackId, {
        status: nextStatus,
        resolutionNote: response.trim() || undefined,
      })
      closeDetail()
      load()
    } catch (err) {
      setSaveError(getApiError(err, t('feedback.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  function feedbackTypeLabel(type: string) {
    if (type === 'staff') return t('feedback.staff')
    if (type === 'equipment') return t('feedback.equipment')
    return t('feedback.service')
  }

  function severityLabel(severity: string) {
    if (severity === 'high') return t('feedback.severityHigh')
    if (severity === 'medium') return t('feedback.severityMedium')
    return t('feedback.severityLow')
  }

  const totalPages = Math.max(1, Math.ceil(total / 15))

  const statusLabel = status
    ? FEEDBACK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
    : null

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow={t('feedback.eyebrow')}
        title={t('feedback.title')}
        description={
          statusLabel
            ? t('feedback.descriptionFiltered', { total, status: statusLabel })
            : t('feedback.descriptionAll', { total })
        }
      />

      <div className="rogym-card rogym-card--compact flex flex-wrap gap-3 p-4">
        <StaffSelect
          value={status}
          onValueChange={(value) => updateParam('status', value)}
          ariaLabel={t('feedback.filterByStatus')}
        >
          {FEEDBACK_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </StaffSelect>
        <StaffSelect
          value={feedbackType}
          onValueChange={(value) => updateParam('type', value)}
          ariaLabel={t('feedback.filterByType')}
        >
          <option value="">{t('feedback.typeAll')}</option>
          <option value="staff">{t('feedback.staff')}</option>
          <option value="equipment">{t('feedback.equipment')}</option>
          <option value="service">{t('feedback.service')}</option>
        </StaffSelect>
      </div>

      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <StaffErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <StaffEmptyState
          title={t('feedback.noFeedback')}
          description={t('feedback.noFeedbackDesc')}
        />
      ) : (
        <div className="grid gap-3">
          {data.map((fb) => (
            <button
              key={fb.feedbackId}
              type="button"
              className="rogym-card rogym-card--compact rogym-card--interactive w-full p-5 text-left"
              onClick={() => openDetail(fb)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.08)] rogym-text-accent">
                    <MessageSquare size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{fb.content}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs rogym-text-dim">
                      <span>{feedbackTypeLabel(fb.feedbackType)}</span>
                      <span>·</span>
                      <span>{formatDate(fb.createdAt)}</span>
                      {fb.subjectStaffName && (
                        <>
                          <span>·</span>
                          <span>{t('feedback.staffLabel', { name: fb.subjectStaffName })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StaffStatusBadge status={fb.status} />
                  <span
                    className="rogym-tone-badge is-compact"
                    data-tone={severityTone(fb.severity)}
                  >
                    {severityLabel(fb.severity)}
                  </span>
                </div>
              </div>
              {fb.response && (
                <div className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs rogym-text-secondary line-clamp-2">
                  {t('feedback.responseLabel', { text: fb.response })}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
            aria-label={tCommon('pagination.prev')}
          >
            <ChevronLeft size={17} />
          </button>
          <span className="text-sm rogym-text-secondary">
            {t('feedback.page', { page, total: totalPages })}
          </span>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
            aria-label={tCommon('pagination.next')}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      )}

      <StaffModal
        open={!!selected}
        title={t('feedback.detailTitle')}
        onClose={closeDetail}
        footer={
          selected && NEXT_STATUS_OPTIONS[selected.status] ? (
            <>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                onClick={closeDetail}
              >
                {t('feedback.close')}
              </button>
              <SubmitButton form="feedback-handle-form" loading={saving} disabled={!nextStatus}>
                {t('feedback.update')}
              </SubmitButton>
            </>
          ) : (
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={closeDetail}
            >
              {t('feedback.close')}
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <StaffStatusBadge status={selected.status} />
                <span
                  className="rogym-tone-badge"
                  data-tone={severityTone(selected.severity)}
                >
                  {severityLabel(selected.severity)}
                </span>
                <span className="rogym-tone-badge" data-tone="info">
                  {feedbackTypeLabel(selected.feedbackType)}
                </span>
              </div>
              <p className="rounded-xl bg-white/[0.04] p-4 text-sm leading-6 text-white">
                {selected.content}
              </p>
              <div className="flex justify-between text-xs rogym-text-dim">
                <span>{t('feedback.sentAt', { date: formatDate(selected.createdAt) })}</span>
                {selected.handledAt && (
                  <span>{t('feedback.handledAt', { date: formatDate(selected.handledAt) })}</span>
                )}
              </div>
            </div>

            {selected.response && (
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider rogym-text-dim">
                  {t('feedback.previousResponse')}
                </div>
                <p className="text-sm rogym-text-secondary">{selected.response}</p>
              </div>
            )}

            {NEXT_STATUS_OPTIONS[selected.status] && (
              <form id="feedback-handle-form" className="space-y-4" onSubmit={handleUpdate}>
                {saveError && <StaffErrorState message={saveError} />}
                <label className="block space-y-2">
                  <span className="rogym-field-label">{t('feedback.action')}</span>
                  <StaffSelect value={nextStatus} onValueChange={setNextStatus} required>
                    {NEXT_STATUS_OPTIONS[selected.status].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </StaffSelect>
                </label>
                <label className="block space-y-2">
                  <span className="rogym-field-label">{t('feedback.responseContent')}</span>
                  <textarea
                    className="rogym-input min-h-24"
                    value={response}
                    onChange={(event) => setResponse(event.target.value)}
                    placeholder={t('feedback.responsePlaceholder')}
                  />
                </label>
                <button type="submit" className="hidden" />
              </form>
            )}
          </div>
        )}
      </StaffModal>
    </StaffPage>
  )
}

function severityTone(severity: string) {
  if (severity === 'high') return 'danger'
  if (severity === 'medium') return 'warning'
  return 'low'
}
