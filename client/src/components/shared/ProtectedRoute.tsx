import { Navigate, useLocation } from 'react-router-dom'
import { isLineInAppBrowser } from '@/lib/line-browser'
import { getSafeMemberRedirect } from '@/pages/liff/liff-redirect'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../stores/authStore'

interface Props {
  allowedRoles: Role[]
  children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const user = useAuthStore((state) => state.user)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const location = useLocation()

  // Chờ Zustand persist đọc xong localStorage trước khi quyết định redirect.
  // Nếu render ngay khi chưa hydrate, user = null → bị redirect sai khi reload.
  if (!hasHydrated) {
    return null // hoặc có thể trả về spinner nhỏ
  }

  if (!user) {
    const isMemberOnlyRoute = allowedRoles.length === 1 && allowedRoles[0] === 'member'
    if (isMemberOnlyRoute && isLineInAppBrowser()) {
      const currentPath = `${location.pathname}${location.search}${location.hash}`
      const redirectPath = getSafeMemberRedirect(currentPath)
      return <Navigate to={`/liff?redirect=${encodeURIComponent(redirectPath)}`} replace />
    }
    return <Navigate to="/login" replace />
  }

  if (!user.roles.some((r) => allowedRoles.includes(r as Role))) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
