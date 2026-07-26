import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { ArrowLeft, Calculator } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DatePickerInput } from '@/components/DatePickerInput'
import { getApiError } from '@/lib/api-error'
import { todayInput } from '@/lib/date'
import { memberService, type TrainerStudentDetail } from '@/services/member.service'
import {
  SubmitButton,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import { toast } from 'sonner'

export default function AddProgressPage() {
  const { t } = useTranslation('trainer')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState<TrainerStudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState('')
  const [notes, setNotes] = useState('')
  const [recordedAt, setRecordedAt] = useState(todayInput())

  useEffect(() => {
    memberService
      .getById(id)
      .then(setStudent)
      .catch((err) => setError(getApiError(err, t('students.addProgress.error.loadFailed'))))
      .finally(() => setLoading(false))
  }, [id, t])

  const bmi = useMemo(() => {
    const weightValue = Number(weight)
    const heightValue = Number(height)
    if (weightValue <= 0 || heightValue <= 0) return null
    return weightValue / (heightValue / 100) ** 2
  }, [weight, height])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const weightValue = Number(weight)
    if (!(weightValue > 0 && weightValue <= 500)) {
      setError(t('students.addProgress.error.invalidWeight'))
      return
    }
    if (bmi !== null && (bmi < 10 || bmi > 50)) {
      setError(t('students.addProgress.error.invalidBmi'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      const recordedAtIso =
        recordedAt === todayInput()
          ? new Date().toISOString()
          : new Date(`${recordedAt}T12:00:00+07:00`).toISOString()
      await memberService.createProgress(id, {
        weight: weightValue,
        bmi: bmi ? Number(bmi.toFixed(2)) : undefined,
        goal: goal.trim() || undefined,
        notes: notes.trim() || undefined,
        recordedAt: recordedAtIso,
      })
      navigate(`/trainer/students/${id}?tab=progress`, { replace: true })
    } catch (err) {
      toast.error(getApiError(err, t('students.addProgress.error.saveFailed')), {
        action: { label: t('button.retry', { defaultValue: 'Thử lại' }), onClick: handleSubmit },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TrainerPage className="max-w-3xl">
      <TrainerPageHeader
        eyebrow={t('students.addProgress.eyebrow')}
        title={
          student
            ? t('students.addProgress.titleWith', { name: student.fullName })
            : t('students.addProgress.title')
        }
        actions={
          <ButtonLink
            variant="text-muted"
            to={`/trainer/students/${id}?tab=progress`}
          >
            <ArrowLeft size={15} /> {t('students.addProgress.back')}
          </ButtonLink>
        }
      />
      {loading ? (
        <TrainerSkeleton rows={3} />
      ) : error && !student ? (
        <TrainerErrorState message={error} />
      ) : (
        <form className="rogym-card rogym-card--compact space-y-5 p-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="rogym-field-label">{t('students.addProgress.fieldDate')}</span>
              <DatePickerInput
                value={recordedAt}
                onChange={(value) => setRecordedAt(value)}
                max={todayInput()}
              />
            </label>
            <label className="space-y-2">
              <span className="rogym-field-label">{t('students.addProgress.fieldWeight')}</span>
              <input
                className="rogym-input"
                type="number"
                min="0.1"
                max="500"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="rogym-field-label">{t('students.addProgress.fieldHeight')}</span>
              <input
                className="rogym-input"
                type="number"
                min="80"
                max="250"
                step="0.1"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
              />
            </label>
            <div className="rounded-xl border border-[var(--rogym-border-teal-dim)] bg-[rgba(66,224,158,0.06)] p-4">
              <div className="flex items-center gap-2 text-sm rogym-text-secondary">
                <Calculator size={16} className="rogym-text-accent" /> {t('students.addProgress.bmiLabel')}
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {bmi ? bmi.toFixed(2) : '--'}
              </div>
              <div className="mt-1 text-xs rogym-text-dim">
                {t('students.addProgress.bmiNote')}
              </div>
            </div>
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('students.addProgress.fieldGoal')}</span>
            <input
              className="rogym-input"
              value={goal}
              maxLength={255}
              onChange={(event) => setGoal(event.target.value)}
              placeholder={t('students.addProgress.goalPlaceholder')}
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('students.addProgress.fieldNotes')}</span>
            <textarea
              className="rogym-input min-h-32 resize-y"
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-3">
            <ButtonLink
              variant="outline-white"
              to={`/trainer/students/${id}?tab=progress`}
            >
              {t('students.addProgress.cancel')}
            </ButtonLink>
            <SubmitButton loading={saving}>{t('students.addProgress.submit')}</SubmitButton>
          </div>
        </form>
      )}
    </TrainerPage>
  )
}
