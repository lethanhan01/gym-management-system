import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  FastForward,
  Minimize2,
  Pause,
  Play,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import type { WorkoutPlanDay } from '@/services/workout.service'
import type { SessionTimerRuntime } from './sessionDraft'
import { formatTimer } from './sessionTimer'

function parseInstructions(input: unknown): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean)
        }
      } catch {
        // fallback to split
      }
    }
    return trimmed.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

interface WorkoutFocusModalProps {
  open: boolean
  onClose: () => void
  runtime: SessionTimerRuntime | null
  status: 'idle' | 'running' | 'paused' | 'saving' | 'completed' | 'save-error'
  day: WorkoutPlanDay
  onPause: () => void
  onResume: () => void
  onSkipRest: () => void
  celebrationSeconds: number | null
}

export function WorkoutFocusModal({
  open,
  onClose,
  runtime,
  status,
  day,
  onPause,
  onResume,
  onSkipRest,
  celebrationSeconds,
}: WorkoutFocusModalProps) {
  const { t } = useTranslation('member')

  if (!open) return null

  // Celebration state when workout finishes
  if (celebrationSeconds !== null) {
    const progressPercent = Math.max(0, Math.min(100, ((5 - celebrationSeconds) / 5) * 100))
    return (
      <Modal
        open={open}
        title={t('workout.createSession.celebrationTitle')}
        onClose={onClose}
        size="lg"
        footer={
          <Button variant="primary" onClick={onClose}>
            {t('workout.createSession.celebrationCloseNow')}
          </Button>
        }
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-400/30 animate-pulse">
            <CheckCircle2 size={44} className="animate-bounce" />
            <Sparkles size={20} className="absolute -top-1 -right-1 text-amber-300 animate-spin" />
          </div>

          <h3 className="text-xl font-bold text-white sm:text-2xl">
            {t('workout.createSession.celebrationTitle')}
          </h3>

          <p className="mt-2 text-sm text-white/70 max-w-md">
            {t('workout.createSession.celebrationSubtitle', { seconds: celebrationSeconds })}
          </p>

          <div className="mt-6 w-full max-w-xs overflow-hidden rounded-full bg-white/10 h-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Modal>
    )
  }

  if (!runtime) return null

  const segment = runtime.segments[runtime.segmentIndex]
  if (!segment) return null

  const isRest = segment.kind === 'rest'
  const isRunning = status === 'running'
  const isPaused = status === 'paused'

  // Current exercise matching this segment
  const currentPlanExercise = day.exercises?.find(
    (e) => e.planExerciseId === segment.planExerciseId
  )
  const currentConfig = runtime.config[segment.planExerciseId]
  const currentSets = currentConfig?.sets ?? []
  const currentSetConfig = currentSets[segment.setIndex]
  const isCardio = currentPlanExercise?.exercise?.bodyPart?.name?.trim().toLowerCase() === 'cardio'
  const exerciseName =
    currentPlanExercise?.exercise?.name ?? t('workout.session.defaultExerciseName')
  const instructions = parseInstructions(currentPlanExercise?.exercise?.instructions)

  // Next segment info for rest period
  const nextSegment = runtime.segments[runtime.segmentIndex + 1]
  const nextPlanExercise = nextSegment
    ? day.exercises?.find((e) => e.planExerciseId === nextSegment.planExerciseId)
    : null
  const nextExerciseName =
    nextPlanExercise?.exercise?.name ?? t('workout.session.defaultExerciseName')

  // Progress percentage for current segment
  const segmentDuration = segment.durationSec > 0 ? segment.durationSec : 1
  const segmentRemaining = runtime.segmentRemainingSec
  const segmentProgress = Math.max(0, Math.min(100, (segmentRemaining / segmentDuration) * 100))

  return (
    <Modal
      open={open}
      title={t('workout.createSession.focusModalTitle')}
      onClose={onClose}
      size="xl"
      headerActions={
        <Button
          variant="icon"
          size="sm"
          onClick={onClose}
          aria-label={t('workout.createSession.focusMinimize')}
          title={t('workout.createSession.focusMinimize')}
        >
          <Minimize2 size={16} />
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Top bar: Session Status & Total Remaining */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isRest
                  ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-300/30'
                  : isRunning
                  ? 'bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-300/30'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {isRest ? (
                <>
                  <Clock size={12} />
                  {t('workout.createSession.focusStatusRest')}
                </>
              ) : isRunning ? (
                <>
                  <Zap size={12} className="fill-current" />
                  {t('workout.createSession.focusStatusRunning')}
                </>
              ) : (
                <>
                  <Pause size={12} />
                  {t('workout.createSession.focusStatusPaused')}
                </>
              )}
            </span>
            <span className="text-xs text-white/50">{day.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-white/60">
              {t('workout.createSession.timeRemaining')}:
            </span>
            <span className="text-base font-bold tabular-nums text-white">
              {formatTimer(runtime.totalRemainingSec)}
            </span>
          </div>
        </div>

        {/* Active Segment Display */}
        {isRest ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <Clock size={20} />
              <h4 className="text-base font-semibold uppercase tracking-wider">
                {t('workout.createSession.focusRestTitle')}
              </h4>
            </div>

            <div className="my-4 text-5xl font-black tabular-nums tracking-tight text-white sm:text-6xl">
              {formatTimer(segmentRemaining)}
            </div>

            <div className="mx-auto mb-4 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-amber-400 transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${segmentProgress}%` }}
              />
            </div>

            {/* Controls right under countdown */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
              {isRunning && (
                <Button
                  variant="outline-white"
                  size="sm"
                  className="border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 hover:text-white"
                  onClick={onPause}
                  leftIcon={<Pause size={15} />}
                >
                  {t('workout.createSession.buttonStopWorkout')}
                </Button>
              )}
              {isPaused && (
                <Button
                  variant="outline-white"
                  size="sm"
                  className="border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 hover:text-white"
                  onClick={onResume}
                  leftIcon={<Play size={15} />}
                >
                  {t('workout.createSession.buttonResumeWorkout')}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={onSkipRest}
                leftIcon={<FastForward size={15} />}
              >
                {t('workout.createSession.buttonSkipRest')}
              </Button>
            </div>

            {nextSegment && (
              <p className="text-sm text-amber-200/80">
                {t('workout.createSession.focusNextSet', {
                  exercise: nextExerciseName,
                  setNumber: nextSegment.setIndex + 1,
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-cyan-300">
              <Dumbbell size={20} />
              <h4 className="text-base font-bold text-white sm:text-lg">
                {exerciseName}
              </h4>
            </div>

            <p className="mt-1 text-xs text-cyan-200/80 sm:text-sm">
              Set {segment.setIndex + 1} / {currentSets.length}
              {currentSetConfig && (
                <>
                  {' · '}
                  {isCardio
                    ? `${currentSetConfig.actualDurationSec || 60}s`
                    : `${currentSetConfig.actualReps || '—'} reps`}
                  {currentSetConfig.actualWeightKg ? ` · ${currentSetConfig.actualWeightKg} kg` : ''}
                </>
              )}
            </p>

            <div className="my-4 text-5xl font-black tabular-nums tracking-tight text-white sm:text-6xl">
              {formatTimer(segmentRemaining)}
            </div>

            <div className="mx-auto h-2 max-w-md overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-cyan-300 transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${segmentProgress}%` }}
              />
            </div>

            {/* Controls right under countdown */}
            <div className="mt-4 flex items-center justify-center gap-3">
              {isRunning && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onPause}
                  leftIcon={<Pause size={15} />}
                >
                  {t('workout.createSession.buttonStopWorkout')}
                </Button>
              )}
              {isPaused && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onResume}
                  leftIcon={<Play size={15} />}
                >
                  {t('workout.createSession.buttonResumeWorkout')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Exercise Steps / Instructions */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Dumbbell size={15} className="text-cyan-400" />
            {t('workout.createSession.focusExerciseSteps')}: {exerciseName}
          </h5>

          {instructions && instructions.length > 0 ? (
            <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-white/80">
              {instructions.map((step, index) => (
                <li key={index} className="pl-1">
                  {step}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm italic text-white/50">
              {t('workout.createSession.focusNoSteps')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
