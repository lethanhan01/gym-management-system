import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/shared/Sidebar'
import Topbar from '@/components/shared/Topbar'
import BottomNav from '@/components/shared/BottomNav'
import { toast } from '@/lib/toast'
import { PageLoader } from '@/components/shared/Spinner'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import {
  classifySubscriptionCheckError,
  useSubscriptionStore,
} from '@/stores/subscriptionStore'
import { authService } from '@/services/auth.service'
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry'

const MEMBER_SUBSCRIPTION_SETUP_PATH = '/member/subscription/setup'
const EXPIRED_MEMBER_ALLOWED_PATHS = new Set([
  MEMBER_SUBSCRIPTION_SETUP_PATH,
  '/member/subscription/buy',
  '/member/subscription/buy/payment',
])

function canExpiredMemberAccess(pathname: string): boolean {
  return EXPIRED_MEMBER_ALLOWED_PATHS.has(pathname)
}

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const hasActiveSub = useSubscriptionStore((state) => state.hasActiveSub)
  const subscriptionStatus = useSubscriptionStore((state) => state.status)
  const checkedMemberId = useSubscriptionStore((state) => state.checkedMemberId)
  const checkSubscription = useSubscriptionStore((state) => state.check)
  const setSubscriptionError = useSubscriptionStore((state) => state.setError)
  const navigate = useNavigate()
  const location = useLocation()
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshedUserIdRef = useRef<string | null>(null)

  const isMember = user?.roles.includes('member') ?? false

  useEffect(() => {
    if (!isMember) return

    const memberId = user?.memberId ? String(user.memberId) : null
    if (memberId) {
      if (checkedMemberId === memberId && subscriptionStatus !== 'idle') return
      void checkSubscription(memberId).catch(() => {
        // Store owns the terminal error state; the guard renders it with retry controls.
      })
      return
    }

    const userId = user?.userId
    if (!userId || refreshedUserIdRef.current === userId) return
    refreshedUserIdRef.current = userId
    let cancelled = false

    void authService
      .me()
      .then((refreshedUser) => {
        if (cancelled) return
        setUser(refreshedUser)
        if (refreshedUser.roles.includes('member') && !refreshedUser.memberId) {
          setSubscriptionError('missing_member_profile')
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const code = classifySubscriptionCheckError(error)
        setSubscriptionError(code === 'unknown' ? 'missing_member_profile' : code)
      })

    return () => {
      cancelled = true
    }
  }, [
    checkSubscription,
    checkedMemberId,
    isMember,
    setSubscriptionError,
    setUser,
    subscriptionStatus,
    user?.memberId,
    user?.userId,
  ])

  useEffect(() => {
    if (!isMember || subscriptionStatus !== 'success' || hasActiveSub !== false) return
    if (canExpiredMemberAccess(location.pathname)) return

    navigate(MEMBER_SUBSCRIPTION_SETUP_PATH, { replace: true })
  }, [hasActiveSub, isMember, location.pathname, navigate, subscriptionStatus])

  useSubscriptionExpiry(() => {
    if (!isMember) return
    toast.error('Gói tập đã hết hạn. Đang chuyển về trang đăng ký...')
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      navigate(MEMBER_SUBSCRIPTION_SETUP_PATH, { replace: true })
    }, 3000)
  })

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },
    []
  )

  const showSidebar = isMember ? hasActiveSub === true : true

  // Trạng thái drawer mobile — chỉ có hiệu lực khi viewport < 768px
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div
      className={`rogym-dashboard-layout min-h-screen bg-[#080e0b] ${showSidebar ? 'has-sidebar' : ''}`}
    >
      {showSidebar && (
        <>
          {/* Backdrop — chỉ hiện trên mobile khi drawer mở */}
          {isSidebarOpen && (
            <button
              className="rogym-sidebar-backdrop md:hidden"
              aria-label="Đóng menu điều hướng"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <Sidebar isMobileOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} />
        </>
      )}
      <div className="flex flex-col min-h-screen">
        <Topbar />
        {/* Hamburger button — chỉ hiện trên mobile khi có sidebar */}
        {showSidebar && (
          <Button
            variant="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-[14px] left-4 z-40 md:hidden flex items-center justify-center w-11 h-11 border border-white/10 text-white"
            style={{ background: 'var(--rogym-bg-card)' }}
            aria-label="Mở menu điều hướng"
          >
            <Menu size={20} />
          </Button>
        )}
        <main className="flex-1 overflow-auto px-6 pt-20 pb-24 md:px-6 md:pt-20 md:pb-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
