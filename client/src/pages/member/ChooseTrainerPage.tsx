import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, Clock, Award, Eye } from 'lucide-react'
import { memberService, type TrainerSummary } from '@/services/member.service'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Page,
  PageEmptyState,
  PageHeader,
  PageSkeleton,
  SearchInput,
  Select,
} from '@/components/ui'
import { localizeSpecialty, localizeTag } from '@/pages/member/feedback/feedback-i18n'
import TrainerReviewsModal from './components/TrainerReviewsModal'

type SortOption = 'ratingDesc' | 'reviewsDesc' | 'nameAsc'

export default function ChooseTrainerPage() {
  const { t, i18n } = useTranslation('member')
  const navigate = useNavigate()
  const [trainers, setTrainers] = useState<TrainerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('ratingDesc')

  // Review Modal state
  const [reviewTrainer, setReviewTrainer] = useState<TrainerSummary | null>(null)

  useEffect(() => {
    memberService
      .getAvailableTrainers()
      .then((data) => {
        setTrainers(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  async function handleConfirm(trainerIdToAssign?: string) {
    const targetId = trainerIdToAssign ?? selected
    if (!targetId) return

    setSubmitError('')
    setSubmitting(true)
    try {
      await memberService.selfAssignTrainer(Number(targetId))
      navigate('/member', { replace: true })
    } catch {
      setSubmitError(t('chooseTrainer.submitError'))
      setSubmitting(false)
    }
  }

  // Filter & Sort trainers
  const filteredTrainers = useMemo(() => {
    let list = [...trainers]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (tr) =>
          tr.fullName.toLowerCase().includes(q) ||
          (tr.specialty && tr.specialty.toLowerCase().includes(q))
      )
    }

    list.sort((a, b) => {
      if (sortBy === 'ratingDesc') {
        const rateA = a.ratingAverage ?? 0
        const rateB = b.ratingAverage ?? 0
        if (rateB !== rateA) return rateB - rateA
        return (b.totalReviews ?? 0) - (a.totalReviews ?? 0)
      }
      if (sortBy === 'reviewsDesc') {
        return (b.totalReviews ?? 0) - (a.totalReviews ?? 0)
      }
      if (sortBy === 'nameAsc') {
        return a.fullName.localeCompare(b.fullName, i18n.language)
      }
      return 0
    })

    return list
  }, [trainers, searchQuery, sortBy, i18n.language])

  return (
    <Page>
      <PageHeader
        eyebrow={t('chooseTrainer.eyebrow')}
        title={t('chooseTrainer.title')}
        description={t('chooseTrainer.description')}
        actions={
          <Button
            variant="outline-white"
            size="sm"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => navigate('/member')}
          >
            {t('chooseTrainer.buttonBack')}
          </Button>
        }
      />

      {loading ? (
        <PageSkeleton rows={4} />
      ) : error ? (
        <PageEmptyState
          title={t('chooseTrainer.errorTitle')}
          description={t('chooseTrainer.errorDescription')}
        />
      ) : trainers.length === 0 ? (
        <PageEmptyState
          title={t('chooseTrainer.emptyTitle')}
          description={t('chooseTrainer.emptyDescription')}
        />
      ) : (
        <section className="flex flex-col gap-5">
          {/* Toolbar: Search and Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex-1 min-w-[240px]">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('chooseTrainer.searchPlaceholder')}
                aria-label={t('chooseTrainer.searchPlaceholder')}
                inputSize="md"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
                ariaLabel={t('chooseTrainer.sortLabel')}
              >
                <option value="ratingDesc">
                  {t('chooseTrainer.sortOptions.ratingDesc')}
                </option>
                <option value="reviewsDesc">
                  {t('chooseTrainer.sortOptions.reviewsDesc')}
                </option>
                <option value="nameAsc">
                  {t('chooseTrainer.sortOptions.nameAsc')}
                </option>
              </Select>
            </div>
          </div>

          {filteredTrainers.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title={t('chooseTrainer.noSearchResults')}
                description={t('chooseTrainer.noSearchResultsDesc')}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTrainers.map((trainer) => {
                const isSelected = selected === trainer.staffId
                const hasRating =
                  trainer.ratingAverage != null && trainer.ratingAverage > 0

                return (
                  <Card
                    as="article"
                    key={trainer.staffId}
                    onClick={() => setSelected(trainer.staffId)}
                    variant="interactive"
                    className={`p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-[var(--rogym-teal)] shadow-[0_0_18px_rgba(66,224,158,0.25)] border-[var(--rogym-teal)]/50'
                        : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <Avatar
                        name={trainer.fullName}
                        size="lg"
                        shape="circle"
                        tone="teal"
                      />

                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white tracking-wide">
                            {trainer.fullName}
                          </h3>
                          {isSelected && (
                            <Badge tone="success" size="xs">
                              {t('chooseTrainer.selectedBadge')}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Badge tone="muted" size="xs">
                            {t(
                              'chooseTrainer.positionLabel.' + trainer.position,
                              trainer.position
                            )}
                          </Badge>
                          {trainer.experienceYears && trainer.experienceYears > 0 ? (
                            <span className="text-[11px] rogym-text-secondary flex items-center gap-0.5">
                              <Clock size={11} />
                              {t('chooseTrainer.experienceYears', {
                                count: trainer.experienceYears,
                              })}
                            </span>
                          ) : null}
                        </div>

                        {trainer.specialty && (
                          <p className="text-xs text-[var(--rogym-teal)] font-medium flex items-center justify-center gap-1 pt-0.5">
                            <Award size={12} />
                            <span>{localizeSpecialty(trainer.specialty)}</span>
                          </p>
                        )}
                      </div>

                      {/* Ratings summary block */}
                      <div className="w-full pt-1 flex flex-col items-center gap-1.5">
                        {hasRating ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold">
                            <Star size={13} className="fill-amber-400 text-amber-400" />
                            <span>{trainer.ratingAverage!.toFixed(1)}</span>
                            <span className="text-white/50 text-[11px] font-normal">
                              (
                              {t('chooseTrainer.reviewsCount', {
                                count: trainer.totalReviews ?? 0,
                              })}
                              )
                            </span>
                          </div>
                        ) : (
                          <Badge tone="muted" size="xs">
                            {t('chooseTrainer.badgeNew')}
                          </Badge>
                        )}

                        {/* Top tags */}
                        {trainer.topTags && trainer.topTags.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1">
                            {trainer.topTags.slice(0, 2).map((tg) => (
                              <span
                                key={tg}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/10"
                              >
                                #{localizeTag(tg)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <Button
                        variant="outline-white"
                        size="xs"
                        leftIcon={<Eye size={12} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setReviewTrainer(trainer)
                        }}
                      >
                        {t('chooseTrainer.buttonViewReviews')}
                      </Button>

                      <span className="text-[11px] font-medium text-white/50">
                        {isSelected
                          ? t('chooseTrainer.selectedBadge')
                          : t('chooseTrainer.cardSelectHint')}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {submitError && (
            <Alert
              tone="error"
              description={submitError}
              className="justify-center text-center"
            />
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              className="px-8"
              disabled={!selected || submitting}
              loading={submitting}
              onClick={() => handleConfirm()}
            >
              {t('chooseTrainer.buttonChoose')}
            </Button>
          </div>
        </section>
      )}

      {/* Review Details Modal */}
      <TrainerReviewsModal
        open={Boolean(reviewTrainer)}
        onClose={() => setReviewTrainer(null)}
        trainer={reviewTrainer}
        onChooseTrainer={async (trainerId) => {
          setSelected(trainerId)
          await handleConfirm(trainerId)
          setReviewTrainer(null)
        }}
        isChoosing={submitting}
      />
    </Page>
  )
}
