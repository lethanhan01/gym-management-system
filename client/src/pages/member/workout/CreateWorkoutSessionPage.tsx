import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell } from 'lucide-react'
import { MemberPage, MemberPageHeader } from '@/components/MemberUI'
import { SessionConfigModal } from './create-session/SessionConfigModal'
import { SessionView } from './create-session/SessionView'
import { getSessionConfigKey } from './create-session/sessionTargets'
import { useCreateWorkoutSession } from './create-session/useCreateWorkoutSession'
import { WorkoutPlanList } from './create-session/WorkoutPlanList'

export default function CreateWorkoutSessionPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionPanelRef = useRef<HTMLDivElement | null>(null)
  const {
    assignments,
    fullPlans,
    loading,
    error,
    selectedDay,
    sets,
    submitting,
    submitError,
    done,
    preselectionNotice,
    configTarget,
    configInitialTargets,
    load,
    startDay,
    openSessionConfig,
    closeSessionConfig,
    saveSessionTargets,
    updateSet,
    finishSession,
  } = useCreateWorkoutSession(searchParams.get('sessionId'))

  function handleStartDay(...args: Parameters<typeof startDay>) {
    startDay(...args)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.requestAnimationFrame(() => {
        sessionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('workout.createSession.eyebrow')}
        title={t('workout.createSession.title')}
        description={t('workout.createSession.description')}
      />
      {preselectionNotice && (
        <div className="mb-5 rounded-xl p-4 text-sm rogym-sx-a15e2a7c" role="status">
          {preselectionNotice}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <WorkoutPlanList
            assignments={assignments}
            fullPlans={fullPlans}
            loading={loading}
            error={error}
            onRetry={load}
            onCreatePlan={() => navigate('/member/workout/builder')}
            onStartDay={handleStartDay}
            onEditDay={openSessionConfig}
          />
        </div>

        <div ref={sessionPanelRef} className="scroll-mt-4">
          {!selectedDay ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[20px] p-6 text-center rogym-sx-25952519">
              <Dumbbell size={36} className="rogym-sx-ed519d00" />
              <p className="text-sm font-medium text-white">{t('workout.createSession.placeholderTitle')}</p>
              <p className="text-xs rogym-sx-5e5c39ab">{t('workout.createSession.placeholderHint')}</p>
            </div>
          ) : (
            <SessionView
              day={selectedDay}
              sets={sets}
              onUpdateSet={updateSet}
              onFinish={() => void finishSession()}
              submitting={submitting}
              submitError={submitError}
              done={done}
            />
          )}
        </div>
      </div>
      {configTarget && (
        <SessionConfigModal
          key={getSessionConfigKey(configTarget.day, configTarget.assignment)}
          day={configTarget.day}
          initialTargets={configInitialTargets}
          onClose={closeSessionConfig}
          onSave={saveSessionTargets}
        />
      )}
    </MemberPage>
  )
}
