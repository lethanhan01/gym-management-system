import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Alert, Page, PageHeader } from '@/components/ui'
import { SessionConfigModal } from './create-session/SessionConfigModal'
import { useCreateWorkoutSession } from './create-session/useCreateWorkoutSession'
import { WorkoutPlanList } from './create-session/WorkoutPlanList'

export default function CreateWorkoutSessionPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    assignments,
    fullPlans,
    loading,
    error,
    preselectionNotice,
    configTarget,
    configInitialConfig,
    load,
    startDay,
    openSessionConfig,
    closeSessionConfig,
    saveSessionConfig,
  } = useCreateWorkoutSession(searchParams.get('sessionId'))

  return (
    <Page>
      <PageHeader
        eyebrow={t('workout.createSession.eyebrow')}
        title={t('workout.createSession.title')}
        description={t('workout.createSession.description')}
      />
      {preselectionNotice && (
        <Alert tone="info" description={preselectionNotice} role="status" className="mb-5" />
      )}
      <main className="space-y-4">
        <WorkoutPlanList
          assignments={assignments}
          fullPlans={fullPlans}
          loading={loading}
          error={error}
          onRetry={load}
          onCreatePlan={() => navigate('/member/workout/builder')}
          onStartDay={startDay}
          onEditDay={openSessionConfig}
        />
      </main>
      {configTarget && (
        <SessionConfigModal
          key={`${configTarget.assignment.assignmentId}:${configTarget.day.planDayId}`}
          day={configTarget.day}
          initialConfig={configInitialConfig}
          onClose={closeSessionConfig}
          onSave={saveSessionConfig}
        />
      )}
    </Page>
  )
}

