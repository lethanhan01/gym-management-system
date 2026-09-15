import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  User,
  AlertCircle,
  CalendarDays,
} from 'lucide-react'
import { Alert, Button, Modal, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import {
  trainingSessionService,
  type MemberActivePlanBookingData,
  type TrainerAvailabilityData,
  type TrainerAvailabilitySlot,
} from '@/services/training-session.service'

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

  const availableDays = useMemo(() => getNext7Days(), [])
  const [selectedDate, setSelectedDate] = useState<string>(() => availableDays[0]?.dateStr ?? '')
  const [availability, setAvailability] = useState<TrainerAvailabilityData | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TrainerAvailabilitySlot | null>(null)

  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [noTrainer, setNoTrainer] = useState(false)
  const [noSubscription, setNoSubscription] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  // Plan linkage state
  const [planBookingData, setPlanBookingData] = useState<MemberActivePlanBookingData | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [selectedPlanDayId, setSelectedPlanDayId] = useState<string>('')

  // Load member active workout plan for booking
  const fetchPlanBookingData = useCallback(async () => {
    setLoadingPlan(true)
    try {
      const data = await trainingSessionService.getActivePlanDaysForBooking()
      setPlanBookingData(data)
      if (!data.hasPtBenefit && data.subscriptionReason === 'NO_ACTIVE_SUBSCRIPTION') {
        setNoSubscription(true)
      }
    } catch {
      // If fetching fails, let the booking check handle it or keep current state
    } finally {
      setLoadingPlan(false)
    }
  }, [])

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
      setPlanBookingData(null)
      return
    }
    void fetchPlanBookingData()
    if (selectedDate) {
      setSelectedSlot(null)
      setNoSubscription(false)
      void fetchAvailability(selectedDate)
    }
  }, [open, selectedDate, fetchAvailability, fetchPlanBookingData])

  const handleBooking = async () => {
    if (!selectedSlot || !selectedPlanDayId || !planBookingData?.assignmentId) return
    setBookingLoading(true)
    setNoSubscription(false)
    try {
      await trainingSessionService.bookSession({
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        assignmentId: planBookingData.assignmentId,
        planDayId: selectedPlanDayId,
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
      } else if (code === 'SUBSCRIPTION_DOES_NOT_INCLUDE_PT') {
        toast.error(t('workout.schedule.booking.noPtBenefitWarning'))
        void fetchPlanBookingData()
      } else if (code === 'WORKOUT_PLAN_DAY_ALREADY_COMPLETED') {
        toast.error(t('workout.schedule.booking.errorDayCompleted'))
        void fetchPlanBookingData()
      } else if (code === 'WORKOUT_PLAN_DAY_ALREADY_SCHEDULED') {
        toast.error(t('workout.schedule.booking.errorDayScheduled'))
        void fetchPlanBookingData()
      } else if (code === 'BOOKING_LIMIT_EXCEEDED') {
        toast.error(t('workout.schedule.booking.bookingLimitWarning'))
      } else {
        toast.error(getApiError(err, t('workout.schedule.errorLoad')))
      }
    } finally {
      setBookingLoading(false)
    }
  }

  const isNoPtBenefit =
    Boolean(planBookingData && !planBookingData.hasPtBenefit && planBookingData.subscriptionReason === 'SUBSCRIPTION_WITHOUT_PT')

  const isNoActiveSubscription =
    noSubscription || Boolean(planBookingData && !planBookingData.hasPtBenefit && planBookingData.subscriptionReason === 'NO_ACTIVE_SUBSCRIPTION')

  const isNoActivePlan =
    Boolean(planBookingData && planBookingData.hasPtBenefit && !planBookingData.hasActivePlan)

  const isAllDaysCompletedOrScheduled =
    Boolean(planBookingData && planBookingData.hasPtBenefit && planBookingData.hasActivePlan && planBookingData.allCompletedOrScheduled)

  const canSubmit = Boolean(
    selectedSlot &&
    selectedPlanDayId &&
    !bookingLoading &&
    !noTrainer &&
    scheduledCount < 3 &&
    planBookingData?.hasPtBenefit &&
    planBookingData?.hasActivePlan &&
    !planBookingData?.allCompletedOrScheduled
  )

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
            disabled={!canSubmit}
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

        {/* Subscription Without PT Warning */}
        {isNoPtBenefit && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-rose-300 leading-relaxed">
                {t('workout.schedule.booking.noPtBenefitWarning')}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => {
                onClose()
                navigate('/member/subscription/current')
              }}
            >
              {t('workout.schedule.booking.upgradePackageBtn')} →
            </Button>
          </div>
        )}

        {/* Inactive Subscription Warning */}
        {isNoActiveSubscription && !isNoPtBenefit && (
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
                navigate('/member/subscription/current')
              }}
            >
              {t('workout.schedule.booking.goToPackagesBtn')} →
            </Button>
          </div>
        )}

        {/* No Active Plan Warning */}
        {isNoActivePlan && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5">
              <CalendarDays className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-amber-300 leading-relaxed">
                {t('workout.schedule.booking.noActivePlanWarning')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => {
                onClose()
                navigate('/member/workout/plan')
              }}
            >
              {t('workout.schedule.booking.goToPlanBtn')} →
            </Button>
          </div>
        )}

        {/* All Days Completed / Scheduled Warning */}
        {isAllDaysCompletedOrScheduled && (
          <Alert
            tone="warning"
            description={t('workout.schedule.booking.allDaysCompletedWarning')}
          />
        )}

        {/* Horizontal 7-day Date Picker */}
        {!noTrainer && !isNoPtBenefit && !isNoActiveSubscription && (
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
        {!noTrainer && !isNoPtBenefit && !isNoActiveSubscription && (
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

        {/* Required Workout Plan Day Selection */}
        {!noTrainer && !isNoPtBenefit && !isNoActiveSubscription && planBookingData?.hasActivePlan && (
          <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/80">
                <Dumbbell size={14} className="text-[var(--rogym-accent)]" />
                <span>{t('workout.schedule.booking.workoutPlanRequired')}</span>
                <span className="text-rose-400 font-bold">*</span>
              </div>
              {planBookingData.planName && (
                <span className="truncate max-w-[220px] rounded-md border border-[var(--rogym-accent)]/20 bg-[var(--rogym-accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--rogym-accent)]">
                  {planBookingData.planName}
                </span>
              )}
            </div>
            <p className="text-xs text-white/50">
              {t('workout.schedule.booking.workoutPlanRequiredDesc')}
            </p>

            {loadingPlan ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height={68} rounded="xl" />
                ))}
              </div>
            ) : planBookingData.days?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {planBookingData.days.map((day) => {
                  const isSelected = selectedPlanDayId === day.planDayId
                  const isCompleted = day.status === 'completed'
                  const isScheduled = day.status === 'scheduled'
                  const isAvailable = day.status === 'available'

                  return (
                    <button
                      key={day.planDayId}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedPlanDayId(day.planDayId)}
                      className={`relative flex flex-col justify-between rounded-xl p-3 text-left transition-all ${
                        isSelected
                          ? 'border border-[var(--rogym-accent)] bg-[var(--rogym-accent)]/15 text-white shadow-md ring-1 ring-[var(--rogym-accent)]'
                          : isAvailable
                            ? 'border border-white/10 bg-white/[0.02] text-white hover:border-[var(--rogym-accent)]/40 hover:bg-white/[0.05]'
                            : isCompleted
                              ? 'cursor-not-allowed border border-white/5 bg-white/[0.01] text-white/40 opacity-60'
                              : 'cursor-not-allowed border border-amber-500/20 bg-amber-500/[0.03] text-white/50 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-[var(--rogym-accent)]' : 'text-white'}`}>
                          {day.name || t('workout.schedule.dayWeek', { day: day.dayNumber, week: day.weekNumber })}
                        </span>
                        {isCompleted && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                            <CheckCircle2 size={11} />
                            {t('workout.schedule.booking.dayStatusCompleted')}
                          </span>
                        )}
                        {isScheduled && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Clock size={11} />
                            {t('workout.schedule.booking.dayStatusScheduled')}
                          </span>
                        )}
                        {isAvailable && (
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                            isSelected
                              ? 'border-[var(--rogym-accent)]/40 bg-[var(--rogym-accent)]/20 text-[var(--rogym-accent)] font-bold'
                              : 'border-sky-500/20 bg-sky-500/10 text-sky-400'
                          }`}>
                            {t('workout.schedule.booking.dayStatusAvailable')}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                        <span>
                          {t('workout.schedule.booking.dayExercisesCount', { count: day.exerciseCount })}
                        </span>
                        {day.notes && (
                          <span className="truncate max-w-[130px] italic text-white/40 text-[11px]">
                            {day.notes}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  )
}
