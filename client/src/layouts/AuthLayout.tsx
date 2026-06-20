import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

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
    return <Navigate to={destination} replace />
  }

  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-[#080e0b]" />}>
      <Outlet />
    </Suspense>
  )
}
