import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { FullScreenLoader } from '@/components/shared/Spinner'

const roleRouteMap: Record<string, string> = {
  member: '/member',
  staff: '/staff',
  trainer: '/trainer',
  owner: '/owner',
}

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (isAuthenticated && user) {
    const destination = roleRouteMap[user.roles[0]] ?? '/'
    return (
      <>
        <Navigate to={destination} replace />
        <FullScreenLoader />
      </>
    )
  }

  return (
    <>
      <div className="fixed top-4 right-5 z-50">
        <LanguageSwitcher />
      </div>
      <Suspense fallback={<FullScreenLoader />}>
        <Outlet />
      </Suspense>
    </>
  )
}
