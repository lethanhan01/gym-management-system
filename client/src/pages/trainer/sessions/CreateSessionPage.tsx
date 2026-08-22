import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar as CalendarIcon, Clock3, Dumbbell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { localDateTimeInputToIso, toDateTimeLocalInput } from '@/lib/date'
import { facilityService, type GymRoom } from '@/services/facility.service'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { trainingSessionService } from '@/services/training-session.service'
import workoutService, {
  type WorkoutAssignmentSummary,
  type WorkoutPlan,
  type WorkoutPlanDay,
} from '@/services/workout.service'
import {
  StudentCombobox,
  SubmitButton,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardContent,
  CardFooter,
  DatePickerInput,
  DateTimePickerInput,
  FormField,
  Input,
  Skeleton,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type PlanDayOption = Pick<
  WorkoutPlanDay,
  'planDayId' | 'dayNumber' | 'weekNumber' | 'dayOfWeek' | 'name'
>

type Slot = {
  slotIndex: number
  startTime: string
  endTime: string
  available: boolean
  reason?: string
}

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
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [availabilitySlots, setAvailabilitySlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
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
          id ? trainingSessionService.getSession(id) : Promise.resolve(null),
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

  useEffect(() => {
    if (editing || !memberId) {
      setAvailabilitySlots([])
      setSelectedSlot(null)
      return
    }

    let active = true
    setSlotsLoading(true)
    setSelectedSlot(null)

    trainingSessionService
      .getTrainerAvailabilityForTrainer(selectedDate, '', memberId)
      .then((data) => {
        if (!active) return
        setAvailabilitySlots(data.slots)
      })
      .catch(() => {
        if (!active) return
        setAvailabilitySlots([])
      })
      .finally(() => {
        if (active) setSlotsLoading(false)
      })

    return () => { active = false }
  }, [editing, memberId, selectedDate])

  const computedStartTime = useMemo(() => {
    if (selectedSlot) return selectedSlot.startTime
    return localDateTimeInputToIso(startTime) || ''
  }, [selectedSlot, startTime])

  const computedEndTime = useMemo(() => {
    if (selectedSlot) return selectedSlot.endTime
    if (!computedStartTime || !Number.isFinite(duration) || duration <= 0) return ''
    const start = new Date(computedStartTime)
    return new Date(start.getTime() + duration * 60000).toISOString()
  }, [selectedSlot, computedStartTime, duration])

  const effectiveDuration = useMemo(() => {
    if (selectedSlot && computedStartTime && computedEndTime) {
      return Math.max(
        1,
        Math.round(
          (new Date(computedEndTime).getTime() - new Date(computedStartTime).getTime()) / 60000
        )
      )
    }
    return duration
  }, [selectedSlot, computedStartTime, computedEndTime, duration])

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
    if (!memberId || !roomId || !computedStartTime || !computedEndTime || !hasWorkoutPlanLink) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        roomId,
        startTime: computedStartTime,
        endTime: computedEndTime,
      }
      if (editing && id) {
        await trainingSessionService.updateSession(id, payload)
      } else {
        let assignmentId = activeAssignment?.assignmentId ?? ''
        if (!assignmentId) {
          const assignment = await workoutService.assignPlan(memberId, {
            planId: Number(selectedPlanId),
            startDate: selectedDate,
          })
          assignmentId = assignment.assignmentId
        }
        await trainingSessionService.createSession({
          ...payload,
          memberId,
          assignmentId,
          planDayId: selectedPlanDayId,
        })
      }
      navigate('/trainer/sessions')
    } catch (err) {
      toast.error(getApiError(err, t('sessions.create.error.saveFailed')), {
        action: { label: t('button.retry', { defaultValue: 'Thử lại' }), onClick: handleSubmit },
      })
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
          <ButtonLink
            variant="outline-white"
            to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
          >
            <ArrowLeft size={16} /> {t('sessions.create.back')}
          </ButtonLink>
        }
      />

      {editBlocked && (
        <Alert
          tone="warning"
          className="mb-6"
          title={t('sessions.create.error.editBlockedTitle', { defaultValue: 'Không thể chỉnh sửa' })}
          description={t('sessions.create.error.editBlocked')}
        />
      )}

      {error && !editBlocked && (
        <Alert
          tone="error"
          className="mb-6"
          title={t('sessions.create.error.generalTitle', { defaultValue: 'Đã xảy ra lỗi' })}
          description={error}
          onClose={() => setError(null)}
        />
      )}

      <Card variant="compact" className="p-0">
        <form onSubmit={handleSubmit}>
          <CardContent noPaddingTop className="p-6 space-y-6">
            {/* 1. Member Selection */}
            <FormField
              label={t('sessions.create.fieldStudent')}
              required
              fullWidth
            >
              <StudentCombobox
                students={students}
                value={memberId}
                onChange={setMemberId}
                disabled={editing}
              />
            </FormField>

            {/* 2. Workout Plan & Plan Day */}
            {editing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label={t('sessions.create.fieldWorkoutPlan')}>
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                    <Dumbbell size={16} className="text-[var(--rogym-teal)] shrink-0" />
                    <span className="truncate">{linkedPlanName ?? t('sessions.create.notLinked')}</span>
                  </div>
                </FormField>
                <FormField label={t('sessions.create.fieldPlanDay')}>
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                    <CalendarIcon size={16} className="text-[var(--rogym-teal)] shrink-0" />
                    <span className="truncate">{linkedPlanDayName ?? t('sessions.create.noPlanDay')}</span>
                  </div>
                </FormField>
              </div>
            ) : memberId ? (
              <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <FormField
                  label={t('sessions.create.fieldWorkoutPlan')}
                  required={!activeAssignment?.plan}
                  error={assignmentError ?? undefined}
                >
                  {assignmentLoading ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : activeAssignment?.plan ? (
                    <Card
                      variant="glass"
                      padding="sm"
                      className="border-[var(--rogym-teal)]/30 bg-[var(--rogym-teal)]/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Dumbbell size={16} className="text-[var(--rogym-teal)] shrink-0" />
                            <p className="text-sm font-semibold text-white truncate">
                              {activeAssignment.plan.name}
                            </p>
                          </div>
                          {activeAssignment.plan.description && (
                            <p className="text-xs rogym-text-secondary line-clamp-2">
                              {activeAssignment.plan.description}
                            </p>
                          )}
                        </div>
                        <Badge tone="accent" size="sm" className="shrink-0">
                          {t('sessions.create.assignedPlanBadge', { defaultValue: 'Đang theo học' })}
                        </Badge>
                      </div>
                    </Card>
                  ) : (
                    <>
                      <TrainerSelect
                        value={selectedPlanId}
                        onValueChange={setSelectedPlanId}
                        required
                      >
                        <option value="">{t('sessions.create.selectPlan')}</option>
                        {plans.map((plan) => (
                          <option key={plan.planId} value={plan.planId}>
                            {plan.name}
                          </option>
                        ))}
                      </TrainerSelect>
                      {plans.length === 0 && (
                        <p className="text-xs rogym-text-secondary mt-1">
                          {t('sessions.create.noActivePlan')}
                        </p>
                      )}
                    </>
                  )}
                </FormField>

                <FormField
                  label={t('sessions.create.fieldPlanDay')}
                  required
                >
                  {assignmentLoading ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : (
                    <TrainerSelect
                      value={selectedPlanDayId}
                      onValueChange={setSelectedPlanDayId}
                      disabled={planDayOptions.length === 0}
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
                  )}
                </FormField>
              </div>
            ) : null}

            {/* 3. Room Selection */}
            <FormField
              label={t('sessions.create.fieldRoom')}
              required
            >
              <TrainerSelect value={roomId} onValueChange={setRoomId} required>
                <option value="">{t('sessions.create.selectRoom')}</option>
                {rooms.map((room) => (
                  <option key={room.roomId} value={room.roomId}>
                    {room.roomCode} - {room.name} ({room.capacity} {t('sessions.create.capacityUnit')})
                  </option>
                ))}
              </TrainerSelect>
            </FormField>

            {/* 4. Date & Slots (Create Mode) / Start Time & Duration (Edit Mode) */}
            {memberId && !editing ? (
              <div className="space-y-4">
                <FormField
                  label={t('sessions.create.fieldStartTime')}
                  required
                  hint={t('sessions.create.selectDateHint', {
                    defaultValue: 'Chọn ngày để tra cứu các khung giờ trống',
                  })}
                >
                  <DatePickerInput
                    value={selectedDate}
                    onChange={setSelectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    aria-label={t('sessions.create.fieldStartTime')}
                    required
                  />
                </FormField>

                <div className="space-y-2">
                  <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/80 select-none">
                    <span>{t('sessions.create.availableSlots', { defaultValue: 'Khung giờ khả dụng' })}</span>
                    <span className="text-red-400 font-bold" aria-hidden="true">*</span>
                  </span>

                  {slotsLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-1">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-xl" />
                      ))}
                    </div>
                  ) : availabilitySlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {availabilitySlots.map((slot) => {
                        const isSelected =
                          selectedSlot?.startTime === slot.startTime &&
                          selectedSlot?.endTime === slot.endTime
                        const fmt = (iso: string) =>
                          new Date(iso).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'Asia/Ho_Chi_Minh',
                          })
                        return (
                          <button
                            key={slot.slotIndex}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              'relative flex flex-col items-center justify-center rounded-xl p-3 text-center text-sm font-semibold transition-all touch-manipulation',
                              isSelected
                                ? 'border-2 border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/20 text-white shadow-sm ring-1 ring-[var(--rogym-teal)]/40'
                                : slot.available
                                  ? 'border border-white/10 bg-white/[0.02] text-white hover:border-[var(--rogym-teal)]/40 hover:bg-white/[0.05]'
                                  : 'cursor-not-allowed border border-white/5 bg-white/[0.01] text-white/30 opacity-50'
                            )}
                          >
                            <span>
                              {fmt(slot.startTime)} - {fmt(slot.endTime)}
                            </span>
                            {!slot.available && (
                              <Badge
                                tone={slot.reason === 'PAST_TIME' ? 'muted' : 'danger'}
                                size="sm"
                                className="mt-1.5 text-[10px] py-0 px-1.5 font-normal"
                              >
                                {slot.reason === 'PAST_TIME'
                                  ? t('sessions.create.slotPast', { defaultValue: 'Quá giờ' })
                                  : t('sessions.create.slotBusy', { defaultValue: 'Đã đặt' })}
                              </Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <Alert
                      tone="neutral"
                      variant="subtle"
                      className="py-3"
                      description={t('sessions.create.noSlots', {
                        defaultValue: 'Không có khung giờ nào khả dụng trong ngày đã chọn.',
                      })}
                    />
                  )}
                </div>
              </div>
            ) : editing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label={t('sessions.create.fieldStartTime')}
                  required
                >
                  <DateTimePickerInput
                    value={startTime}
                    onChange={setStartTime}
                    placeholder={t('sessions.create.startTimePlaceholder')}
                    aria-label={t('sessions.create.fieldStartTime')}
                    disabled={editBlocked}
                  />
                </FormField>

                <FormField
                  label={t('sessions.create.fieldDuration')}
                  required
                  hint={t('sessions.create.durationHint', {
                    defaultValue: 'Thời lượng tính bằng phút (bội số của 15)',
                  })}
                >
                  <Input
                    type="number"
                    min={15}
                    max={360}
                    step={15}
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    disabled={editBlocked}
                    required
                    trailingIcon={
                      <span className="text-xs text-white/50">
                        {t('sessions.create.minutesUnit', { defaultValue: 'phút' })}
                      </span>
                    }
                  />
                </FormField>
              </div>
            ) : null}

            {/* 5. Summary Feedback Banner */}
            <Alert
              tone="info"
              variant="subtle"
              icon={<Clock3 size={18} className="text-sky-400 shrink-0" />}
              title={t('sessions.create.summaryTitle', { defaultValue: 'Thời gian buổi tập dự kiến' })}
              description={
                computedEndTime ? (
                  <span className="font-medium text-white/90">
                    {computedStartTime ? toDateTimeLocalInput(computedStartTime).replace('T', ' ') : ''}{' '}
                    &rarr; {toDateTimeLocalInput(computedEndTime).replace('T', ' ')}{' '}
                    ({effectiveDuration} {t('sessions.create.minutesUnit', { defaultValue: 'phút' })})
                  </span>
                ) : (
                  t('sessions.create.endUnknown')
                )
              }
            />
          </CardContent>

          {/* 6. Footer Actions */}
          <CardFooter
            align="end"
            responsiveStack
            className="px-6 py-4 border-t border-white/5 bg-white/[0.01]"
          >
            <ButtonLink
              variant="outline-white"
              to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
            >
              {t('sessions.create.cancel')}
            </ButtonLink>
            <SubmitButton
              loading={submitting}
              disabled={
                editBlocked ||
                !memberId ||
                !roomId ||
                (!editing && !selectedSlot) ||
                (editing && !computedEndTime) ||
                !hasWorkoutPlanLink
              }
            >
              {editing ? t('sessions.create.save') : t('sessions.create.submit')}
            </SubmitButton>
          </CardFooter>
        </form>
      </Card>
    </TrainerPage>
  )
}
