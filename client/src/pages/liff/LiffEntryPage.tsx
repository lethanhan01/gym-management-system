import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { initLiff } from '@/lib/liff'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { getSafeMemberRedirect } from './liff-redirect'

// DEBUG: đếm số lần run() để phát hiện StrictMode double-invoke (H-B). Bỏ sau khi xong.
let runCount = 0

export default function LiffEntryPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const clearSubscription = useSubscriptionStore((s) => s.clear)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const n = ++runCount
      const redirectPath = getSafeMemberRedirect(
        new URLSearchParams(window.location.search).get('redirect')
      )
      console.log(`[LIFF] run#${n} start, href=${window.location.href}`)
      try {
        const liff = await initLiff()
        console.log(`[LIFF] run#${n} init done, isLoggedIn=${liff.isLoggedIn()}`)

        if (!liff.isLoggedIn()) {
          console.log(`[LIFF] run#${n} -> login() (not logged in), redirectUri=${window.location.href}`)
          liff.login({ redirectUri: window.location.href })
          return
        }

        // LIFF cache id_token trong localStorage và không tự refresh. Ở lần mở lại,
        // access token còn hạn nên isLoggedIn() = true, nhưng id_token có thể đã quá exp
        // -> LINE verify trả 400 "IdToken expired". Phải logout rồi login lại để lấy token mới.
        // login() là no-op khi đang logged-in, nên bắt buộc logout() trước.
        const decoded = liff.getDecodedIDToken()
        const expMs = decoded?.exp ? decoded.exp * 1000 : 0
        console.log(`[LIFF] run#${n} decoded=${decoded ? 'yes' : 'null'} exp=${decoded?.exp} expired=${expMs - 30_000 <= Date.now()}`)
        if (expMs - 30_000 <= Date.now()) {
          console.log(`[LIFF] run#${n} -> logout()+login() (expired), redirectUri=${window.location.href}`)
          liff.logout()
          liff.login({ redirectUri: window.location.href })
          return
        }

        const idToken = liff.getIDToken()
        console.log(`[LIFF] run#${n} idToken present=${!!idToken}, calling lineLogin`)
        if (!idToken) throw new Error('Không lấy được LINE idToken')

        const { user, token } = await authService.lineLogin(idToken)
        if (cancelled) return

        setAuth(user, token)
        clearSubscription()
        navigate(redirectPath, { replace: true })
      } catch (err) {
        console.log(`[LIFF] run#${n} CATCH:`, err)
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Đăng nhập LINE thất bại')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

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
