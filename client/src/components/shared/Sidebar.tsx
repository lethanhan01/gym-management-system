import { useRef, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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

const BASE_SUBSCRIPTION_CHILDREN_ACTIVE: SubItem[] = [
  { label: 'Gói hiện tại', to: '/member/subscription/current' },
  { label: 'Gia hạn', to: '/member/subscription/renew' },
  { label: 'Lịch sử', to: '/member/subscription/history' },
]

const BASE_SUBSCRIPTION_CHILDREN_NONE: SubItem[] = [
  { label: 'Mua gói', to: '/member/subscription/setup' },
]

const BASE_SUBSCRIPTION_CHILDREN_ALL: SubItem[] = [
  { label: 'Gói hiện tại', to: '/member/subscription/current' },
  { label: 'Mua gói', to: '/member/subscription/setup' },
  { label: 'Gia hạn', to: '/member/subscription/renew' },
  { label: 'Lịch sử', to: '/member/subscription/history' },
]

const TRAINER_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/trainer', icon: <LayoutDashboard size={18} /> },
      { label: 'Học viên', to: '/trainer/students', icon: <Users size={18} /> },
      { label: 'Lịch dạy', to: '/trainer/sessions', icon: <CalendarDays size={18} /> },
      { label: 'Kế hoạch', to: '/trainer/plans', icon: <BookOpen size={18} /> },
      { label: 'Bài tập', to: '/trainer/exercises', icon: <Dumbbell size={18} /> },
      { label: 'Hồ sơ', to: '/trainer/profile', icon: <User size={18} /> },
    ],
  },
]

const STAFF_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/staff', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    label: 'Hội viên',
    items: [
      { label: 'Danh sách hội viên', to: '/staff/members', icon: <Users size={18} /> },
      { label: 'Đăng ký hội viên', to: '/staff/members/register', icon: <User size={18} /> },
      { label: 'Gói tập & Gia hạn', to: '/staff/renewal', icon: <RotateCcw size={18} /> },
      { label: 'Check-in hội viên', to: '/staff/check-in', icon: <CheckSquare size={18} /> },
    ],
  },
  {
    label: 'Cơ sở vật chất',
    items: [
      { label: 'Phòng tập', to: '/staff/facility', icon: <Building2 size={18} /> },
      { label: 'Thiết bị', to: '/staff/equipment', icon: <Wrench size={18} /> },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { label: 'Phản hồi', to: '/staff/feedback', icon: <MessageSquare size={18} /> },
    ],
  },
  {
    label: 'Cá nhân',
    items: [
      { label: 'Lịch làm việc', to: '/staff/schedules', icon: <CalendarDays size={18} /> },
      { label: 'Chấm công', to: '/staff/attendance', icon: <ClipboardCheck size={18} /> },
      { label: 'Hồ sơ', to: '/staff/profile', icon: <User size={18} /> },
    ],
  },
]

