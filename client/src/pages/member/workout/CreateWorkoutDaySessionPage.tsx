import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Clock, Pause, Play, RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { MemberErrorState, MemberPage, MemberPageHeader, MemberSkeleton } from '@/components/MemberUI'
import { getApiError } from '@/lib/api-error'
import workoutService, { type WorkoutAssignmentSummary, type WorkoutPlanDay } from '@/services/workout.service'
import { trainingService } from '@/services/training.service'
import { useAuthStore } from '@/stores/authStore'
import {
  clearSessionDraft, clearSessionRuntime, loadSessionDraft, loadSessionRuntime, saveSessionRuntime,
  type SessionTimerRuntime,
} from './create-session/sessionDraft'
import { makeSessionDayConfig } from './create-session/sessionTargets'
import { buildSessionTimeline, createCompletionKey, formatTimer, type TimerSegment } from './create-session/sessionTimer'
import type { SessionDayConfig } from './create-session/types'

type LoadedSession = {
  assignment: WorkoutAssignmentSummary
  day: WorkoutPlanDay
  planName: string
  config: SessionDayConfig
}

type TimerStatus = 'idle' | 'running' | 'paused' | 'saving' | 'completed' | 'save-error'

function isPositiveId(value: string | null | undefined) {
  return !!value && /^[1-9]\d*$/.test(value)
}

function toOptionalNumber(value: string) {
  if (value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function isMobile() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 767px)').matches
}

function reduceRunningRuntime(runtime: SessionTimerRuntime, now: number, deadline: number) {
  let segmentIndex = runtime.segmentIndex
  let segmentDeadline = deadline
  while (segmentIndex < runtime.segments.length && now >= segmentDeadline) {
    segmentIndex += 1
    if (segmentIndex < runtime.segments.length) segmentDeadline += runtime.segments[segmentIndex].durationSec * 1000
  }
  if (segmentIndex >= runtime.segments.length) {
    return { runtime: { ...runtime, segmentIndex, segmentRemainingSec: 0, totalRemainingSec: 0 }, deadline: segmentDeadline, complete: true }
  }
  const segmentRemainingSec = Math.max(0, Math.ceil((segmentDeadline - now) / 1000))
  const followingSeconds = runtime.segments.slice(segmentIndex + 1).reduce((sum, segment) => sum + segment.durationSec, 0)
  return {
    runtime: { ...runtime, segmentIndex, segmentRemainingSec, totalRemainingSec: segmentRemainingSec + followingSeconds },
    deadline: segmentDeadline,
    complete: false,
  }
}

