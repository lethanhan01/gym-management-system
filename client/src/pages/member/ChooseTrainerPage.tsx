import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { memberService, type TrainerSummary } from '@/services/member.service'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Page,
  PageEmptyState,
  PageHeader,
  PageSkeleton,
} from '@/components/ui'

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
        <section className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => {
              const isSelected = selected === trainer.staffId
              return (
                <Card
                  as="article"
                  key={trainer.staffId}
                  onClick={() => setSelected(trainer.staffId)}
                  variant="interactive"
                  className={`p-5 flex flex-col items-center gap-3 text-center cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'ring-2 ring-[var(--rogym-teal)] ring-offset-1 ring-offset-transparent'
                      : 'hover:bg-white/[0.06]'
                  }`}
                >
                  <Avatar name={trainer.fullName} size="lg" shape="circle" tone="teal" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{trainer.fullName}</h3>
                    <p className="mt-1 text-xs rogym-text-secondary">
                      {t('chooseTrainer.positionLabel.' + trainer.position, trainer.position)}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge tone="success">{t('chooseTrainer.selectedBadge')}</Badge>
                  )}
                </Card>
              )
            })}
          </div>

          {submitError && (
            <Alert tone="error" description={submitError} className="justify-center text-center" />
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              className="px-8"
              disabled={!selected || submitting}
              loading={submitting}
              onClick={handleConfirm}
            >
              {t('chooseTrainer.buttonChoose')}
            </Button>
          </div>
        </section>
      )}
    </Page>
  )
}

