import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Clock,
  Dumbbell,
  Loader2,
  User,
} from 'lucide-react'
import { Alert, Button, Modal, Select, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import {
  trainingSessionService,
  type TrainerAvailabilityData,
  type TrainerAvailabilitySlot,
} from '@/services/training-session.service'
import workoutService, { type WorkoutPlan } from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getNext7Days(): Array<{ dateStr: string; dateObj: Date }> {
  const days: Array<{ dateStr: string; dateObj: Date }> = []
  const base = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push({
      dateStr: formatDateKey(d),
      dateObj: d,
    })
  }
  return days
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export interface BookPtSessionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  scheduledCount?: number
}

export function BookPtSessionModal({
  open,
  onClose,
  onSuccess,
  scheduledCount = 0,
}: BookPtSessionModalProps) {
  const { t, i18n } = useTranslation('member')
  const locale = i18n.language
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const availableDays = useMemo(() => getNext7Days(), [])
  const [selectedDate, setSelectedDate] = useState<string>(() => availableDays[0]?.dateStr ?? '')
  const [availability, setAvailability] = useState<TrainerAvailabilityData | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TrainerAvailabilitySlot | null>(null)

  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [noTrainer, setNoTrainer] = useState(false)
  const [noSubscription, setNoSubscription] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  // Optional workout plan linkage
  const [activePlan, setActivePlan] = useState<{
    assignmentId: string
    plan: WorkoutPlan
  } | null>(null)
  const [selectedPlanDayId, setSelectedPlanDayId] = useState<string>('')

  const memberId = user?.memberId

  // Load member active workout plan
  useEffect(() => {
    if (!open || !memberId) return
    let isMounted = true

    async function loadActivePlan() {
      try {
        const assignments = await workoutService.getAssignments(memberId!, {
          status: 'active',
          limit: 1,
        })
        if (!isMounted || !assignments.length) return
        const activeAssignment = assignments[0]
        const planDetail = await workoutService.getPlan(activeAssignment.planId)
        if (isMounted) {
          setActivePlan({
            assignmentId: activeAssignment.assignmentId,
            plan: planDetail,
          })
        }
      } catch {
        // Plan linking is optional, silently ignore
      }
    }

    void loadActivePlan()
    return () => {
      isMounted = false
    }
  }, [open, memberId])

  // Load trainer availability
  const fetchAvailability = useCallback(async (dateStr: string) => {
    setLoadingAvailability(true)
    setNoTrainer(false)
    try {
      const data = await trainingSessionService.getTrainerAvailability(dateStr)
      setAvailability(data)
    } catch (err: unknown) {
      const code = getApiErrorCode(err)
      if (code === 'NO_PRIMARY_TRAINER') {
        setNoTrainer(true)
      } else {
        toast.error(getApiError(err, t('workout.schedule.errorLoad')))
      }
      setAvailability(null)
    } finally {
      setLoadingAvailability(false)
    }
  }, [t])

  useEffect(() => {
    if (!open) {
      setSelectedSlot(null)
      setSelectedPlanDayId('')
      setNoSubscription(false)
      return
    }
    if (selectedDate) {
      setSelectedSlot(null)
      setNoSubscription(false)
      void fetchAvailability(selectedDate)
    }
  }, [open, selectedDate, fetchAvailability])

  const handleBooking = async () => {
    if (!selectedSlot) return
    setBookingLoading(true)
    setNoSubscription(false)
    try {
      await trainingSessionService.bookSession({
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        assignmentId: activePlan && selectedPlanDayId ? activePlan.assignmentId : undefined,
        planDayId: selectedPlanDayId || undefined,
      })
      toast.success(t('workout.schedule.booking.successToast'))
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const code = getApiErrorCode(err)
      if (code === 'TRAINER_TIME_OVERLAP' || code === 'MEMBER_TIME_OVERLAP') {
        toast.warning(t('workout.schedule.booking.conflictToast'))
        setSelectedSlot(null)
        void fetchAvailability(selectedDate)
      } else if (code === 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION') {
        setNoSubscription(true)
        toast.error(t('workout.schedule.booking.noSubscriptionWarning'))
      } else if (code === 'BOOKING_LIMIT_EXCEEDED') {
        toast.error(t('workout.schedule.booking.bookingLimitWarning'))
      } else {
        toast.error(getApiError(err, t('workout.schedule.errorLoad')))
      }
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={bookingLoading ? () => { } : onClose}
      title={t('workout.schedule.booking.modalTitle')}
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={bookingLoading}
          >
            {t('workout.schedule.buttonClose')}
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleBooking()}
            disabled={!selectedSlot || bookingLoading || noTrainer || scheduledCount >= 3 || noSubscription}
            loading={bookingLoading}
          >
            {t('workout.schedule.booking.confirmBtn')}
          </Button>
        </>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Trainer & Quota Bar */}
        {availability?.trainer ? (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--rogym-accent)]/15 text-[var(--rogym-accent)]">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {t('workout.schedule.fieldTrainer')}
                </p>
                <p className="truncate text-sm font-bold text-white">
                  {availability.trainer.fullName}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/80">
              {t('workout.schedule.booking.activeQuota', { count: scheduledCount })}
            </div>
          </div>
        ) : null}

        {/* No Trainer Warning */}
        {noTrainer && (
          <Alert tone="warning" description={t('workout.schedule.booking.noTrainer')} />
        )}

        {/* Inactive Subscription Warning */}
        {noSubscription && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-amber-300">
              {t('workout.schedule.booking.noSubscriptionWarning')}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => {
                onClose()
                navigate('/member/membership')
              }}
            >
              {t('workout.schedule.booking.goToPackagesBtn')} →
            </Button>
          </div>
        )}

        {/* Horizontal 7-day Date Picker */}
        {!noTrainer && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              {t('workout.schedule.booking.selectDate')}
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar -mx-1 px-1">
              {availableDays.map(({ dateStr, dateObj }, idx) => {
                const isSelected = selectedDate === dateStr
                const dayName =
                  idx === 0
                    ? t('workout.schedule.today')
                    : idx === 1
                      ? t('workout.schedule.tomorrow')
                      : dateObj.toLocaleDateString(locale, { weekday: 'short' })
                const dayNum = dateObj.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex min-w-[68px] flex-1 shrink-0 flex-col items-center justify-center rounded-xl py-2 px-2 text-center transition-all ${isSelected
                        ? 'border border-[var(--rogym-accent)] bg-[var(--rogym-accent)]/15 text-white shadow-sm'
                        : 'border border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                  >
                    <span className="text-[11px] font-medium capitalize text-white/60 whitespace-nowrap">
                      {dayName}
                    </span>
                    <span className={`mt-0.5 text-sm font-bold whitespace-nowrap ${isSelected ? 'text-[var(--rogym-accent)]' : 'text-white'}`}>
                      {dayNum}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Slot Grid */}
        {!noTrainer && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                {t('workout.schedule.booking.selectSlot')}
              </label>
              {loadingAvailability && (
                <span className="flex items-center gap-1.5 text-xs text-white/50">
                  <Loader2 className="animate-spin" size={14} />
                  {t('workout.myPlan.buttonProcessing')}
                </span>
              )}
            </div>

            {loadingAvailability ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    height={48}
                    rounded="xl"
                  />
                ))}
              </div>
            ) : availability?.slots?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {availability.slots.map((slot) => {
                  const isSelected =
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.endTime === slot.endTime
                  const startTimeFmt = formatSlotTime(slot.startTime)
                  const endTimeFmt = formatSlotTime(slot.endTime)

                  return (
                    <button
                      key={slot.slotIndex}
                      type="button"
                      disabled={!slot.available || scheduledCount >= 3}
                      onClick={() => setSelectedSlot(slot)}
                      className={`relative flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all ${isSelected
                          ? 'border border-[var(--rogym-accent)] bg-[var(--rogym-accent)]/20 text-white shadow-md'
                          : slot.available && scheduledCount < 3
                            ? 'border border-white/10 bg-white/[0.02] text-white hover:border-[var(--rogym-accent)]/40 hover:bg-white/[0.05]'
                            : 'cursor-not-allowed border border-white/5 bg-white/[0.01] text-white/25 opacity-50'
                        }`}
                    >
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold whitespace-nowrap">
                        <Clock size={12} className={isSelected ? 'text-[var(--rogym-accent)]' : 'text-white/40'} />
                        <span>
                          {startTimeFmt} - {endTimeFmt}
                        </span>
                      </div>
                      <span className="mt-0.5 text-[10px] sm:text-[11px] font-medium whitespace-nowrap">
                        {slot.available ? (
                          <span className={isSelected ? 'font-bold text-[var(--rogym-accent)]' : 'text-emerald-400'}>
                            {t('workout.schedule.booking.slotAvailable')}
                          </span>
                        ) : slot.reason === 'PAST_TIME' ? (
                          <span className="text-white/30">{t('workout.schedule.booking.slotPast')}</span>
                        ) : (
                          <span className="text-rose-400/80">{t('workout.schedule.booking.slotOccupied')}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-sm text-white/50">
                {t('workout.schedule.noUpcoming')}
              </div>
            )}
          </div>
        )}

        {/* Optional Workout Plan Assignment Link */}
        {!noTrainer && activePlan && activePlan.plan.days?.length ? (
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/70">
              <Dumbbell size={14} className="text-[var(--rogym-accent)]" />
              <span>{t('workout.schedule.booking.workoutPlanOptional')}</span>
            </div>
            <p className="text-xs text-white/50 truncate">
              {activePlan.plan.name}
            </p>
            <Select
              value={selectedPlanDayId}
              onValueChange={(val) => setSelectedPlanDayId(val)}
              className="w-full"
            >
              <option value="">{t('workout.schedule.booking.noPlanSelected')}</option>
              {activePlan.plan.days.map((day) => (
                <option key={day.planDayId} value={day.planDayId}>
                  {day.name || `Ngày ${day.dayNumber} · Tuần ${day.weekNumber}`}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

