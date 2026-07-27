import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { initLiff } from '@/lib/liff'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { getApiError } from '@/lib/api-error'
import { getSafeMemberRedirect } from './liff-redirect'

export default function LiffEntryPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearSubscription = useSubscriptionStore((s) => s.clear)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const redirectPath = getSafeMemberRedirect(
        new URLSearchParams(window.location.search).get('redirect')
      )
      try {
        const liff = await initLiff()

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        // LIFF cache id_token trong localStorage và không tự refresh. Ở lần mở lại,
        // access token còn hạn nên isLoggedIn() = true, nhưng id_token có thể đã quá exp
        // -> LINE verify trả 400 "IdToken expired". Phải logout rồi login lại để lấy token mới.
        // login() là no-op khi đang logged-in, nên bắt buộc logout() trước.
        const decoded = liff.getDecodedIDToken()
        const expMs = decoded?.exp ? decoded.exp * 1000 : 0
        if (expMs - 30_000 <= Date.now()) {
          liff.logout()
          liff.login({ redirectUri: window.location.href })
          return
        }

        const idToken = liff.getIDToken()
        if (!idToken) throw new Error('Không lấy được LINE idToken')

        const { user, token } = await authService.lineLogin(idToken)
        if (cancelled) return

        setAuth(user, token)
        clearSubscription()
        navigate(redirectPath, { replace: true })
      } catch (err) {
        if (cancelled) return
        setError(getApiError(err, 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.'))
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [clearSubscription, navigate, setAuth])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080e0b]">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <a href="/login" className="text-primary underline">
            Quay về đăng nhập
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080e0b]">
      <div className="text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-on-surface-variant text-sm">Đang đăng nhập bằng LINE...</p>
      </div>
    </div>
  )
}
