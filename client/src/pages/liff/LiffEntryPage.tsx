import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { initLiff } from '@/lib/liff'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'

export default function LiffEntryPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const liff = await initLiff()

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        const idToken = liff.getIDToken()
        if (!idToken) throw new Error('Không lấy được LINE idToken')

        const { user, token } = await authService.lineLogin(idToken)
        if (cancelled) return

        setAuth(user, token)
        navigate('/member', { replace: true })
      } catch (err) {
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