function RestBreak({ segment, active, completed, remainingSec }: { segment: TimerSegment; active: boolean; completed: boolean; remainingSec: number }) {
  const { t } = useTranslation('member')
  const label = active
    ? t('workout.createSession.restRemaining', { seconds: remainingSec })
    : t('workout.createSession.restBreak', { seconds: segment.durationSec })
  return (
    <div className={`my-3 rounded-lg px-3 py-2 ${active ? 'bg-amber-400/15 ring-1 ring-amber-300/30' : 'bg-white/[0.04]'} ${completed ? 'opacity-55' : ''}`} aria-label={label}>
      <div className="flex items-center justify-between text-xs rogym-sx-5e5c39ab">
        <span>{active ? t('workout.createSession.restRunning', { seconds: remainingSec }) : label}</span>
        <Clock size={13} aria-hidden="true" />
      </div>
      {active && <div className="mt-2 h-1 overflow-hidden rounded bg-white/10"><div className="h-full bg-amber-300 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.max(0, Math.min(100, (remainingSec / segment.durationSec) * 100))}%` }} /></div>}
    </div>
  )
}

export default function CreateWorkoutDaySessionPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const { planDayId } = useParams()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const memberId = user?.memberId ? String(user.memberId) : null
  const assignmentId = searchParams.get('assignmentId')
  const requestedSessionId = searchParams.get('sessionId')
  const sessionId = isPositiveId(requestedSessionId) ? requestedSessionId : null
  const queryIsValid = isPositiveId(planDayId) && isPositiveId(assignmentId)
    && (requestedSessionId === null || sessionId !== null)

  const [loaded, setLoaded] = useState<LoadedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [runtime, setRuntime] = useState<SessionTimerRuntime | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null)
  const runtimeRef = useRef<SessionTimerRuntime | null>(null)
  const deadlineRef = useRef<number | null>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const previousExerciseRef = useRef<string | null>(null)

  const persistRuntime = useCallback((next: SessionTimerRuntime) => {
    runtimeRef.current = next
    setRuntime(next)
    if (loaded && memberId) saveSessionRuntime(memberId, loaded.day, loaded.assignment, sessionId, next)
  }, [loaded, memberId, sessionId])

  const load = useCallback(async () => {
    if (!queryIsValid || !memberId || !assignmentId || !planDayId) {
      setError(t('workout.createSession.invalidDayLink'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const assignments = await workoutService.getAssignments(memberId)
      const assignment = assignments.find((item) => item.assignmentId === assignmentId && item.status === 'active')
      if (!assignment) {
        setError(t('workout.createSession.invalidDayLink'))
        return
      }
      if (sessionId) {
        const session = await trainingService.getSession(sessionId)
        if (session.assignmentId !== assignmentId || session.planDayId !== planDayId) {
          setError(t('workout.createSession.invalidDayLink'))
          return
        }
      }
      const plan = await workoutService.getPlan(assignment.planId)
      const day = plan.days?.find((item) => item.planDayId === planDayId)
      if (!day) {
        setError(t('workout.createSession.invalidDayLink'))
        return
      }
      const restored = loadSessionRuntime(memberId, day, assignment, sessionId)
      const nextLoaded = { assignment, day, planName: plan.name, config: restored?.config ?? makeSessionDayConfig(day, loadSessionDraft(memberId, day, assignment, sessionId)) }
      setLoaded(nextLoaded)
      if (restored) {
        const recovered = restored.status === 'saving' ? { ...restored, status: 'save-error' as const } : restored
        runtimeRef.current = recovered
        setRuntime(recovered)
        setStatus(recovered.status)
      } else {
        runtimeRef.current = null
        setRuntime(null)
        setStatus('idle')
      }
    } catch (caught) {
      setError(getApiError(caught, t('workout.createSession.errorLoad')))
    } finally {
      setLoading(false)
    }
  }, [assignmentId, memberId, planDayId, queryIsValid, sessionId, t])

  useEffect(() => { void load() }, [load])

  const saveLog = useCallback(async (source: SessionTimerRuntime) => {
    if (!loaded || !memberId) return
    const exercises = [...(loaded.day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
    const sets = exercises.flatMap((exercise) => (source.config[exercise.planExerciseId]?.sets ?? []).map((set, index) => ({
      planExerciseId: Number(exercise.planExerciseId), setNumber: index + 1,
      actualReps: toOptionalNumber(set.actualReps), actualWeightKg: toOptionalNumber(set.actualWeightKg),
      actualDurationSec: toOptionalNumber(set.actualDurationSec), completed: true,
    })))
    if (sets.length === 0) {
      setSubmitError(t('workout.createSession.emptyConfiguredSets'))
      setStatus('save-error')
      persistRuntime({ ...source, status: 'save-error' })
      return
    }
    const saving = { ...source, status: 'saving' as const, loggedAt: source.loggedAt ?? new Date().toISOString() }
    setStatus('saving')
    persistRuntime(saving)
    try {
      await workoutService.createLog({
        assignmentId: Number(loaded.assignment.assignmentId), planDayId: Number(loaded.day.planDayId),
        loggedAt: saving.loggedAt, durationMin: Math.ceil(source.segments.reduce((sum, segment) => sum + segment.durationSec, 0) / 60),
        clientCompletionKey: saving.completionKey, sets,
      })
      clearSessionDraft(memberId, loaded.day, loaded.assignment, sessionId)
      clearSessionRuntime(memberId, loaded.day, loaded.assignment, sessionId)
      runtimeRef.current = null
      setRuntime(null)
      setStatus('completed')
    } catch (caught) {
      const failed = { ...saving, status: 'save-error' as const }
      setSubmitError(getApiError(caught, t('workout.createSession.errorSave')))
      setStatus('save-error')
      persistRuntime(failed)
    }
  }, [loaded, memberId, persistRuntime, sessionId, t])

  const pauseTimer = useCallback(() => {
    const current = runtimeRef.current
    if (!current || current.status !== 'running') return
    const reduced = reduceRunningRuntime(current, Date.now(), deadlineRef.current ?? Date.now())
    const paused = { ...reduced.runtime, status: 'paused' as const }
    deadlineRef.current = null
    setStatus('paused')
    persistRuntime(paused)
  }, [persistRuntime])

  useEffect(() => {
    if (status !== 'running') return
    const initialRuntime = runtimeRef.current
    if (!initialRuntime) return
    if (deadlineRef.current === null) deadlineRef.current = Date.now() + initialRuntime.segmentRemainingSec * 1000
    const tick = () => {
      const current = runtimeRef.current
      if (!current || current.status !== 'running') return
      const reduced = reduceRunningRuntime(current, Date.now(), deadlineRef.current ?? Date.now())
      deadlineRef.current = reduced.deadline
      if (reduced.complete) {
        const completed = { ...reduced.runtime, status: 'saving' as const, loggedAt: new Date().toISOString() }
        setStatus('saving')
        persistRuntime(completed)
        void saveLog(completed)
      } else {
        persistRuntime(reduced.runtime)
      }
    }
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [persistRuntime, saveLog, status])

  useEffect(() => {
    const onPageHide = () => pauseTimer()
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [pauseTimer])

  useEffect(() => () => pauseTimer(), [pauseTimer])

  useEffect(() => {
    const segment = runtime?.segments[runtime.segmentIndex]
    if (!segment || segment.kind !== 'set' || !isMobile() || previousExerciseRef.current === segment.planExerciseId) return
    previousExerciseRef.current = segment.planExerciseId
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    cardRefs.current.get(segment.planExerciseId)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }, [runtime?.segmentIndex, runtime?.segments])

  function startTimer() {
    if (!loaded) return
    const timeline = buildSessionTimeline(loaded.day, loaded.config)
    if (timeline.segments.length === 0) {
      setSubmitError(t('workout.createSession.emptyConfiguredSets'))
      return
    }
    const started: SessionTimerRuntime = {
      version: 1, status: 'running', segments: timeline.segments, config: timeline.config, segmentIndex: 0,
      segmentRemainingSec: timeline.segments[0].durationSec, totalRemainingSec: timeline.totalSeconds,
      completionKey: createCompletionKey(), loggedAt: null,
    }
    setSubmitError(null)
    previousExerciseRef.current = null
    setStatus('running')
    persistRuntime(started)
  }

  function resumeTimer() {
    const current = runtimeRef.current
    if (!current) return
    setSubmitError(null)
    const resumed = { ...current, status: 'running' as const }
    setStatus('running')
    persistRuntime(resumed)
  }

  function requestLeave(target: string) {
    if (status === 'running') setLeaveTarget(target)
    else navigate(target)
  }

  function confirmLeave() {
    const target = leaveTarget
    pauseTimer()
    setLeaveTarget(null)
    if (target) navigate(target)
  }

  if (loading) return <MemberPage><MemberSkeleton rows={5} /></MemberPage>
  if (error || !loaded) {
    return <MemberPage><MemberErrorState message={error ?? t('workout.createSession.invalidDayLink')} onRetry={load} /></MemberPage>
  }
  const exercises = [...(loaded.day.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
  const activeSegment = runtime?.segments[runtime.segmentIndex]

  if (status === 'completed') {
    return (
      <MemberPage><div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[20px] p-6 text-center rogym-sx-25952519">
        <CheckCircle2 size={48} className="rogym-sx-b2fbf853" />
        <h2 className="text-xl font-bold text-white">{t('workout.createSession.completedTitle')}</h2>
        <p className="text-sm rogym-sx-d88f932f">{t('workout.createSession.completedDesc')}</p>
        <div className="flex gap-3"><button type="button" className="rogym-btn rogym-btn--outline-white" onClick={() => navigate('/member/workout/plan')}>{t('workout.createSession.buttonGoToPlan')}</button><button type="button" className="rogym-btn rogym-btn--primary" onClick={() => navigate('/member/workout/history')}>{t('workout.createSession.buttonViewHistory')}</button></div>
      </div></MemberPage>
    )
  }

  return (
    <MemberPage>
      <MemberPageHeader eyebrow={loaded.planName} title={loaded.day.name} description={t('workout.session.descriptionDay', { day: loaded.day.dayNumber, count: exercises.length })} />
      <button type="button" className="rogym-btn rogym-btn--outline-white mb-5" onClick={() => requestLeave('/member/workout/create-session')}><ArrowLeft size={15} /> {t('workout.createSession.buttonBackToDays')}</button>
      {runtime && <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-center"><p className="text-xs uppercase tracking-wider rogym-sx-5e5c39ab">{t('workout.createSession.timeRemaining')}</p><p className="mt-1 text-3xl font-bold tabular-nums text-white" aria-live="polite">{formatTimer(runtime.totalRemainingSec)}</p></div>}
      <div className="overflow-hidden rounded-[20px] rogym-sx-25952519"><div className="space-y-3 px-5 pb-4 pt-5">
        {exercises.map((exercise, exerciseIndex) => {
          const cardio = exercise.exercise?.bodyPart?.name?.trim().toLowerCase() === 'cardio'
          const config = (runtime?.config ?? loaded.config)[exercise.planExerciseId]
          const sets = config?.sets ?? []
          return <div key={exercise.planExerciseId} ref={(node) => { if (node) cardRefs.current.set(exercise.planExerciseId, node); else cardRefs.current.delete(exercise.planExerciseId) }} className="rogym-sx-46079668">
            <div className="flex items-center gap-3 px-4 py-3 rogym-sx-dd0d9e7c"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold rogym-sx-252b3c13">{exerciseIndex + 1}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{exercise.exercise?.name ?? t('workout.session.defaultExerciseName')}</p><p className="text-xs rogym-sx-5e5c39ab">{t('workout.createSession.configuredSets', { count: sets.length })}</p></div></div>
            <div className="p-4"><div className="mb-2 grid grid-cols-[40px_1fr_1fr] gap-2 text-xs font-medium uppercase rogym-sx-5e5c39ab"><span>Set</span><span>{cardio ? t('workout.createSession.unitSeconds') : 'Reps'}</span><span>Kg</span></div><div className="space-y-2">
              {sets.map((set, setIndex) => {
                const setSegmentIndex = runtime?.segments.findIndex((segment) => segment.kind === 'set' && segment.planExerciseId === exercise.planExerciseId && segment.setIndex === setIndex) ?? -1
                const isActive = activeSegment?.kind === 'set' && activeSegment.planExerciseId === exercise.planExerciseId && activeSegment.setIndex === setIndex
                const isCompleted = runtime !== null && setSegmentIndex >= 0 && setSegmentIndex < runtime.segmentIndex
                const nextSegment = runtime?.segments[setSegmentIndex + 1]
                const upcomingConfig = setIndex < sets.length - 1
                  ? config
                  : (runtime?.config ?? loaded.config)[exercises[exerciseIndex + 1]?.planExerciseId]
                const initialRest = setIndex < sets.length - 1 || exerciseIndex < exercises.length - 1
                  ? Math.max(0, upcomingConfig?.restSeconds ?? 0)
                  : 0
                const displayRest = nextSegment?.kind === 'rest'
                  ? nextSegment
                  : (!runtime && initialRest > 0 ? { kind: 'rest' as const, durationSec: initialRest, planExerciseId: exercise.planExerciseId, setIndex } : undefined)
                const isRestAfter = !!displayRest
                const restActive = isRestAfter && runtime?.segmentIndex === setSegmentIndex + 1
                const restCompleted = isRestAfter && (runtime?.segmentIndex ?? -1) > setSegmentIndex + 1
                return <Fragment key={setIndex}><div className={`grid grid-cols-[40px_1fr_1fr] items-center gap-2 rounded-lg p-2 text-sm ${isActive ? 'bg-cyan-400/15 ring-1 ring-cyan-300/40' : 'bg-white/[0.03]'} ${isCompleted ? 'opacity-55' : ''}`}><span className="rogym-workout-set-index font-medium">{setIndex + 1}</span><span className="text-white">{cardio ? set.actualDurationSec : set.actualReps || '—'}{isActive && <span className="ml-2 text-xs text-cyan-200">{formatTimer(runtime?.segmentRemainingSec ?? 0)}</span>}</span><span className="text-white">{set.actualWeightKg || '—'}</span>{isActive && activeSegment && <div className="col-span-3 mt-1 h-1 overflow-hidden rounded bg-white/10"><div className="h-full bg-cyan-300 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.max(0, Math.min(100, ((runtime?.segmentRemainingSec ?? 0) / activeSegment.durationSec) * 100))}%` }} /></div>}</div>{isRestAfter && displayRest && <RestBreak segment={displayRest} active={!!restActive} completed={!!restCompleted} remainingSec={restActive ? runtime?.segmentRemainingSec ?? 0 : displayRest.durationSec} />}</Fragment>
              })}
            </div></div>
          </div>
        })}
      </div>
      {submitError && <p className="px-5 pb-2 text-center text-xs text-red-300">{submitError}</p>}
      <div className="rogym-sx-8553bf9e flex items-center justify-end gap-3 px-5 py-4">
        {status === 'idle' && <button type="button" className="rogym-btn rogym-btn--primary" onClick={startTimer}><Play size={15} /> {t('workout.createSession.buttonStartWorkout')}</button>}
        {status === 'running' && <button type="button" className="rogym-btn rogym-btn--primary" onClick={pauseTimer}><Pause size={15} /> {t('workout.createSession.buttonStopWorkout')}</button>}
        {status === 'paused' && <button type="button" className="rogym-btn rogym-btn--primary" onClick={resumeTimer}><Play size={15} /> {t('workout.createSession.buttonResumeWorkout')}</button>}
        {status === 'saving' && <button type="button" className="rogym-btn rogym-btn--primary" disabled>{t('workout.createSession.buttonSaving')}</button>}
        {status === 'save-error' && <button type="button" className="rogym-btn rogym-btn--primary" onClick={() => runtimeRef.current && void saveLog(runtimeRef.current)}><RotateCcw size={15} /> {t('workout.createSession.buttonRetrySave')}</button>}
      </div></div>
      <Modal open={leaveTarget !== null} title={t('workout.createSession.leaveTimerTitle')} onClose={() => setLeaveTarget(null)} footer={<><button type="button" className="rogym-btn rogym-btn--outline-white" onClick={() => setLeaveTarget(null)}>{t('workout.createSession.buttonContinueWorkout')}</button><button type="button" className="rogym-btn rogym-btn--primary" onClick={confirmLeave}>{t('workout.createSession.buttonStopAndLeave')}</button></>}><p className="text-sm rogym-sx-d88f932f">{t('workout.createSession.leaveTimerDescription')}</p></Modal>
    </MemberPage>
  )
}
