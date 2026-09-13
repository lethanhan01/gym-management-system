import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Award, Sparkles, MessageSquare, Clock } from 'lucide-react'
import {
  memberService,
  type TrainerSummary,
  type TrainerReviewDetail,
} from '@/services/member.service'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Chip,
  EmptyState,
  Modal,
  ModalFooter,
  ProgressBar,
  Select,
  Skeleton,
} from '@/components/ui'

export interface TrainerReviewsModalProps {
  open: boolean
  onClose: () => void
  trainer: TrainerSummary | null
  onChooseTrainer: (trainerId: string) => Promise<void>
  isChoosing: boolean
}

export default function TrainerReviewsModal({
  open,
  onClose,
  trainer,
  onChooseTrainer,
  isChoosing,
}: TrainerReviewsModalProps) {
  const { t } = useTranslation('member')
  const [detail, setDetail] = useState<TrainerReviewDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest')

  const fetchReviews = useCallback(
    async (staffId: string, page = 1, append = false) => {
      if (page === 1) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      try {
        const res = await memberService.getTrainerReviews(staffId, {
          page,
          pageSize: 5,
          rating: selectedRating ?? undefined,
          sort,
        })
        setDetail((prev) => {
          if (!prev || !append || page === 1) return res
          return {
            ...res,
            reviews: [...prev.reviews, ...res.reviews],
          }
        })
      } catch {
        setError(t('chooseTrainer.modal.loadError'))
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [selectedRating, sort, t]
  )

  useEffect(() => {
    if (!open || !trainer) {
      setDetail(null)
      setSelectedRating(null)
      setSort('newest')
      return
    }
    fetchReviews(trainer.staffId, 1, false)
  }, [open, trainer?.staffId, selectedRating, sort])

  const handleLoadMore = () => {
    if (!trainer || !detail || !detail.pagination.hasMore || loadingMore) return
    fetchReviews(trainer.staffId, detail.pagination.page + 1, true)
  }

  const renderStars = (rating: number, size = 16) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={size}
            className={
              s <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-white/20'
            }
          />
        ))}
      </div>
    )
  }

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  if (!trainer) return null

  const stats = detail?.stats
  const reviews = detail?.reviews ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={t('chooseTrainer.modal.title')}
      footer={
        <ModalFooter>
          <Button variant="outline-white" onClick={onClose}>
            {t('chooseTrainer.modal.buttonClose')}
          </Button>
          <Button
            variant="primary"
            loading={isChoosing}
            onClick={() => onChooseTrainer(trainer.staffId)}
          >
            {t('chooseTrainer.modal.buttonChooseTrainer')}
          </Button>
        </ModalFooter>
      }
    >
      <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Profile Header */}
        <section className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
          <Avatar
            name={trainer.fullName}
            size="xl"
            shape="circle"
            tone="teal"
            className="ring-2 ring-[var(--rogym-teal)]/40"
          />
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-bold text-white tracking-wide">
                {trainer.fullName}
              </h3>
              <Badge tone="accent" size="sm">
                {t('chooseTrainer.positionLabel.' + trainer.position, trainer.position)}
              </Badge>
              {trainer.experienceYears && trainer.experienceYears > 0 ? (
                <Badge tone="muted" size="sm">
                  <Clock size={12} className="mr-1 inline" />
                  {t('chooseTrainer.experienceYears', { count: trainer.experienceYears })}
                </Badge>
              ) : null}
            </div>

            {trainer.specialty && (
              <p className="text-xs text-[var(--rogym-teal)] font-medium flex items-center justify-center sm:justify-start gap-1">
                <Award size={13} />
                <span>
                  {t('chooseTrainer.specialtyLabel')}: {trainer.specialty}
                </span>
              </p>
            )}

            <p className="text-xs rogym-text-secondary pt-1 leading-relaxed">
              {trainer.bio || t('chooseTrainer.modal.noBio')}
            </p>
          </div>
        </section>

        {/* Rating Overview & Star Breakdown */}
        <section className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          {/* Overall score */}
          <div className="flex flex-col items-center justify-center p-4 text-center rounded-xl bg-white/[0.02]">
            {stats && stats.ratingAverage ? (
              <>
                <div className="text-4xl font-extrabold text-white flex items-baseline gap-1">
                  <span>{stats.ratingAverage.toFixed(1)}</span>
                  <span className="text-base text-white/40 font-normal">/ 5.0</span>
                </div>
                <div className="mt-2">
                  {renderStars(Math.round(stats.ratingAverage), 20)}
                </div>
                <p className="mt-2 text-xs rogym-text-secondary">
                  {t('chooseTrainer.reviewsCount', { count: stats.totalReviews })}
                </p>
              </>
            ) : (
              <div className="py-2 text-center">
                <Star size={36} className="mx-auto text-white/20 mb-2" />
                <Badge tone="muted">{t('chooseTrainer.noReviewsYet')}</Badge>
                <p className="mt-2 text-xs rogym-text-secondary">
                  {t('chooseTrainer.modal.emptyReviewsDesc')}
                </p>
              </div>
            )}
          </div>

          {/* Breakdown bars */}
          <div className="flex flex-col justify-center gap-2">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = stats?.ratingCounts?.[String(s)] ?? 0
              const total = stats?.totalReviews ?? 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-white/70 font-medium flex items-center gap-0.5">
                    {s} <Star size={10} className="fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1">
                    <ProgressBar
                      value={pct}
                      max={100}
                      size="sm"
                      tone="warning"
                      className="bg-white/10"
                    />
                  </div>
                  <span className="w-8 text-right text-white/50">{pct}%</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Popular Tags */}
        {stats?.topTags && stats.topTags.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider rogym-text-secondary flex items-center gap-1.5">
              <Sparkles size={13} className="text-[var(--rogym-teal)]" />
              {t('chooseTrainer.modal.topTags')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.topTags.map((tag) => (
                <Badge key={tag} tone="accent" size="sm">
                  #{tag}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Filter and Sort Toolbar */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              size="sm"
              label={t('chooseTrainer.modal.filterAll')}
              selected={selectedRating === null}
              tone={selectedRating === null ? 'accent' : 'default'}
              onClick={() => setSelectedRating(null)}
            />
            {[5, 4, 3, 2, 1].map((starVal) => (
              <Chip
                key={starVal}
                size="sm"
                label={t('chooseTrainer.modal.filterStar', { count: starVal })}
                selected={selectedRating === starVal}
                tone={selectedRating === starVal ? 'warning' : 'default'}
                onClick={() =>
                  setSelectedRating(selectedRating === starVal ? null : starVal)
                }
              />
            ))}
          </div>

          <div className="w-44">
            <Select
              value={sort}
              onValueChange={(val) =>
                setSort(val as 'newest' | 'highest' | 'lowest')
              }
              ariaLabel={t('chooseTrainer.sortLabel')}
            >
              <option value="newest">{t('chooseTrainer.modal.sortNewest')}</option>
              <option value="highest">{t('chooseTrainer.modal.sortHighest')}</option>
              <option value="lowest">{t('chooseTrainer.modal.sortLowest')}</option>
            </Select>
          </div>
        </section>

        {/* Reviews List */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider rogym-text-secondary flex items-center gap-1.5">
            <MessageSquare size={13} />
            {t('chooseTrainer.modal.reviewsList')}
          </h4>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert tone="error" description={error} />
          ) : reviews.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<MessageSquare size={24} />}
              title={t('chooseTrainer.modal.emptyReviews')}
              description={
                selectedRating !== null
                  ? t('chooseTrainer.modal.emptyFilterReviews', { star: selectedRating })
                  : t('chooseTrainer.modal.emptyReviewsDesc')
              }
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <article
                  key={r.feedbackId}
                  className="p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.04] border border-white/10 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={r.reviewerName || t('chooseTrainer.modal.anonymousUser')}
                        size="sm"
                        shape="circle"
                        tone={r.isAnonymous ? 'neutral' : 'teal'}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-white">
                            {r.reviewerName || t('chooseTrainer.modal.anonymousUser')}
                          </p>
                          {r.isAnonymous && (
                            <Badge tone="muted" size="xs">
                              {t('chooseTrainer.modal.anonymousUser')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] rogym-text-secondary">
                          {formatDate(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    {renderStars(r.rating, 13)}
                  </div>

                  <p className="text-xs text-white/85 leading-relaxed">
                    {r.content}
                  </p>

                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {r.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/60 border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}

              {detail?.pagination.hasMore && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline-white"
                    size="sm"
                    loading={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {t('chooseTrainer.modal.buttonLoadMore')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
