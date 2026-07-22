import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { localDateTimeInputToIso, toDateTimeLocalInput } from '@/lib/date'
import { facilityService, type GymRoom } from '@/services/facility.service'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { trainingService } from '@/services/training.service'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
  type WorkoutPlanDay,
} from '@/services/workout.service'
import {
  StudentCombobox,
  SubmitButton,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import { DateTimePickerInput } from '@/components/DateTimePickerInput'

type PlanDayOption = Pick<
  WorkoutPlanDay,
  'planDayId' | 'dayNumber' | 'weekNumber' | 'dayOfWeek' | 'name'
>

export default function CreateSessionPage() {
  const { t } = useTranslation('trainer')
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [students, setStudents] = useState<TrainerStudentSummary[]>([])
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [activeAssignment, setActiveAssignment] = useState<WorkoutAssignmentSummary | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [memberId, setMemberId] = useState(searchParams.get('memberId') ?? '')
  const [roomId, setRoomId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedPlanDayId, setSelectedPlanDayId] = useState('')
  const [linkedPlanName, setLinkedPlanName] = useState<string | null>(null)
  const [linkedPlanDayName, setLinkedPlanDayName] = useState<string | null>(null)
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(true)
  const [editBlocked, setEditBlocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function formatPlanDayOption(day: PlanDayOption) {
    return t('sessions.create.planDayOptionFormat', {
      dayNumber: day.dayNumber,
      weekNumber: day.weekNumber,
      dayOfWeek: day.dayOfWeek,
      name: day.name,
    })
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [studentResult, roomResult, existingSession, planResult] = await Promise.all([
          memberService.list({ pageSize: 100 }),
          facilityService.listRooms(),
          id ? trainingService.getSession(id) : Promise.resolve(null),
          workoutService.getPlans(),
        ])
        if (!active) return
        setStudents(studentResult.data)
        setRooms(roomResult)
        setPlans(planResult.filter((plan) => plan.status === 'active'))
        if (existingSession) {
          setMemberId(existingSession.memberId)
          setRoomId(existingSession.roomId ?? '')
          setSelectedPlanDayId(existingSession.planDayId ?? '')
          setLinkedPlanName(existingSession.workoutPlan?.name ?? null)
          setLinkedPlanDayName(existingSession.planDay?.name ?? null)
          setStartTime(toDateTimeLocalInput(existingSession.startTime))
          setDuration(
            Math.max(
              1,
              Math.round(
                (new Date(existingSession.endTime).getTime() -
                  new Date(existingSession.startTime).getTime()) /
                  60000
              )
            )
          )
          if (
            existingSession.status !== 'scheduled' ||
            new Date(existingSession.startTime) <= new Date()
          ) {
            setEditBlocked(true)
            setError(t('sessions.create.error.editBlocked'))
          }
        }
      } catch (err) {
        setError(getApiError(err, t('sessions.create.error.loadFailed')))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id, t])

  useEffect(() => {
    if (editing || !memberId) {
      setActiveAssignment(null)
      setAssignmentError(null)
      setAssignmentLoading(false)
      if (!editing) {
        setSelectedPlanId('')
        setSelectedPlanDayId('')
      }
      return
    }

    let active = true
    setAssignmentLoading(true)
    setAssignmentError(null)
    setActiveAssignment(null)
    setSelectedPlanId('')
    setSelectedPlanDayId('')

    workoutService
      .getAssignments(memberId, { status: 'active', limit: 1 })
      .then((assignments) => {
        if (!active) return
        setActiveAssignment(assignments[0] ?? null)
      })
      .catch((err) => {
        if (!active) return
        setAssignmentError(getApiError(err, t('sessions.create.error.loadPlanFailed')))
      })
      .finally(() => {
        if (active) setAssignmentLoading(false)
      })

    return () => {
      active = false
    }
  }, [editing, memberId, t])

  const endTime = useMemo(() => {
    if (!startTime || duration <= 0) return ''
    const start = new Date(localDateTimeInputToIso(startTime))
    return new Date(start.getTime() + duration * 60000).toISOString()
  }, [duration, startTime])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.planId === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  )

  const planDayOptions: PlanDayOption[] = useMemo(() => {
    if (activeAssignment?.plan?.days) return activeAssignment.plan.days
    return selectedPlan?.days ?? []
  }, [activeAssignment, selectedPlan])

  const hasWorkoutPlanLink = editing
    ? true
    : Boolean(memberId) &&
      !assignmentLoading &&
      !assignmentError &&
      Boolean(selectedPlanDayId) &&
      (Boolean(activeAssignment) || Boolean(selectedPlanId))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!memberId || !roomId || !startTime || !endTime || !hasWorkoutPlanLink) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        roomId,
        startTime: localDateTimeInputToIso(startTime),
        endTime,
      }
      if (editing && id) {
        await trainingService.updateSession(id, payload)
      } else {
        let assignmentId = activeAssignment?.assignmentId ?? ''
        if (!assignmentId) {
          const assignment = await workoutService.assignPlan(memberId, {
            planId: Number(selectedPlanId),
            startDate: startTime.slice(0, 10),
          })
          assignmentId = assignment.assignmentId
        }
        await trainingService.createSession({
          ...payload,
          memberId,
          assignmentId,
          planDayId: selectedPlanDayId,
        })
      }
      navigate('/trainer/sessions')
    } catch (err) {
      setError(getApiError(err, t('sessions.create.error.saveFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <TrainerPage>
        <TrainerSkeleton rows={5} />
      </TrainerPage>
    )

  return (
    <TrainerPage className="max-w-3xl">
      <TrainerPageHeader
        eyebrow={t('sessions.create.eyebrow')}
        title={editing ? t('sessions.create.titleEdit') : t('sessions.create.title')}
        description={t('sessions.create.description')}
        actions={
          <Link
            className="rogym-btn rogym-btn--outline-white"
            to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
          >
            <ArrowLeft size={16} /> {t('sessions.create.back')}
          </Link>
        }
      />
      {error && <TrainerErrorState message={error} />}
      <form className="rogym-card rogym-card--compact space-y-5 p-6" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('sessions.create.fieldStudent')}</span>
          <StudentCombobox
            students={students}
            value={memberId}
            onChange={setMemberId}
            disabled={editing}
          />
        </label>
        {editing ? (
          <>
            <label className="block space-y-2">
              <span className="rogym-field-label">{t('sessions.create.fieldWorkoutPlan')}</span>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                {linkedPlanName ?? t('sessions.create.notLinked')}
              </div>
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">{t('sessions.create.fieldPlanDay')}</span>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                {linkedPlanDayName ?? t('sessions.create.noPlanDay')}
              </div>
            </label>
          </>
        ) : memberId ? (
          <>
            <label className="block space-y-2">
              <span className="rogym-field-label">{t('sessions.create.fieldWorkoutPlan')}</span>
              {assignmentLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm rogym-text-secondary">
                  {t('sessions.create.loadingPlan')}
                </div>
              ) : assignmentError ? (
                <p className="text-sm text-red-300">{assignmentError}</p>
              ) : activeAssignment?.plan ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-semibold text-white">{activeAssignment.plan.name}</p>
                  {activeAssignment.plan.description && (
                    <p className="mt-1 text-xs rogym-text-secondary">
                      {activeAssignment.plan.description}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <TrainerSelect value={selectedPlanId} onValueChange={setSelectedPlanId} required>
                    <option value="">{t('sessions.create.selectPlan')}</option>
                    {plans.map((plan) => (
                      <option key={plan.planId} value={plan.planId}>
                        {plan.name}
                      </option>
                    ))}
                  </TrainerSelect>
                  {plans.length === 0 && (
                    <p className="text-xs rogym-text-secondary">
                      {t('sessions.create.noActivePlan')}
                    </p>
                  )}
                </>
              )}
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">{t('sessions.create.fieldPlanDay')}</span>
              <TrainerSelect
                value={selectedPlanDayId}
                onValueChange={setSelectedPlanDayId}
                disabled={assignmentLoading || planDayOptions.length === 0}
                required
              >
                <option value="">
                  {planDayOptions.length > 0
                    ? t('sessions.create.selectPlanDay')
                    : t('sessions.create.selectPlanFirst')}
                </option>
                {planDayOptions.map((day) => (
                  <option key={day.planDayId} value={day.planDayId}>
                    {formatPlanDayOption(day)}
                  </option>
                ))}
              </TrainerSelect>
            </label>
          </>
        ) : null}
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('sessions.create.fieldRoom')}</span>
          <TrainerSelect value={roomId} onValueChange={setRoomId} required>
            <option value="">{t('sessions.create.selectRoom')}</option>
            {rooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomCode} - {room.name} ({room.capacity} {t('sessions.create.capacityUnit')})
              </option>
            ))}
          </TrainerSelect>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="block space-y-2">
            <span className="rogym-field-label">{t('sessions.create.fieldStartTime')}</span>
            <DateTimePickerInput
              value={startTime}
              onChange={setStartTime}
              placeholder={t('sessions.create.startTimePlaceholder')}
              aria-label={t('sessions.create.fieldStartTime')}
              disabled={editBlocked}
            />
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('sessions.create.fieldDuration')}</span>
            <input
              className="rogym-input"
              type="number"
              min={15}
              max={360}
              step={15}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
            />
          </label>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm rogym-text-secondary">
          <Clock3 size={17} className="rogym-text-accent" />
          {t('sessions.create.estimatedEnd')}{' '}
          {endTime ? toDateTimeLocalInput(endTime).replace('T', ' ') : t('sessions.create.endUnknown')}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
          <Link
            className="rogym-btn rogym-btn--outline-white"
            to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
          >
            {t('sessions.create.cancel')}
          </Link>
          <SubmitButton
            loading={submitting}
            disabled={
              editBlocked || !memberId || !roomId || !startTime || duration <= 0 || !hasWorkoutPlanLink
            }
          >
            {editing ? t('sessions.create.save') : t('sessions.create.submit')}
          </SubmitButton>
        </div>
      </form>
    </TrainerPage>
  )
}