const OWNER_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/owner', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    label: 'Nhân sự',
    items: [
      { label: 'Danh sách nhân sự', to: '/owner/staff', icon: <Users size={18} /> },
      { label: 'Thêm nhân sự', to: '/owner/staff/new', icon: <UserPlus size={18} /> },
      { label: 'Lịch phân công', to: '/owner/staff/schedules', icon: <CalendarDays size={18} /> },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { label: 'Gói tập', to: '/owner/packages', icon: <Package size={18} /> },
      {
        label: 'Báo cáo',
        to: '/owner/revenue',
        icon: <BarChart3 size={18} />,
        children: [
          { label: 'Doanh thu', to: '/owner/revenue' },
          { label: 'Hóa đơn giao dịch', to: '/owner/reports/transaction-invoices' },
          { label: 'Hiệu suất nhân viên', to: '/owner/reports/employee-performance' },
        ],
      },
    ],
  },
  {
    label: 'Cơ sở vật chất',
    items: [
      { label: 'Thiết bị', to: '/owner/equipment', icon: <Wrench size={18} /> },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      {
        label: 'Phân quyền',
        to: '/owner/rbac/groups',
        icon: <Shield size={18} />,
        children: [
          { label: 'Nhóm quyền', to: '/owner/rbac/groups' },
          { label: 'Quyền hạn', to: '/owner/rbac/permissions' },
        ],
      },
      { label: 'Hồ sơ', to: '/owner/profile', icon: <User size={18} /> },
    ],
  },
]

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

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const hasActiveSub = useSubscriptionStore((s) => s.hasActiveSub)
  const clearSubscription = useSubscriptionStore((s) => s.clear)

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
    const subscriptionChildren =
      hasActiveSub === false
        ? BASE_SUBSCRIPTION_CHILDREN_NONE
        : hasActiveSub === true
          ? BASE_SUBSCRIPTION_CHILDREN_ACTIVE
          : BASE_SUBSCRIPTION_CHILDREN_ALL
    const memberSubTo =
      hasActiveSub === false ? '/member/subscription/setup' : '/member/subscription/current'

    return [
      {
        items: [
          { label: 'Dashboard', to: '/member', icon: <LayoutDashboard size={18} /> },
          {
            label: 'Gói tập',
            to: memberSubTo,
            icon: <CreditCard size={18} />,
            children: subscriptionChildren,
          },
          {
            label: 'Kế hoạch tập',
            to: '/member/workout/plan',
            icon: <BookOpen size={18} />,
            children: [
              { label: 'Kế hoạch', to: '/member/workout/plan' },
              { label: 'Tạo kế hoạch', to: '/member/workout/builder' },
              { label: 'Bài tập', to: '/member/workout/exercises' },
            ],
          },
          {
            label: 'Tập luyện',
            to: '/member/workout/sessions',
            icon: <CalendarDays size={18} />,
            children: [
              { label: 'Lịch của tôi', to: '/member/workout/sessions' },
              { label: 'Tạo buổi tập', to: '/member/workout/create-session' },
              { label: 'Lịch sử buổi tập', to: '/member/workout/history' },
            ],
          },
          { label: 'Check-in', to: '/member/attendance', icon: <CheckSquare size={18} /> },
          { label: 'Tiến độ', to: '/member/progress', icon: <TrendingUp size={18} /> },
          {
            label: 'Phản hồi',
            to: '/member/feedback',
            icon: <MessageSquare size={18} />,
            children: [
              { label: 'Phản hồi của tôi', to: '/member/feedback' },
              { label: 'Gửi phản hồi', to: '/member/feedback/send' },
            ],
          },
          { label: 'Hồ sơ', to: '/member/profile', icon: <User size={18} /> },
        ],
      },
    ]
  }, [hasActiveSub])

  const navSections: NavSection[] =
    role === 'member'
      ? memberNav
      : role === 'trainer'
        ? TRAINER_SECTIONS
        : role === 'staff' || isOwnerInStaffMode
          ? STAFF_SECTIONS
          : role === 'owner'
            ? OWNER_SECTIONS
            : []

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`rogym-sidebar ${expanded ? 'is-expanded' : ''}`}
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
              title={!expanded ? 'Quay về Owner' : undefined}
              className="rogym-sidebar__mode-button w-full flex items-center rounded-xl border border-[rgba(66,224,158,0.2)] text-xs font-medium text-[#42e09e]"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span className="rogym-sidebar__mode-label">Quay về Owner</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/staff')}
              title={!expanded ? 'Chế độ vận hành' : undefined}
              className="rogym-sidebar__mode-button w-full flex items-center rounded-xl border border-[rgba(255,255,255,0.1)] text-xs font-medium text-[#bbcabf]"
            >
              <Settings size={14} className="shrink-0" />
              <span className="rogym-sidebar__mode-label">Chế độ vận hành</span>
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
