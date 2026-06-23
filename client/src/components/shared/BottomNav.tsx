import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  BarChart3,
  User,
  CalendarDays,
  CheckSquare,
  Package,
  ClipboardCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

interface BottomNavItem {
  to: string
  icon: React.ReactNode
  label: string
}

function useBottomNavItems(): BottomNavItem[] {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  const hasActiveSub = useSubscriptionStore((s) => s.hasActiveSub)
  const { t: tCommon } = useTranslation('common')
  const role = user?.roles[0]

  // Owner có thể đang ở staff mode khi truy cập route /staff/*
  const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff')
  const effectiveRole = isOwnerInStaffMode ? 'staff' : role

  const MAP: Record<string, BottomNavItem[]> = {
    member: [
      { to: '/member/dashboard', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard') },
      { to: '/member/workout/my-plan', icon: <Dumbbell size={22} />, label: tCommon('nav.workout') },
      ...(hasActiveSub === true
        ? [{ to: '/member/subscription/current', icon: <Package size={22} />, label: tCommon('nav.subscription') }]
        : [{ to: '/member/subscription/setup', icon: <Package size={22} />, label: tCommon('nav.subscription') }]),
      { to: '/member/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
    trainer: [
      { to: '/trainer/dashboard', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard') },
      { to: '/trainer/students', icon: <Users size={22} />, label: tCommon('nav.students') },
      { to: '/trainer/sessions', icon: <CalendarDays size={22} />, label: tCommon('nav.sessions') },
      { to: '/trainer/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
    staff: [
      { to: '/staff/dashboard', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard') },
      { to: '/staff/members', icon: <Users size={22} />, label: tCommon('nav.members') },
      { to: '/staff/check-in', icon: <CheckSquare size={22} />, label: tCommon('nav.checkIn') },
      { to: '/staff/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
    owner: [
      { to: '/owner/dashboard', icon: <LayoutDashboard size={22} />, label: tCommon('nav.dashboard') },
      { to: '/owner/staff-management', icon: <ClipboardCheck size={22} />, label: tCommon('nav.staff') },
      { to: '/owner/reports/revenue', icon: <BarChart3 size={22} />, label: tCommon('nav.reports') },
      { to: '/owner/profile', icon: <User size={22} />, label: tCommon('nav.profile') },
    ],
  }

  return MAP[effectiveRole ?? ''] ?? []
}

export default function BottomNav() {
  const items = useBottomNavItems()
  if (!items.length) return null

  return (
    <nav className="rogym-bottom-nav" aria-label="Điều hướng chính">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `rogym-bottom-nav__item${isActive ? ' is-active' : ''}`
          }
        >
          {item.icon}
          <span className="rogym-bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
