import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  BarChart3,
  User,
  CalendarDays,
  CheckSquare,
  QrCode,
  Package,
  ClipboardCheck,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useWorkoutSessionControlStore } from '@/stores/workoutSessionControlStore'

interface BottomNavItem {
  to?: string
  onClick?: () => void
  icon: React.ReactNode
  label: string
  end?: boolean
  variant?: 'center'
  disabled?: boolean
  className?: string
}

function useBottomNavItems(): { items: BottomNavItem[]; effectiveRole?: string } {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  const hasActiveSub = useSubscriptionStore((s) => s.hasActiveSub)
  const controls = useWorkoutSessionControlStore((s) => s.controls)
  const { t: tCommon } = useTranslation('common')
  const { t: tMember } = useTranslation('member')
  const role = user?.roles[0]

  // Owner có thể đang ở staff mode khi truy cập route /staff/*
  const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff')
  const effectiveRole = isOwnerInStaffMode ? 'staff' : role

  const isWorkoutDaySessionPage =
    effectiveRole === 'member' &&
    Boolean(matchPath({ path: '/member/workout/create-session/day/:planDayId', end: true }, pathname))

  function getWorkoutCenterItem(): BottomNavItem {
    const status = controls?.status ?? 'idle'
    switch (status) {
      case 'running':
        return {
          onClick: () => controls?.pauseTimer(),
          icon: <Pause size={24} className="fill-current" />,
          label: tMember('workout.createSession.buttonStopWorkout'),
          variant: 'center',
          className: 'rogym-bottom-nav__item--workout-running',
        }
      case 'paused':
        return {
          onClick: () => controls?.resumeTimer(),
          icon: <Play size={24} className="fill-current ml-0.5" />,
          label: tMember('workout.createSession.buttonResumeWorkout'),
          variant: 'center',
          className: 'rogym-bottom-nav__item--workout-paused',
        }
      case 'saving':
        return {
          icon: <Loader2 size={24} className="animate-spin" />,
          label: tMember('workout.createSession.buttonSaving'),
          variant: 'center',
          disabled: true,
        }
      case 'save-error':
        return {
          onClick: () => controls?.retrySave(),
          icon: <RotateCcw size={24} />,
          label: tMember('workout.createSession.buttonRetrySave'),
          variant: 'center',
        }
      case 'completed':
        return {
          icon: <CheckCircle2 size={24} />,
          label: tCommon('status.completed'),
          variant: 'center',
          disabled: true,
        }
      case 'idle':
      default:
        return {
          onClick: () => controls?.startTimer(),
          icon: <Play size={24} className="fill-current ml-0.5" />,
          label: tMember('workout.createSession.buttonStartWorkout'),
          variant: 'center',
          className: 'rogym-bottom-nav__item--workout-idle',
        }
    }
  }

  const memberCenterItem: BottomNavItem = isWorkoutDaySessionPage
    ? getWorkoutCenterItem()
    : { to: '/member/check-in', icon: <QrCode size={24} />, label: tCommon('nav.checkIn'), variant: 'center' }

  const MAP: Record<string, BottomNavItem[]> = {
    member: [
      { to: '/member', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard'), end: true },
      { to: '/member/workout/plan', icon: <Dumbbell size={22} />, label: tCommon('nav.workout') },
      memberCenterItem,
      ...(hasActiveSub === true
        ? [{ to: '/member/subscription/current', icon: <Package size={22} />, label: tCommon('nav.subscription') }]
        : [{ to: '/member/subscription/setup', icon: <Package size={22} />, label: tCommon('nav.subscription') }]),
      { to: '/member/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
    trainer: [
      { to: '/trainer', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard'), end: true },
      { to: '/trainer/students', icon: <Users size={22} />, label: tCommon('nav.students') },
      { to: '/trainer/sessions', icon: <CalendarDays size={22} />, label: tCommon('nav.sessions') },
      { to: '/trainer/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
    staff: [
      { to: '/staff', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard'), end: true },
      { to: '/staff/members', icon: <Users size={22} />, label: tCommon('nav.members') },
      { to: '/staff/check-in', icon: <CheckSquare size={22} />, label: tCommon('nav.checkIn') },
      { to: '/staff/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
    owner: [
      { to: '/owner', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard'), end: true },
      { to: '/owner/staff', icon: <ClipboardCheck size={22} />, label: tCommon('nav.staff') },
      { to: '/owner/revenue', icon: <BarChart3 size={22} />, label: tCommon('nav.reports') },
      { to: '/owner/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
  }

  return { items: MAP[effectiveRole ?? ''] ?? [], effectiveRole }
}

export default function BottomNav() {
  const { items, effectiveRole } = useBottomNavItems()
  if (!items.length) return null
  const isMemberNav = effectiveRole === 'member'

  return (
    <nav
      className={`rogym-bottom-nav${isMemberNav ? ' rogym-bottom-nav--member' : ''}`}
      aria-label="Điều hướng chính"
    >
      {items.map((item, index) => {
        const itemKey = item.to ?? `action-${index}`
        const centerClass = item.variant === 'center' ? ' rogym-bottom-nav__item--center' : ''
        const customClass = item.className ? ` ${item.className}` : ''

        if (item.onClick || item.disabled) {
          return (
            <button
              key={itemKey}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              aria-label={item.label}
              className={`rogym-bottom-nav__item${centerClass} is-active bg-transparent border-0 cursor-pointer p-0 text-inherit font-inherit disabled:opacity-60 disabled:cursor-not-allowed${customClass}`}
            >
              {item.icon}
              <span className="rogym-bottom-nav__label">{item.label}</span>
            </button>
          )
        }

        return (
          <NavLink
            key={itemKey}
            to={item.to!}
            end={item.end}
            className={({ isActive }) =>
              `rogym-bottom-nav__item${centerClass}${isActive ? ' is-active' : ''}${customClass}`
            }
          >
            {item.icon}
            <span className="rogym-bottom-nav__label">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

