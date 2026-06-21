import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '@/components/shared/Sidebar'
import Topbar from '@/components/shared/Topbar'
import { PageSkeleton } from '@/components/shared/PageUI'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { classifySubscriptionCheckError } from '@/stores/subscriptionStore'
import { authService } from '@/services/auth.service'
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry'

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const hasActiveSub = useSubscriptionStore((state) => state.hasActiveSub)
  const subscriptionStatus = useSubscriptionStore((state) => state.status)
  const checkedMemberId = useSubscriptionStore((state) => state.checkedMemberId)
  const checkSubscription = useSubscriptionStore((state) => state.check)
  const setSubscriptionError = useSubscriptionStore((state) => state.setError)
  const [showExpiryToast, setShowExpiryToast] = useState(false)
  const navigate = useNavigate()
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

  useSubscriptionExpiry(() => {
    if (!isMember) return
    setShowExpiryToast(true)
    toastTimerRef.current = setTimeout(() => {
      setShowExpiryToast(false)
      navigate('/member/subscription/setup', { replace: true })
    }, 3000)
  })

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },
    []
  )

  const showSidebar = isMember ? hasActiveSub === true : true

  return (
    <div
      className={`rogym-dashboard-layout min-h-screen bg-[#080e0b] ${showSidebar ? 'has-sidebar' : ''}`}
    >
      {showSidebar && <Sidebar />}
      <div className="flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          {showExpiryToast && (
            <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl bg-red-900/90 text-red-200 text-sm font-medium shadow-xl border border-red-700/40">
              Gói tập đã hết hạn. Đang chuyển về trang đăng ký...
            </div>
          )}
          <Suspense fallback={<PageSkeleton rows={4} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
