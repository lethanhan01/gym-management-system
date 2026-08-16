import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
import {
  Dumbbell,
  CheckSquare,
  Scale,
  Activity,
  Calendar,
  CalendarX,
  AlertCircle,
  ClipboardList,
  MessageSquareOff,
  User,
  Phone,
  Mail,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService from '@/services/package.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import { memberService, type MemberProgress, type MemberProfile } from '@/services/member.service'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import api from '@/services/api'
import {
  MemberBadge,
  MemberCard,
  MemberPage,
  MemberPageHeader,
  MemberStatCard,
  MemberStatusBadge,
} from '@/components/MemberUI'
import type { BadgeTone } from '@/components/ui'
import { hasActiveSubscription, isSubscriptionActive } from '@/lib/subscription'
import { getApiError } from '@/lib/api-error'
import { toast } from '@/lib/toast'

const T = '#42e09e'

function todayYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtDatetime(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayFull(locale: string) {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const Skeleton = memo(function Skeleton({ h = 100 }: { h?: number }) {
  return (
    <div
      className={`rogym-dashboard-skeleton rogym-dashboard-skeleton--${h} animate-pulse rounded-2xl`}
    />
  )
})

const ErrorWidget = memo(function ErrorWidget({
  message,
}: {
  message?: string
}) {
  const { t } = useTranslation('member')
  return (
    <div className="flex items-center gap-2 py-4 px-3 rounded-2xl rogym-sx-6a3fe515">
      <AlertCircle size={16} className="text-red-400 shrink-0" />
      <span className="text-[13px] text-red-300 rogym-sx-3278ee06">{message ?? t('dashboard.errorLoad')}</span>
    </div>
  )
})

const SUB_STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  pending: 'warning',
  expired: 'danger',
  cancelled: 'muted',
}
const SESSION_STATUS_TONE: Record<string, BadgeTone> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
}
const FEEDBACK_TYPE_TONE: Record<string, BadgeTone> = {
  staff: 'purple',
  equipment: 'warning',
  service: 'info',
}
const STAT_SKELETON_KEYS = [0, 1, 2, 3] as const

/* ── PT Info Card ── */
const PtInfoCard = memo(function PtInfoCard({
  trainerName,
  trainerPhone,
  trainerEmail,
  activePlanIncludesPt,
  loading,
  onChooseTrainer,
  onRemoveTrainer,
}: {
  trainerName: string | null
  trainerPhone?: string | null
  trainerEmail?: string | null
  activePlanIncludesPt: boolean | null
  loading: boolean
  onChooseTrainer: () => void
  onRemoveTrainer: () => void
}) {
  const { t } = useTranslation('member')
  const initials = useMemo(() => {
    if (!trainerName) return ''
    return trainerName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(-2)
      .join('')
      .toUpperCase()
  }, [trainerName])

  if (loading) return <Skeleton h={200} />

  if (activePlanIncludesPt === false) {
    return (
      <MemberCard variant="compact" padding="sm" className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 rogym-text-dim">
          <User size={24} />
        </div>
        <p className="text-sm font-medium text-white">{t('dashboard.pt.sectionTitle')}</p>
        <p className="text-xs rogym-text-secondary">{t('dashboard.pt.noPackagePt')}</p>
      </MemberCard>
    )
  }

  if (!trainerName) {
    return (
      <MemberCard variant="compact" padding="sm" className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 rogym-text-dim">
          <User size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{t('dashboard.pt.sectionTitle')}</p>
          <p className="mt-1 text-xs rogym-text-secondary">{t('dashboard.pt.noTrainerAssigned')}</p>
        </div>
        <Button
          variant="outline-white"
          className="w-full text-sm"
          onClick={onChooseTrainer}
        >
          {t('dashboard.pt.chooseTrainer')}
        </Button>
      </MemberCard>
    )
  }

  return (
    <MemberCard variant="compact" padding="sm" className="flex flex-col gap-4">
      <div className="rogym-eyebrow">{t('dashboard.pt.sectionTitle')}</div>
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <div className="flex items-center justify-center rounded-full shrink-0 rogym-sx-20f77b4b">
          <span className="rogym-sx-2e7dd58d">{initials}</span>
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-white">{trainerName}</h3>
          <p className="mt-1 text-xs rogym-text-secondary">{t('dashboard.pt.trainerIncluded')}</p>
        </div>
      </div>

      {/* Contact info */}
      {(trainerPhone || trainerEmail) && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          {trainerPhone && (
            <div className="flex items-center gap-2.5 text-sm rogym-text-secondary">
              <Phone size={14} className="shrink-0 rogym-sx-f27dac31" />
              <span>{trainerPhone}</span>
            </div>
          )}
          {trainerEmail && (
            <div className="flex items-center gap-2.5 text-sm rogym-text-secondary">
              <Mail size={14} className="shrink-0 rogym-sx-f27dac31" />
              <span className="truncate">{trainerEmail}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
        <Button
          variant="outline-white"
          className="w-full text-sm"
          onClick={onChooseTrainer}
        >
          {t('dashboard.pt.changeTrainer')}
        </Button>
        <Button variant="danger" className="w-full text-sm" onClick={onRemoveTrainer}>
          {t('dashboard.pt.cancelTrainer')}
        </Button>
      </div>
    </MemberCard>
  )
})

/* ── Subscription card ── */
const SubscriptionCard = memo(function SubscriptionCard({
  subscription,
  packageName,
  durationDays,
  loading,
  error,
}: {
  subscription: Subscription | null
  packageName: string
  durationDays: number
  loading: boolean
  error: boolean
}) {
  const { t, i18n } = useTranslation('member')
  const navigate = useNavigate()
  if (loading) return <Skeleton h={140} />
  if (error) return <ErrorWidget />

  if (!subscription) {
    return (
      <MemberCard variant="compact" padding="md" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">{t('dashboard.subscription.sectionTitle')}</span>
          <MemberBadge tone="muted">{t('dashboard.subscription.noPackage')}</MemberBadge>
        </div>
        <p className="text-sm rogym-text-secondary">
          {t('dashboard.subscription.noPackageDesc')}
        </p>
        <Button
          variant="primary"
          className="self-start"
          onClick={() => navigate('/member/subscription/setup')}
        >
          {t('dashboard.subscription.choosePlan')}
        </Button>
      </MemberCard>
    )
  }

  const endMs = new Date(subscription.endDate).getTime()
  const startMs = new Date(subscription.startDate).getTime()
  const isExpired = subscription.status === 'expired' || Date.now() > endMs
  const daysLeft = subscription.daysLeft ?? Math.max(0, Math.ceil((endMs - Date.now()) / 86400000))
  // Tổng ngày = toàn bộ kỳ hạn thực tế (đã gồm các lần gia hạn), không phải duration 1 kỳ.
  const spanDays = Math.round((endMs - startMs) / 86400000)
  const totalDays = spanDays > 0 ? spanDays : durationDays || 1
  const daysUsed = Math.max(0, totalDays - daysLeft)
  const pct = Math.min(100, Math.max(0, Math.round((daysUsed / totalDays) * 100)))
  return (
    <MemberCard variant="compact" padding="md" className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="rogym-sx-3c31803f">
          {packageName || subscription.packageName || t('dashboard.subscription.sectionTitle')}
        </span>
        <MemberStatusBadge
          status={subscription.status}
          label={t('dashboard.subStatusLabel.' + subscription.status, subscription.status)}
          tone={SUB_STATUS_TONE[subscription.status]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <progress
          className={`rogym-progress ${isExpired ? 'is-danger' : ''}`}
          max={100}
          value={pct}
          aria-label={`${pct}%`}
        />
        <div className="flex justify-between text-xs rogym-text-secondary">
          <span>
            {daysUsed}/{totalDays} {t('dashboard.subscription.daysUsed')}
          </span>
          <span className={`rogym-status-text ${isExpired ? 'is-danger' : ''}`}>
            {isExpired ? t('dashboard.subscription.expired') : t('dashboard.subscription.daysLeft', { count: daysLeft })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-sm rogym-text-secondary">
        <span>
          {t('dashboard.subscription.startDate')} <b className="text-white">{fmtDate(subscription.startDate, i18n.language)}</b>
        </span>
        <span>
          {t('dashboard.subscription.endDate')}{' '}
          <b className={isExpired ? 'text-red-400' : 'text-white'}>
            {fmtDate(subscription.endDate, i18n.language)}
          </b>
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isExpired ? (
          <Button
            variant="primary"
            className="self-start"
            onClick={() => navigate('/member/subscription/renew')}
          >
            {t('dashboard.subscription.renew')}
          </Button>
        ) : null}
        <Button
          variant="outline-white"
          className="self-start"
          onClick={() => navigate('/member/subscription/current')}
        >
          {t('dashboard.subscription.viewDetail')}
        </Button>
      </div>
    </MemberCard>
  )
})

/* ── Upcoming sessions widget ── */
const SessionsWidget = memo(function SessionsWidget({
  sessions,
  loading,
  error,
}: {
  sessions: TrainingSession[]
  loading: boolean
  error: boolean
}) {
  const { t, i18n } = useTranslation('member')
  const navigate = useNavigate()
  if (loading) return <Skeleton h={120} />
  if (error) return <ErrorWidget />

  return (
    <MemberCard variant="compact" padding="sm" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-white">{t('dashboard.sessions.widgetTitle')}</span>
        <Button
          variant="text-accent"
          className="text-xs"
          onClick={() => navigate('/member/workout/sessions')}
        >
          {t('dashboard.viewAll')}
        </Button>
      </div>
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <CalendarX size={32} className="rogym-text-secondary" />
          <span className="text-sm rogym-text-secondary">{t('workout.schedule.noUpcoming')}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.04] cursor-pointer hover:bg-white/[0.08] transition-colors"
              onClick={() => navigate(`/member/workout/sessions?sessionId=${s.sessionId}`)}
            >
              <div className="flex items-center gap-2.5">
                <Calendar size={14} color={T} />
                <div>
                  <p className="text-sm font-semibold text-white">{fmtDatetime(s.startTime, i18n.language)}</p>
                  {s.trainerName && (
                    <p className="text-xs rogym-text-secondary">
                      {t('dashboard.trainerPrefix')}: {s.trainerName}
                      {s.roomName ? ` · ${s.roomName}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <MemberStatusBadge
                status={s.status}
                label={t('dashboard.sessionStatusLabel.' + s.status, s.status)}
                tone={SESSION_STATUS_TONE[s.status]}
              />
            </div>
          ))}
        </div>
      )}
    </MemberCard>
  )
})

/* ── Workout plan widget ── */
const WorkoutWidget = memo(function WorkoutWidget({
  plan,
  loading,
  error,
}: {
  plan: { name: string } | null
  loading: boolean
  error: boolean
}) {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  if (loading) return <Skeleton h={100} />
  if (error) return <ErrorWidget />

  return (
    <MemberCard variant="compact" padding="sm" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-white">{t('dashboard.workoutPlan.widgetTitle')}</span>
        <Button
          variant="text-accent"
          className="text-xs"
          onClick={() => navigate('/member/workout/plan')}
        >
          {t('dashboard.viewDetail')}
        </Button>
      </div>
      {plan ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{plan.name}</p>
            <p className="text-xs rogym-text-secondary mt-0.5">{t('dashboard.subStatusLabel.active')}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="rogym-text-secondary" />
            <span className="text-sm rogym-text-secondary">{t('workout.myPlan.emptyTitle')}</span>
          </div>
        </div>
      )}
    </MemberCard>
  )
})

/* ── Feedback widget ── */
const FeedbackWidget = memo(function FeedbackWidget({
  feedbacks,
  loading,
  error,
}: {
  feedbacks: Feedback[]
  loading: boolean
  error: boolean
}) {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  if (loading) return <Skeleton h={100} />
  if (error) return <ErrorWidget />

  return (
    <MemberCard variant="compact" padding="sm" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-white">{t('dashboard.feedbackWidget.widgetTitle')}</span>
        <Button
          variant="text-accent"
          className="text-xs"
          onClick={() => navigate('/member/feedback')}
        >
          {t('dashboard.viewAll')}
        </Button>
      </div>
      {feedbacks.length === 0 ? (
        <div className="flex items-center gap-2 py-2">
          <MessageSquareOff size={16} className="rogym-text-secondary" />
          <span className="text-sm rogym-text-secondary">{t('feedback.list.emptyNone')}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {feedbacks.map((fb) => (
            <div
              key={fb.feedbackId}
              className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-white/[0.04]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MemberBadge tone={FEEDBACK_TYPE_TONE[fb.feedbackType]}>
                    {t('dashboard.feedbackTypeLabel.' + fb.feedbackType, fb.feedbackType)}
                  </MemberBadge>
                  <MemberBadge
                    tone={
                      fb.status === 'resolved'
                        ? 'success'
                        : fb.status === 'rejected'
                          ? 'muted'
                          : fb.status === 'in_progress'
                            ? 'warning'
                            : 'info'
                    }
                  >
                    {t('dashboard.feedbackStatusLabel.' + fb.status, fb.status)}
                  </MemberBadge>
                </div>
                <p className="text-xs rogym-text-secondary line-clamp-1">{fb.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </MemberCard>
  )
})

/* ── Main page ── */
export default function MemberDashboardPage() {
  const { t, i18n } = useTranslation('member')
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const setResolvedStatus = useSubscriptionStore((s) => s.setResolvedStatus)

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [packageName, setPackageName] = useState('')
  const [durationDays, setDurationDays] = useState(0)
  const [activePlanIncludesPt, setActivePlanIncludesPt] = useState<boolean | null>(null)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [progress, setProgress] = useState<MemberProgress | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<{ name: string } | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0)
  const [profile, setProfile] = useState<MemberProfile | null>(null)

  const [loadingSub, setLoadingSub] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [errorSub, setErrorSub] = useState(false)
  const [errorSessions, setErrorSessions] = useState(false)
  const [errorPlan, setErrorPlan] = useState(false)
  const [errorFeedbacks, setErrorFeedbacks] = useState(false)

  const todayDescription = useMemo(() => todayFull(i18n.language), [i18n.language])
  const handleChooseTrainer = useCallback(() => navigate('/member/choose-trainer'), [navigate])
  const handleRemoveTrainer = useCallback(async () => {
    try {
      await memberService.selfAssignTrainer(null)
      if (user?.memberId) memberService.getProfile(user.memberId).then(setProfile)
      toast.success(t('dashboard.pt.success.removedTrainer', { defaultValue: 'Đã hủy PT thành công' }))
    } catch (err) {
      toast.error(getApiError(err, t('dashboard.pt.error.removeTrainerFailed', { defaultValue: 'Hủy PT thất bại' })))
    }
  }, [user?.memberId, t])

  useEffect(() => {
    if ((location.state as { paymentSuccess?: boolean } | null)?.paymentSuccess) {
      toast.success(t('dashboard.paymentSuccess'))
    }
  }, [location.state])

  useEffect(() => {
    const memberId = user?.memberId
    if (!memberId) {
      navigate('/login', { replace: true })
      return
    }
    const now = new Date()
    const nowIso = now.toISOString()

    Promise.allSettled([
      subscriptionService.getByMember(memberId),
      trainingService.getSessions({ status: 'scheduled', from: nowIso, pageSize: 3, sort: 'start_time:asc' }),
      memberService.getProgress(memberId, { limit: 1 }),
      trainingService.getAttendance({ memberId, month: todayYYYYMM() }),
      api.get(`/workout-plans/members/${memberId}/assignments`, {
        params: { status: 'active', limit: 1 },
      }),
      feedbackService.list({ pageSize: 2, sort: 'created_at:desc' }),
      memberService.getProfile(memberId),
    ]).then(
      async ([subsR, sessionsR, progressR, attendanceR, workoutR, feedbackR, profileR]) => {
        let activePackageId: string | undefined

        /* Subscription */
        if (subsR.status === 'fulfilled') {
          const subs = subsR.value
          const validActive = subs.find((s) => isSubscriptionActive(s))
          const active = validActive ?? subs.find((s) => s.status === 'active') ?? subs[0] ?? null
          setSubscription(active)
          setResolvedStatus(hasActiveSubscription(subs), memberId)
          activePackageId = active?.packageId ?? undefined
        } else {
          const err = subsR.reason
          if (err?.response?.status === 401) {
            clearAuth()
            navigate('/login')
            return
          }
          setErrorSub(true)
        }

        /* Upcoming sessions */
        if (sessionsR.status === 'fulfilled') {
          setSessions(
            sessionsR.value.data
              .filter((session) => new Date(session.startTime).getTime() > now.getTime())
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          )
        } else {
          setErrorSessions(true)
        }

        /* Progress */
        if (progressR.status === 'fulfilled') {
          setProgress(progressR.value[0] ?? null)
        }

        /* Stats — attendance this month */
        if (attendanceR.status === 'fulfilled') {
          setSessionsThisMonth(attendanceR.value.total)
        }

        /* Active workout plan */
        if (workoutR.status === 'fulfilled') {
          const res = workoutR.value as {
            data: { data?: { plan?: { name: string }; notes?: string }[] }
          }
          const list = res.data?.data ?? []
          const latest = list[0] ?? null
          setWorkoutPlan(
            latest?.plan ?? (latest ? { name: latest.notes ?? t('dashboard.defaultPlanName') } : null),
          )
        } else {
          setWorkoutPlan(null)
          setErrorPlan(true)
        }

        /* Recent feedbacks */
        if (feedbackR.status === 'fulfilled') {
          setFeedbacks(feedbackR.value.data)
        } else {
          const err = feedbackR.reason as { response?: { status?: number } }
          if (err?.response?.status !== 403) setErrorFeedbacks(true)
        }

        /* Profile (for trainer name + includesPt) */
        if (profileR.status === 'fulfilled') {
          const p = profileR.value
          setProfile(p)
          const activeSub =
            p.subscriptions?.find((s) => isSubscriptionActive(s)) ??
            p.subscriptions?.find((s) => s.status === 'active') ??
            p.subscriptions?.[0]
          if (activeSub !== undefined) {
            setActivePlanIncludesPt(activeSub.includesPt)
          }
        }

        /* Tất cả loading state về false cùng lúc → tất cả component hiện ra trong 1 render */
        setLoadingSub(false)
        setLoadingSessions(false)
        setLoadingProgress(false)
        setLoadingPlan(false)
        setLoadingFeedbacks(false)
        setLoadingProfile(false)

        /* Package detail — non-blocking, update card sau khi skeleton đã lift */
        if (activePackageId) {
          try {
            const pkg = await packageService.get(activePackageId)
            setPackageName(pkg.name)
            setDurationDays(pkg.durationDays)
            setActivePlanIncludesPt(pkg.includesPt ?? false)
          } catch {
            /* use packageName from subscription */
          }
        }
      },
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.memberId])

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Member workspace"
        title={t('dashboard.greeting', { name: user?.fullName ?? t('dashboard.greetingFallback') })}
        description={todayDescription}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        {/* ── LEFT: main content ── */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Subscription card */}
          <SubscriptionCard
            subscription={subscription}
            packageName={packageName}
            durationDays={durationDays}
            loading={loadingSub}
            error={errorSub}
          />

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {loadingProgress ? (
              <>
                {STAT_SKELETON_KEYS.map((i) => (
                  <Skeleton key={i} h={88} />
                ))}
              </>
            ) : (
              <>
                <MemberStatCard
                  icon={<Dumbbell size={18} />}
                  label={t('dashboard.stats.sessionsThisMonth')}
                  value={sessionsThisMonth}
                  hint={t('dashboard.stats.unitSession')}
                  to="/member/workout/sessions"
                />
                <MemberStatCard
                  icon={<CheckSquare size={18} />}
                  label={t('dashboard.stats.checkInsThisMonth')}
                  value={sessionsThisMonth}
                  hint={t('dashboard.stats.unitTimes')}
                  to="/member/attendance"
                />
                <MemberStatCard
                  icon={<Scale size={18} />}
                  label={t('dashboard.stats.currentWeight')}
                  value={progress?.weight ? `${Number(progress.weight).toFixed(1)} kg` : '—'}
                  to="/member/progress"
                />
                <MemberStatCard
                  icon={<Activity size={18} />}
                  label="BMI"
                  value={progress?.bmi ? Number(progress.bmi).toFixed(1) : '—'}
                  to="/member/progress"
                />
              </>
            )}
          </div>

          {/* Bottom 3 widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SessionsWidget sessions={sessions} loading={loadingSessions} error={errorSessions} />
            <WorkoutWidget plan={workoutPlan} loading={loadingPlan} error={errorPlan} />
            <FeedbackWidget
              feedbacks={feedbacks}
              loading={loadingFeedbacks}
              error={errorFeedbacks}
            />
          </div>
        </div>

        {/* ── RIGHT: PT info card (sticky) ── */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <PtInfoCard
            trainerName={profile?.trainerName ?? null}
            trainerPhone={profile?.primaryTrainer?.phone}
            trainerEmail={profile?.primaryTrainer?.email}
            activePlanIncludesPt={activePlanIncludesPt}
            loading={loadingProfile}
            onChooseTrainer={handleChooseTrainer}
            onRemoveTrainer={handleRemoveTrainer}
          />
        </aside>
      </div>
    </MemberPage>
  )
}
