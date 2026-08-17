import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Scale, Activity, Dumbbell, Play } from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Page,
  PageErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  StatCard,
} from '@/components/ui'
import { memberProgressService, type MemberProgress } from '@/services/member-progress.service'
import { memberService } from '@/services/member.service'
import workoutService, { type WorkoutAssignmentSummary } from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'
import { getApiError } from '@/lib/api-error'
import { PageLoader } from '@/components/shared/Spinner'

const MemberWeightChart = lazy(() => import('@/components/charts/MemberWeightChart'))

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtDateShort(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function bmiLabel(bmi: number, t: TFunction<'member'>): string {
  if (bmi < 18.5) return t('progress.bmiLabel.underweight')
  if (bmi < 25) return t('progress.bmiLabel.normal')
  if (bmi < 30) return t('progress.bmiLabel.overweight')
  return t('progress.bmiLabel.obese')
}

function bmiTone(bmi: number): 'warning' | 'success' | 'danger' {
  if (bmi < 18.5) return 'warning'
  if (bmi < 25) return 'success'
  if (bmi < 30) return 'warning'
  return 'danger'
}

function computeBmi(weightKg: number, heightCm: number): number {
  const hm = heightCm / 100
  return Math.round((weightKg / (hm * hm)) * 10) / 10
}

function SelfReportForm({ onSuccess, t }: { onSuccess: () => void; t: TFunction<'member'> }) {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weightNum = parseFloat(weight)
  const heightNum = parseFloat(height)
  const previewBmi =
    !isNaN(weightNum) && weightNum > 0 && !isNaN(heightNum) && heightNum > 0
      ? computeBmi(weightNum, heightNum)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isNaN(weightNum) || weightNum <= 0) {
      setError(t('progress.errorInvalidWeight'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await memberService.recordSelfProgress({
        weight: weightNum,
        height: !isNaN(heightNum) && heightNum > 0 ? heightNum : undefined,
      })
      setWeight('')
      setHeight('')
      onSuccess()
    } catch (err) {
      setError(getApiError(err, t('progress.errorSave')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card as="article" variant="compact" className="p-5">
      <p className="text-sm font-semibold text-white mb-4">{t('progress.form.title')}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* trên mobile hiển thị 1 cột, từ sm trở lên 2 cột */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t('progress.form.fieldWeight')} required>
            <Input
              type="number"
              step="0.1"
              min="1"
              max="500"
              placeholder="Vd: 65.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t('progress.form.fieldHeight')}>
            <Input
              type="number"
              step="0.1"
              min="50"
              max="300"
              placeholder="Vd: 170"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </FormField>
        </div>

        {previewBmi != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="rogym-text-dim">{t('progress.form.bmiPreview')}</span>
            <span className="rogym-tone-text font-semibold" data-tone={bmiTone(previewBmi)}>
              {previewBmi.toFixed(1)} — {bmiLabel(previewBmi, t)}
            </span>
          </div>
        )}

        {error && <Alert tone="error" description={error} />}

        <Button
          type="submit"
          disabled={submitting}
          loading={submitting}
          variant="primary"
          size="sm"
          className="self-start"
        >
          {t('progress.form.buttonSave')}
        </Button>
      </form>
    </Card>
  )
}

export default function ProgressPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const memberId = useAuthStore((state) => state.user?.memberId)

  const RANGES = useMemo(
    () => [
      { label: '1T', days: 30 },
      { label: '3T', days: 90 },
      { label: '6T', days: 180 },
      { label: t('progress.rangeAll'), days: null as number | null },
    ],
    [t]
  )
  const [data, setData] = useState<MemberProgress[]>([])
  const [activeAssignment, setActiveAssignment] = useState<WorkoutAssignmentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeIdx, setRangeIdx] = useState(3)
  const [showForm, setShowForm] = useState(false)

  const loadProgress = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [progressData, assignmentData] = await Promise.all([
        memberProgressService.listProgress(String(memberId)),
        workoutService.getAssignments(String(memberId), { status: 'active' }).catch(() => []),
      ])
      setData(progressData)
      const ptAssigned = assignmentData.find((a) => a.status === 'active' && !!a.assignedByStaffId)
      const active = ptAssigned || assignmentData.find((a) => a.status === 'active') || null
      setActiveAssignment(active)
    } catch (err) {
      setError(getApiError(err, t('progress.errorLoad')))
    } finally {
      setLoading(false)
    }
  }, [memberId, t])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const filtered = useMemo(() => {
    const days = RANGES[rangeIdx].days
    if (!days) return data
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return data.filter((d) => new Date(d.recordedAt) >= cutoff)
  }, [RANGES, data, rangeIdx])

  function handleFormSuccess() {
    setShowForm(false)
    void loadProgress()
  }

  const latest = data[0]
  const chartData = useMemo(
    () =>
      filtered
        .filter((entry): entry is MemberProgress & { weight: number } => entry.weight != null)
        .map((entry) => ({ date: fmtDateShort(entry.recordedAt), weight: entry.weight }))
        .reverse(),
    [filtered]
  )

  return (
    <Page>
      <PageHeader
        eyebrow={t('progress.eyebrow')}
        title={t('progress.pageTitle')}
        description={t('progress.description')}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 mt-1"
          >
            {showForm ? t('progress.buttonClose') : t('progress.buttonRecord')}
          </Button>
        }
      />

      {showForm && <SelfReportForm onSuccess={handleFormSuccess} t={t} />}

      {loading ? (
        <PageSkeleton rows={4} />
      ) : error ? (
        <PageErrorState message={error} onRetry={loadProgress} />
      ) : data.length === 0 && !activeAssignment ? (
        <>{!showForm && <SelfReportForm onSuccess={handleFormSuccess} t={t} />}</>
      ) : (
        <main className="space-y-5">
          {/* Workout Plan Progress Card */}
          {activeAssignment && activeAssignment.progress && (
            <Card as="article" variant="compact" className="p-5 border-[var(--rogym-green)]/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--rogym-green)]/10 text-[var(--rogym-green)]">
                    <Dumbbell size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={activeAssignment.assignedByStaffId ? 'success' : 'accent'} size="xs">
                        {activeAssignment.assignedByStaffId
                          ? t('workout.myPlan.sourceTrainer')
                          : t('workout.myPlan.sourcePersonal')}
                      </Badge>
                      <h3 className="text-base font-bold text-white truncate">
                        {activeAssignment.plan?.name ?? t('progress.activePlanTitle')}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs rogym-text-dim">
                      {t('progress.planProgressSection')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    variant="outline-white"
                    size="xs"
                    onClick={() => navigate('/member/workout/plan')}
                  >
                    {t('progress.buttonGoToPlan')}
                  </Button>
                  <Button
                    variant="primary"
                    size="xs"
                    leftIcon={<Play size={13} />}
                    onClick={() => navigate('/member/workout/create-session')}
                  >
                    {t('progress.buttonStartWorkout')}
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-white/80 font-medium">{t('workout.myPlan.progressLabel')}</span>
                  <span className="text-sm font-bold text-[var(--rogym-green)]">
                    {activeAssignment.progress.percentage}%
                  </span>
                </div>
                <ProgressBar
                  value={activeAssignment.progress.percentage}
                  tone="primary"
                  size="md"
                />

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white/[0.03] p-2">
                    <p className="text-[11px] rogym-text-dim">{t('workout.myPlan.unitExercises')}</p>
                    <p className="mt-0.5 font-bold text-white">
                      {t('progress.progressSets', {
                        completed: activeAssignment.progress.completedSets,
                        total: activeAssignment.progress.totalTargetSets,
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2">
                    <p className="text-[11px] rogym-text-dim">{t('workout.myPlan.unitDays')}</p>
                    <p className="mt-0.5 font-bold text-white">
                      {t('progress.progressDays', {
                        completed: activeAssignment.progress.completedDays,
                        total: activeAssignment.progress.totalDays,
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2">
                    <p className="text-[11px] rogym-text-dim">Sessions</p>
                    <p className="mt-0.5 font-bold text-white">
                      {t('progress.progressSessions', {
                        count: activeAssignment.progress.totalSessionsLogged,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Stat cards */}
          <section aria-label="Body stats" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={<Scale size={20} />}
              label={t('progress.statCurrentWeight')}
              value={latest?.weight != null ? `${latest.weight} kg` : '—'}
              hint={latest?.recordedAt ? t('progress.recordedAt', { date: fmtDate(latest.recordedAt) }) : undefined}
            />
            <StatCard
              icon={<Activity size={20} />}
              label={t('progress.statCurrentBmi')}
              value={latest?.bmi != null ? latest.bmi.toFixed(1) : '—'}
              hint={latest?.bmi != null ? bmiLabel(latest.bmi, t) : undefined}
            />
          </section>

          {/* Chart */}
          <Card as="article" variant="compact" className="p-5">
            <header className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{t('progress.chartTitle')}</p>
              <div className="flex gap-1">
                {RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setRangeIdx(i)}
                    className={`rogym-range-chip rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      rangeIdx === i ? 'is-active' : ''
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </header>
            {chartData.length < 2 ? (
              <p className="py-8 text-center text-sm rogym-sx-d88f932f">
                {t('progress.chartNeedMoreData')}
              </p>
            ) : (
              <Suspense fallback={<PageLoader minHeight="220px" />}>
                <MemberWeightChart data={chartData} />
              </Suspense>
            )}
          </Card>

          {/* History */}
          <Card as="article" variant="compact" className="p-5">
            <header className="mb-4">
              <h3 className="text-sm font-semibold text-white">{t('progress.historyTitle')}</h3>
            </header>
            <div className="divide-y divide-white/5">
              {filtered.map((entry) => (
                <div
                  key={entry.progressId}
                  className="rogym-list-row flex items-start justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium rogym-sx-d88f932f">
                      {fmtDate(entry.recordedAt)}
                    </p>
                    {entry.goal && <p className="mt-0.5 text-sm text-white">{entry.goal}</p>}
                    {entry.notes && (
                      <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">{entry.notes}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    {entry.weight != null && (
                      <p className="text-sm font-semibold text-white">{entry.weight} kg</p>
                    )}
                    {entry.height != null && (
                      <p className="text-xs rogym-sx-d88f932f mt-0.5">{entry.height} cm</p>
                    )}
                    {entry.bmi != null && (
                      <p className="rogym-tone-text text-xs mt-0.5" data-tone={bmiTone(entry.bmi)}>
                        BMI {entry.bmi.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </main>
      )}
    </Page>
  )
}

