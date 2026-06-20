import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock3 } from 'lucide-react'
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

function formatPlanDayOption(day: PlanDayOption) {
  return `Ngày ${day.dayNumber} - Tuần ${day.weekNumber}, thứ ${day.dayOfWeek}: ${day.name}`
}

export default function CreateSessionPage() {
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
            setError('Chỉ có thể sửa buổi tập đã lên lịch và chưa bắt đầu.')
          }
        }
      } catch (err) {
        setError(getApiError(err, 'Không thể tải dữ liệu tạo buổi tập.'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

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
        setAssignmentError(getApiError(err, 'Không thể tải workout plan của học viên.'))
      })
      .finally(() => {
        if (active) setAssignmentLoading(false)
      })

    return () => {
      active = false
    }
  }, [editing, memberId])

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
      setError(
        getApiError(
          err,
          'Không thể lưu buổi tập. Hãy kiểm tra trùng lịch, phòng và thời hạn gói tập.'
        )
      )
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
        eyebrow="Lịch dạy"
        title={editing ? 'Chỉnh sửa buổi tập' : 'Tạo buổi tập'}
        description="Chọn học viên, phòng và thời gian. Hệ thống sẽ kiểm tra gói tập và xung đột lịch."
        actions={
          <Link
            className="rogym-btn rogym-btn--outline-white"
            to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
          >
            <ArrowLeft size={16} /> Quay lại
          </Link>
        }
      />
      {error && <TrainerErrorState message={error} />}
      <form className="rogym-card rogym-card--compact space-y-5 p-6" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="rogym-field-label">Học viên</span>
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
              <span className="rogym-field-label">Workout plan</span>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                {linkedPlanName ?? 'Buổi tập này chưa liên kết workout plan.'}
              </div>
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">Ngày tập trong plan</span>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                {linkedPlanDayName ?? 'Chưa chọn ngày tập.'}
              </div>
            </label>
          </>
        ) : memberId ? (
          <>
            <label className="block space-y-2">
              <span className="rogym-field-label">Workout plan</span>
              {assignmentLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm rogym-text-secondary">
                  Đang tải workout plan của học viên...
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
                    <option value="">Chọn workout plan để gán</option>
                    {plans.map((plan) => (
                      <option key={plan.planId} value={plan.planId}>
                        {plan.name}
                      </option>
                    ))}
                  </TrainerSelect>
                  {plans.length === 0 && (
                    <p className="text-xs rogym-text-secondary">
                      Chưa có workout plan active để gán cho học viên.
                    </p>
                  )}
                </>
              )}
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">Ngày tập trong plan</span>
              <TrainerSelect
                value={selectedPlanDayId}
                onValueChange={setSelectedPlanDayId}
                disabled={assignmentLoading || planDayOptions.length === 0}
                required
              >
                <option value="">
                  {planDayOptions.length > 0 ? 'Chọn ngày tập' : 'Chọn workout plan trước'}
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
          <span className="rogym-field-label">Phòng tập</span>
          <TrainerSelect value={roomId} onValueChange={setRoomId} required>
            <option value="">Chọn phòng tập</option>
            {rooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomCode} - {room.name} ({room.capacity} người)
              </option>
            ))}
          </TrainerSelect>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="block space-y-2">
            <span className="rogym-field-label">Thời gian bắt đầu</span>
            <DateTimePickerInput
              value={startTime}
              onChange={setStartTime}
              placeholder="Chọn ngày & giờ"
              aria-label="Thời gian bắt đầu"
              disabled={editBlocked}
            />
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">Thời lượng (phút)</span>
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
          Kết thúc dự kiến:{' '}
          {endTime ? toDateTimeLocalInput(endTime).replace('T', ' ') : 'Chưa xác định'}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
          <Link
            className="rogym-btn rogym-btn--outline-white"
            to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'}
          >
            Hủy
          </Link>
          <SubmitButton
            loading={submitting}
            disabled={
              editBlocked || !memberId || !roomId || !startTime || duration <= 0 || !hasWorkoutPlanLink
            }
          >
            {editing ? 'Lưu thay đổi' : 'Tạo buổi tập'}
          </SubmitButton>
        </div>
      </form>
    </TrainerPage>
  )
}
