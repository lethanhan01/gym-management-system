import { useRef, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useSubscriptionStore } from '../../stores/subscriptionStore'
import {
  LayoutDashboard,
  User,
  CreditCard,
  Dumbbell,
  TrendingUp,
  MessageSquare,
  Users,
  CheckSquare,
  Building2,
  ClipboardCheck,
  Wrench,
  Package,
  Shield,
  BarChart3,
  CalendarDays,
  BookOpen,
  ArrowLeft,
  Settings,
  RotateCcw,
  UserPlus,
} from 'lucide-react'

type SubItem = { label: string; to: string }

type NavItem = {
  label: string
  to: string
  icon: React.ReactNode
  children?: SubItem[]
}

type NavSection = {
  label?: string
  items: NavItem[]
}

function isGroupActive(item: NavItem, pathname: string): boolean {
  if (!item.children) return false
  return item.children.some((c) => pathname === c.to || pathname.startsWith(c.to + '/'))
}

function NavItems({ sections, expanded }: { sections: NavSection[]; expanded: boolean }) {
  const { pathname } = useLocation()

  return (
    <nav className="flex flex-col gap-1 px-2">
      {sections.map((section, si) => (
        <div key={si} className={si > 0 ? 'mt-1' : ''}>
          {section.label && (
            <div className="rogym-sidebar__section-label">
              {section.label}
            </div>
          )}
          <div className="flex flex-col gap-1">
          {section.items.map((item) => {
            const hasChildren = !!item.children?.length
            const groupActive = hasChildren && isGroupActive(item, pathname)
            const showChildren = expanded && hasChildren && groupActive

            return (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  end={!hasChildren}
                  title={!expanded ? item.label : undefined}
                  className={({ isActive }) => {
                    const active = hasChildren ? groupActive : isActive
                    return `rogym-sidebar__nav-link rogym-sweep flex items-center py-2.5 rounded-xl text-sm font-medium ${
                      expanded ? 'px-3' : 'justify-center px-0'
                    } ${active ? 'bg-[#06c384]/15 text-[#42e09e]' : 'text-[#bbcabf] hover:text-white'}`
                  }}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="rogym-sidebar__label">{item.label}</span>
                </NavLink>

                {/* Sub-items — chỉ hiện khi expanded VÀ group đang active */}
                {hasChildren && (
                  <div className={`rogym-sidebar__subnav ${showChildren ? 'is-open' : ''}`}>
                    <div className="flex flex-col gap-0.5 pl-3 pr-1 pt-1 pb-1">
                      {item.children!.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          className={({ isActive }) =>
                            [
                              `rogym-sweep flex items-center rounded-lg text-xs font-medium px-3 ${
                                isActive
                                  ? 'text-[#42e09e] bg-[#06c384]/10'
                                  : 'text-[#bbcabf] hover:text-white'
                              }`,
                              'rogym-sx-8bbf0968',
                            ]
                              .filter(Boolean)
                              .join(' ')
                          }
                        >
                          <span className="rogym-sx-287036c1" />
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export default function Sidebar({
  isMobileOpen = false,
  onCloseMobile,
}: {
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Đóng sidebar khi route thay đổi (người dùng nhấn link trên mobile)
  useEffect(() => {
    onCloseMobile?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
  const hasActiveSub = useSubscriptionStore((s) => s.hasActiveSub)
  const clearSubscription = useSubscriptionStore((s) => s.clear)
  const { t: tMember } = useTranslation('member')
  const { t: tTrainer } = useTranslation('trainer')
  const { t: tStaff } = useTranslation('staff')
  const { t: tOwner } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')

  // Clear subscription state on logout
  useEffect(() => {
    if (!isAuthenticated) clearSubscription()
  }, [isAuthenticated, clearSubscription])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function handleMouseEnter() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setExpanded(true)
  }

  function handleMouseLeave() {
    closeTimerRef.current = setTimeout(() => setExpanded(false), 1000)
  }

  const role = user?.roles[0]
  const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff')

  const memberNav = useMemo<NavSection[]>(() => {
    const childrenActive: SubItem[] = [
      { label: tMember('nav.current'), to: '/member/subscription/current' },
      { label: tMember('nav.renew'), to: '/member/subscription/renew' },
      { label: tMember('nav.history'), to: '/member/subscription/history' },
    ]
    const childrenNone: SubItem[] = [
      { label: tMember('nav.buy'), to: '/member/subscription/setup' },
    ]
    const childrenAll: SubItem[] = [
      { label: tMember('nav.current'), to: '/member/subscription/current' },
      { label: tMember('nav.buy'), to: '/member/subscription/setup' },
      { label: tMember('nav.renew'), to: '/member/subscription/renew' },
      { label: tMember('nav.history'), to: '/member/subscription/history' },
    ]
    const subscriptionChildren =
      hasActiveSub === false
        ? childrenNone
        : hasActiveSub === true
          ? childrenActive
          : childrenAll
    const memberSubTo =
      hasActiveSub === false ? '/member/subscription/setup' : '/member/subscription/current'

    return [
      {
        items: [
          { label: tCommon('nav.dashboard'), to: '/member', icon: <LayoutDashboard size={18} /> },
          {
            label: tMember('nav.subscriptionMenu'),
            to: memberSubTo,
            icon: <CreditCard size={18} />,
            children: subscriptionChildren,
          },
          {
            label: tMember('nav.workoutPlan'),
            to: '/member/workout/plan',
            icon: <BookOpen size={18} />,
            children: [
              { label: tMember('nav.workoutPlanSub'), to: '/member/workout/plan' },
              { label: tMember('nav.workoutCreate'), to: '/member/workout/builder' },
              { label: tMember('nav.workoutExercises'), to: '/member/workout/exercises' },
            ],
          },
          {
            label: tMember('nav.workoutSessions'),
            to: '/member/workout/sessions',
            icon: <CalendarDays size={18} />,
            children: [
              { label: tMember('nav.mySchedule'), to: '/member/workout/sessions' },
              { label: tMember('nav.createSession'), to: '/member/workout/create-session' },
              { label: tMember('nav.workoutHistory'), to: '/member/workout/history' },
            ],
          },
          { label: tMember('nav.checkIn'), to: '/member/attendance', icon: <CheckSquare size={18} /> },
          { label: tMember('nav.progress'), to: '/member/progress', icon: <TrendingUp size={18} /> },
          {
            label: tMember('nav.feedback'),
            to: '/member/feedback',
            icon: <MessageSquare size={18} />,
            children: [
              { label: tMember('nav.feedbackMine'), to: '/member/feedback' },
              { label: tMember('nav.feedbackSend'), to: '/member/feedback/send' },
            ],
          },
          { label: tCommon('nav.profile'), to: '/member/profile', icon: <User size={18} /> },
        ],
      },
    ]
  }, [hasActiveSub, tMember, tCommon])

  const trainerSections: NavSection[] = [
    {
      items: [
        { label: tCommon('nav.dashboard'), to: '/trainer', icon: <LayoutDashboard size={18} /> },
        { label: tTrainer('nav.students'), to: '/trainer/students', icon: <Users size={18} /> },
        { label: tTrainer('nav.sessions'), to: '/trainer/sessions', icon: <CalendarDays size={18} /> },
        { label: tTrainer('nav.plans'), to: '/trainer/plans', icon: <BookOpen size={18} /> },
        { label: tTrainer('nav.exercises'), to: '/trainer/exercises', icon: <Dumbbell size={18} /> },
        { label: tCommon('nav.profile'), to: '/trainer/profile', icon: <User size={18} /> },
      ],
    },
  ]

  const staffSections: NavSection[] = [
    {
      items: [
        { label: tCommon('nav.dashboard'), to: '/staff', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      label: tStaff('nav.sectionMembers'),
      items: [
        { label: tStaff('nav.members'), to: '/staff/members', icon: <Users size={18} /> },
        { label: tStaff('nav.registerMember'), to: '/staff/members/register', icon: <User size={18} /> },
        { label: tStaff('nav.renewal'), to: '/staff/renewal', icon: <RotateCcw size={18} /> },
        { label: tStaff('nav.checkIn'), to: '/staff/check-in', icon: <CheckSquare size={18} /> },
      ],
    },
    {
      label: tStaff('nav.sectionFacility'),
      items: [
        { label: tStaff('nav.facility'), to: '/staff/facility', icon: <Building2 size={18} /> },
        { label: tStaff('nav.equipment'), to: '/staff/equipment', icon: <Wrench size={18} /> },
      ],
    },
    {
      label: tStaff('nav.sectionOperations'),
      items: [
        { label: tStaff('nav.feedback'), to: '/staff/feedback', icon: <MessageSquare size={18} /> },
      ],
    },
    {
      label: tStaff('nav.sectionPersonal'),
      items: [
        { label: tStaff('nav.schedule'), to: '/staff/schedules', icon: <CalendarDays size={18} /> },
        { label: tStaff('nav.attendance'), to: '/staff/attendance', icon: <ClipboardCheck size={18} /> },
        { label: tCommon('nav.profile'), to: '/staff/profile', icon: <User size={18} /> },
      ],
    },
  ]

  const ownerSections: NavSection[] = [
    {
      items: [
        { label: tCommon('nav.dashboard'), to: '/owner', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      label: tOwner('nav.sectionStaff'),
      items: [
        { label: tOwner('nav.staff'), to: '/owner/staff', icon: <Users size={18} /> },
        { label: tOwner('nav.addStaff'), to: '/owner/staff/new', icon: <UserPlus size={18} /> },
        { label: tOwner('nav.schedules'), to: '/owner/staff/schedules', icon: <CalendarDays size={18} /> },
      ],
    },
    {
      label: tOwner('nav.sectionBusiness'),
      items: [
        { label: tOwner('nav.packages'), to: '/owner/packages', icon: <Package size={18} /> },
        {
          label: tOwner('nav.reports'),
          to: '/owner/revenue',
          icon: <BarChart3 size={18} />,
          children: [
            { label: tOwner('nav.revenue'), to: '/owner/revenue' },
            { label: tOwner('nav.invoices'), to: '/owner/reports/transaction-invoices' },
            { label: tOwner('nav.performance'), to: '/owner/reports/employee-performance' },
          ],
        },
      ],
    },
    {
      label: tOwner('nav.sectionFacility'),
      items: [
        { label: tOwner('nav.equipment'), to: '/owner/equipment', icon: <Wrench size={18} /> },
      ],
    },
    {
      label: tOwner('nav.sectionSystem'),
      items: [
        {
          label: tOwner('nav.rbac'),
          to: '/owner/rbac/groups',
          icon: <Shield size={18} />,
          children: [
            { label: tOwner('nav.rbacGroups'), to: '/owner/rbac/groups' },
            { label: tOwner('nav.rbacPermissions'), to: '/owner/rbac/permissions' },
          ],
        },
        { label: tCommon('nav.profile'), to: '/owner/profile', icon: <User size={18} /> },
      ],
    },
  ]

  const navSections: NavSection[] =
    role === 'member'
      ? memberNav
      : role === 'trainer'
        ? trainerSections
        : role === 'staff' || isOwnerInStaffMode
          ? staffSections
          : role === 'owner'
            ? ownerSections
            : []

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`rogym-sidebar ${expanded ? 'is-expanded' : ''} ${isMobileOpen ? 'is-mobile-open' : ''}`}
    >
      {/* Logo */}
      <div className="rogym-sidebar__logo flex items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06c384]">
          <Dumbbell size={16} strokeWidth={2.2} className="text-white" />
        </div>
        <span className="rogym-sidebar__brand">ROGYM</span>
      </div>

      {/* Owner mode switch */}
      {role === 'owner' && (
        <div className="px-2 pt-1 rogym-sx-c2bafe49">
          {isOwnerInStaffMode ? (
            <button
              onClick={() => navigate('/owner')}
              title={!expanded ? tOwner('nav.modeBack') : undefined}
              className="rogym-sidebar__mode-button w-full flex items-center rounded-xl border border-[rgba(66,224,158,0.2)] text-xs font-medium text-[#42e09e]"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span className="rogym-sidebar__mode-label">{tOwner('nav.modeBack')}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/staff')}
              title={!expanded ? tOwner('nav.modeOperation') : undefined}
              className="rogym-sidebar__mode-button w-full flex items-center rounded-xl border border-[rgba(255,255,255,0.1)] text-xs font-medium text-[#bbcabf]"
            >
              <Settings size={14} className="shrink-0" />
              <span className="rogym-sidebar__mode-label">{tOwner('nav.modeOperation')}</span>
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <NavItems sections={navSections} expanded={expanded} />
      </div>
    </aside>
  )
}
