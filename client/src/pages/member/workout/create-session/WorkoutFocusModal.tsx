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
  const currentGifUrl =
    currentPlanExercise?.exercise?.gifUrl || currentPlanExercise?.exercise?.imageUrl
  const instructions = parseInstructions(currentPlanExercise?.exercise?.instructions)

  // Next segment info for rest period
  const nextSegment = runtime.segments[runtime.segmentIndex + 1]
  const nextPlanExercise = nextSegment
    ? day.exercises?.find((e) => e.planExerciseId === nextSegment.planExerciseId)
    : null
  const nextExerciseName =
    nextPlanExercise?.exercise?.name ?? t('workout.session.defaultExerciseName')
  const nextGifUrl =
    nextPlanExercise?.exercise?.gifUrl || nextPlanExercise?.exercise?.imageUrl

  // Progress percentage for current segment
  const segmentDuration = segment.durationSec > 0 ? segment.durationSec : 1
  const segmentRemaining = runtime.segmentRemainingSec
  const segmentProgress = Math.max(0, Math.min(100, (segmentRemaining / segmentDuration) * 100))

  return (
    <Modal
      open={open}
      title={
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
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
          <span className="truncate text-sm sm:text-base font-bold text-white max-w-[200px] sm:max-w-xs">
            {day.name}
          </span>
        </div>
      }
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      bodyClassName="p-2 sm:p-3"
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
      <div className="space-y-3.5 sm:space-y-4">
        {/* Active Segment Display */}
        {isRest ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 sm:p-4 text-center">
            <div className="flex flex-col items-center gap-1 text-center mb-1.5">
              <div className="flex items-center justify-center gap-1.5 text-amber-300">
                <Clock size={18} className="shrink-0" />
                <h4 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-amber-300">
                  {t('workout.createSession.focusRestTitle')}
                </h4>
              </div>
              <div className="text-xs font-semibold text-white/70">
                {t('workout.createSession.timeRemaining')}:{' '}
                <span className="tabular-nums font-bold text-white">
                  {formatTimer(runtime.totalRemainingSec)}
                </span>
              </div>
            </div>

            {nextGifUrl && (
              <div className="my-2 flex justify-center">
                <div className="w-full max-w-md overflow-hidden rounded-xl border border-amber-400/30 bg-black/40 p-1">
                  <img
                    src={nextGifUrl}
                    alt={nextExerciseName}
                    className="max-h-64 sm:max-h-72 w-full object-contain rounded-lg mx-auto"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {/* Integrated Countdown Progress Bar */}
            <div className="relative mx-auto my-3 h-11 sm:h-12 w-full max-w-md overflow-hidden rounded-xl border border-amber-400/30 bg-white/10">
              <div
                className="h-full bg-amber-400 transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${segmentProgress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {formatTimer(segmentRemaining)}
              </div>
            </div>

            {/* Controls right under countdown */}
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
              {isRunning && (
                <Button
                  variant="outline-white"
                  size="sm"
                  className="border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 hover:text-white"
                  onClick={onPause}
                  leftIcon={<Pause size={14} />}
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
                  leftIcon={<Play size={14} />}
                >
                  {t('workout.createSession.buttonResumeWorkout')}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={onSkipRest}
                leftIcon={<FastForward size={14} />}
              >
                {t('workout.createSession.buttonSkipRest')}
              </Button>
            </div>

            {nextSegment && (
              <p className="text-xs text-amber-200/80 mt-1">
                {t('workout.createSession.focusNextSet', {
                  exercise: nextExerciseName,
                  setNumber: nextSegment.setIndex + 1,
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3.5 sm:p-4 text-center">
            <div className="flex flex-col items-center gap-1 text-center mb-1.5">
              <div className="flex items-center justify-center gap-1.5 text-cyan-300">
                <Dumbbell size={18} className="shrink-0" />
                <h4 className="text-base sm:text-lg font-bold text-white break-words">
                  {exerciseName}
                </h4>
              </div>
              <div className="text-xs font-semibold text-white/70">
                {t('workout.createSession.timeRemaining')}:{' '}
                <span className="tabular-nums font-bold text-white">
                  {formatTimer(runtime.totalRemainingSec)}
                </span>
              </div>
            </div>

            <p className="text-xs text-cyan-200/80">
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

            {currentGifUrl && (
              <div className="my-2 flex justify-center">
                <div className="w-full max-w-md overflow-hidden rounded-xl border border-cyan-400/30 bg-black/40 p-1">
                  <img
                    src={currentGifUrl}
                    alt={exerciseName}
                    className="max-h-64 sm:max-h-72 w-full object-contain rounded-lg mx-auto"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {/* Integrated Countdown Progress Bar */}
            <div className="relative mx-auto my-3 h-11 sm:h-12 w-full max-w-md overflow-hidden rounded-xl border border-cyan-400/30 bg-white/10">
              <div
                className="h-full bg-cyan-400 transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${segmentProgress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {formatTimer(segmentRemaining)}
              </div>
            </div>

            {/* Controls right under countdown */}
            <div className="mt-2 flex items-center justify-center gap-2">
              {isRunning && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onPause}
                  leftIcon={<Pause size={14} />}
                >
                  {t('workout.createSession.buttonStopWorkout')}
                </Button>
              )}
              {isPaused && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onResume}
                  leftIcon={<Play size={14} />}
                >
                  {t('workout.createSession.buttonResumeWorkout')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Exercise Steps / Instructions */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
          <h5 className="mb-2 flex items-center gap-2 text-xs sm:text-sm font-semibold text-white">
            <Dumbbell size={14} className="text-cyan-400" />
            {t('workout.createSession.focusExerciseSteps')}: {exerciseName}
          </h5>

          {instructions && instructions.length > 0 ? (
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-white/80">
              {instructions.map((step, index) => (
                <li key={index} className="pl-0.5">
                  {step}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs italic text-white/50">
              {t('workout.createSession.focusNoSteps')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
