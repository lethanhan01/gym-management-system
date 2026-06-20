import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '@/components/shared/Sidebar'
import Topbar from '@/components/shared/Topbar'
import { PageSkeleton } from '@/components/shared/PageUI'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry'

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user)
  const hasActiveSub = useSubscriptionStore((state) => state.hasActiveSub)
  const setHasActiveSub = useSubscriptionStore((state) => state.setHasActiveSub)
  const [showExpiryToast, setShowExpiryToast] = useState(false)
  const navigate = useNavigate()
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isMember = user?.roles[0] === 'member'

  useEffect(() => {
    if (!isMember || hasActiveSub !== null || !user?.memberId) return
    subscriptionService
      .getByMember(user.memberId)
      .then((subs) => {
        const now = new Date()
        setHasActiveSub(subs.some((s) => s.status === 'active' && new Date(s.endDate) >= now))
      })
      .catch(() => {
        // Giữ null khi lỗi mạng tạm thời — không force redirect về setup
      })
  }, [isMember, hasActiveSub, user?.memberId, setHasActiveSub])

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
