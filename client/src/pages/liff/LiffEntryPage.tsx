import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { initLiff } from '@/lib/liff'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { getApiError } from '@/lib/api-error'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { getSafeMemberRedirect } from './liff-redirect'

export default function LiffEntryPage() {
  const { t, i18n } = useTranslation(['auth', 'common'])
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

        // Sync LINE user's language if the user hasn't explicitly set their locale
        const savedLocale = localStorage.getItem('gym-locale')
        if (!savedLocale && typeof liff.getLanguage === 'function') {
          const liffLang = liff.getLanguage() || ''
          const detectedLang = liffLang.toLowerCase().startsWith('ja') ? 'ja' : 'vi'
          if (i18n.language !== detectedLang) {
            await i18n.changeLanguage(detectedLang)
          }
          document.documentElement.lang = detectedLang
          localStorage.setItem('gym-locale', detectedLang)
        }

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
        if (!idToken) throw new Error(t('liff.idTokenError'))

        const { user, token } = await authService.lineLogin(idToken)
        if (cancelled) return

        setAuth(user, token, 'line')
        clearSubscription()
        navigate(redirectPath, { replace: true })
      } catch (err) {
        if (cancelled) return
        setError(getApiError(err, t('error.network', { ns: 'common' })))
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [clearSubscription, i18n, navigate, setAuth, t])

  return (
    <>
      <div className="fixed top-4 right-5 z-50">
        <LanguageSwitcher />
      </div>
      <div className="flex min-h-screen items-center justify-center bg-[#080e0b]">
        {error ? (
          <div className="text-center">
            <p className="text-error mb-4">{error}</p>
            <a href="/login" className="text-primary underline">
              {t('liff.backToLogin')}
            </a>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-on-surface-variant text-sm">{t('liff.loggingIn')}</p>
          </div>
        )}
      </div>
    </>
  )
}
