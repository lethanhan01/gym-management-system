import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Trash2,
  Star,
  EyeOff,
  User,
  Building2,
  Dumbbell,
  X,
  MessageSquareText,
  Sparkles,
  Clock,
} from 'lucide-react'
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
import { formatDateTime } from '@/lib/date'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'
import { localizeTag } from './feedback-i18n'

const PAGE_SIZE = 8

export default function MyFeedbackPage() {
  const { t } = useTranslation('member')
  const user = useAuthStore((state) => state.user)

  const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
    open: { label: t('feedback.list.statusLabel.open'), tone: 'warning' },
    in_progress: { label: t('feedback.list.statusLabel.in_progress'), tone: 'info' },
    resolved: { label: t('feedback.list.statusLabel.resolved'), tone: 'success' },
    rejected: { label: t('feedback.list.statusLabel.rejected'), tone: 'muted' },
  }

  const TYPE_MAP: Record<string, string> = {
    staff: t('feedback.list.typeLabel.staff'),
    facility: t('feedback.list.typeLabel.facility'),
    equipment: t('feedback.list.typeLabel.equipment'),
    service: t('feedback.list.typeLabel.service'),
  }

  const FILTER_TABS = [
    { label: t('feedback.list.filterAll'), value: '' },
    { label: t('feedback.list.filterOpen'), value: 'open' },
    { label: t('feedback.list.filterInProgress'), value: 'in_progress' },
    { label: t('feedback.list.filterResolved'), value: 'resolved' },
    { label: t('feedback.list.filterRejected'), value: 'rejected' },
  ]

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingSet, setDeletingSet] = useState<Set<string>>(new Set())
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const load = useCallback(() => {
    setFetchError(null)
    setLoading(true)
    feedbackService
      .list({ sort: 'created_at:desc', pageSize: 50 })
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
    setDeletingSet((prev) => new Set(prev).add(feedbackId))
    try {
      await feedbackService.delete(feedbackId)
      setFeedbacks((prev) => prev.filter((f) => f.feedbackId !== feedbackId))
      setDeletingId(null)
    } catch {
      // silently reset on error
    } finally {
      setDeletingSet((prev) => {
        const s = new Set(prev)
        s.delete(feedbackId)
        return s
      })
    }
  }

  function getSubjectInfo(fb: Feedback) {
    if (fb.feedbackType === 'staff') {
      return {
        icon: <User size={18} className="text-emerald-400" />,
        title: fb.subjectStaffName
          ? `${t('feedback.list.trainerPrefix', 'HLV: ')}${fb.subjectStaffName}`
          : t('feedback.list.typeLabel.staff'),
        subtitle: null,
      }
    }
    if (fb.feedbackType === 'equipment') {
      return {
        icon: <Dumbbell size={18} className="text-sky-400" />,
        title: fb.subjectEquipmentName || t('feedback.list.typeLabel.equipment'),
        subtitle: fb.subjectRoomName ? (
          <span className="flex items-center gap-1 text-slate-400 text-xs">
            <Building2 size={12} className="shrink-0 text-slate-500" />
            {fb.subjectRoomName}
          </span>
        ) : null,
      }
    }
    if (fb.feedbackType === 'service') {
      return {
        icon: <Sparkles size={18} className="text-amber-400" />,
        title: t('feedback.list.typeLabel.service', 'Dịch vụ & Tiện ích'),
        subtitle: null,
      }
    }
    // Default: facility
    return {
      icon: <Building2 size={18} className="text-emerald-400" />,
      title: fb.subjectRoomName || t('feedback.list.typeLabel.facility'),
      subtitle: fb.subjectEquipmentName ? (
        <span className="flex items-center gap-1 text-slate-400 text-xs">
          <Dumbbell size={12} className="shrink-0 text-slate-500" />
          {fb.subjectEquipmentName}
        </span>
      ) : null,
    }
  }

  const countByStatus = feedbacks.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const filtered = activeTab ? feedbacks.filter((f) => f.status === activeTab) : feedbacks
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
          {FILTER_TABS.map((tab) => {
            const count = tab.value ? countByStatus[tab.value] ?? 0 : feedbacks.length
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
                  <span className="rogym-filter-chip__count ml-1.5 inline-flex items-center justify-center rounded-full text-xs font-bold">
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
            <div className="flex flex-col gap-4">
              {paged.map((fb) => {
                const status = STATUS_MAP[fb.status] ?? {
                  label: fb.status,
                  tone: 'muted' as BadgeTone,
                }
                const score = fb.rating ?? 5
                const subject = getSubjectInfo(fb)

                return (
                  <Card
                    as="article"
                    key={fb.feedbackId}
                    variant="compact"
                    className="relative overflow-hidden p-4 sm:p-5 space-y-3.5 transition-all duration-200 hover:border-white/20"
                  >
                    {/* Layer 1: Header (Subject, Type, Rating Star & Top-Right Fixed Status/Actions) */}
                    <header className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 shrink-0 mt-0.5">
                          {subject.icon}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <h2 className="text-sm sm:text-base font-bold text-white truncate leading-snug">
                            {subject.title}
                          </h2>

                          {subject.subtitle && (
                            <div className="pt-0.5">
                              {subject.subtitle}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <Badge tone="muted">{TYPE_MAP[fb.feedbackType] ?? fb.feedbackType}</Badge>
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-bold text-amber-400">
                              <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                              <span>{score}/5</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top-Right: Anchored Status Badge & Delete Button */}
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <Button
                          variant="icon"
                          size="sm"
                          onClick={() => setDeletingId(fb.feedbackId)}
                          title={t('feedback.list.buttonDelete')}
                          aria-label={t('feedback.list.buttonDelete')}
                          className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </header>

                    {/* Layer 2: Feedback Content Bubble Box with Tags */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 sm:p-4 space-y-2.5">
                      <p className="text-sm text-white/95 leading-relaxed break-words whitespace-pre-wrap">
                        {fb.content}
                      </p>

                      {/* Quick tags */}
                      {fb.tags && fb.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/[0.04]">
                          {fb.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-300 border border-white/10 select-none"
                            >
                              {localizeTag(tag)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Layer 3: Image attachments */}
                    {fb.imageUrls && fb.imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pt-0.5">
                        {fb.imageUrls.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewImage(img)}
                            className="relative h-16 w-24 rounded-xl overflow-hidden border border-white/10 hover:border-emerald-400/50 transition-all group shadow-sm"
                          >
                            <img src={img} alt="attachment" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Layer 4: Gym/Admin Response Callout (if available) */}
                    {fb.response && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3.5 space-y-1">
                        <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <MessageSquareText size={14} className="shrink-0" />
                          <span>{t('feedback.list.responseHeading', 'Phản hồi từ ban quản lý:')}</span>
                        </div>
                        <p className="text-xs text-emerald-200/95 leading-relaxed break-words pl-5">
                          {fb.response}
                        </p>
                      </div>
                    )}

                    {/* Layer 5: Footer with Date & Anonymous indicator */}
                    <footer className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="shrink-0 text-slate-500" />
                        <span>{t('feedback.list.sentAt', { date: formatDateTime(fb.createdAt) })}</span>
                      </div>

                      {fb.isAnonymous && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5">
                          <EyeOff size={11} className="shrink-0" />
                          {t('feedback.list.anonymousBadge')}
                        </span>
                      )}
                    </footer>
                  </Card>
                )
              })}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />

            <ConfirmDialog
              open={deletingId !== null}
              title={t('feedback.list.buttonDelete')}
              description={t('feedback.list.deleteConfirm')}
              confirmLabel={t('feedback.list.buttonDelete')}
              cancelLabel={t('feedback.list.buttonCancelDelete')}
              variant="danger"
              loading={deletingId ? deletingSet.has(deletingId) : false}
              onConfirm={() => {
                if (deletingId) return handleDelete(deletingId)
              }}
              onClose={() => setDeletingId(null)}
            />

            {/* Image Lightbox Modal */}
            {previewImage && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={() => setPreviewImage(null)}
              >
                <div
                  className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-[#181d28] border border-white/15 p-2 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors z-10"
                  >
                    <X size={18} />
                  </button>
                  <img
                    src={previewImage}
                    alt={t('feedback.list.imageAltPreview', 'attachment preview')}
                    className="max-h-[75vh] w-auto rounded-xl object-contain"
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </Page>
  )
}
