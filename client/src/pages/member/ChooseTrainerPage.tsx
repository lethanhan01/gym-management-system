import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { memberService, type TrainerSummary } from '@/services/member.service'
import { MemberPage, MemberPageHeader, MemberSkeleton, MemberEmptyState } from '@/components/MemberUI'

export default function ChooseTrainerPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const [trainers, setTrainers] = useState<TrainerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    memberService.getAvailableTrainers()
      .then((data) => { setTrainers(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  async function handleConfirm() {
    if (!selected) return
    setSubmitError('')
    setSubmitting(true)
    try {
      await memberService.selfAssignTrainer(Number(selected))
      navigate('/member', { replace: true })
    } catch {
      setSubmitError(t('chooseTrainer.submitError'))
      setSubmitting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('chooseTrainer.eyebrow')}
        title={t('chooseTrainer.title')}
        description={t('chooseTrainer.description')}
        actions={
          <button
            className="rogym-btn rogym-btn--outline-white flex items-center gap-1.5 text-sm"
            onClick={() => navigate('/member')}
          >
            <ArrowLeft size={14} />
            {t('chooseTrainer.buttonBack')}
          </button>
        }
      />

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error ? (
        <MemberEmptyState
          title={t('chooseTrainer.errorTitle')}
          description={t('chooseTrainer.errorDescription')}
        />
      ) : trainers.length === 0 ? (
        <MemberEmptyState
          title={t('chooseTrainer.emptyTitle')}
          description={t('chooseTrainer.emptyDescription')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => {
              const initials = trainer.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
              const isSelected = selected === trainer.staffId
              return (
                <button
                  key={trainer.staffId}
                  onClick={() => setSelected(trainer.staffId)}
                  className={`rogym-card rogym-card--compact p-5 flex flex-col items-center gap-3 text-center cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'ring-2 ring-[var(--rogym-teal)] ring-offset-1 ring-offset-transparent'
                      : 'hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-center rounded-full shrink-0 rogym-sx-20f77b4b">
                    <span className="rogym-sx-2e7dd58d">{initials}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{trainer.fullName}</h3>
                    <p className="mt-1 text-xs rogym-text-secondary">
                      {t('chooseTrainer.positionLabel.' + trainer.position, trainer.position)}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="rogym-tone-badge" data-tone="success">{t('chooseTrainer.selectedBadge')}</span>
                  )}
                </button>
              )
            })}
          </div>

          {submitError && (
            <p className="text-sm text-red-400 text-center">{submitError}</p>
          )}

          <div className="flex justify-end pt-2">
            <button
              className="rogym-btn rogym-btn--primary px-8"
              disabled={!selected || submitting}
              onClick={handleConfirm}
            >
              {submitting ? t('chooseTrainer.buttonProcessing') : t('chooseTrainer.buttonChoose')}
            </button>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
