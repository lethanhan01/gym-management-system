import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { initLiff } from '@/lib/liff'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { getApiError } from '@/lib/api-error'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { extractLiffRedirectPath, getCleanLiffRedirectUri, storeLiffRedirectPath, consumeLiffRedirectPath } from './liff-redirect'

export default function LiffEntryPage() {
  const { t, i18n } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearSubscription = useSubscriptionStore((s) => s.clear)
  const [error, setError] = useState<string | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const MAX_ATTEMPTS = 3
  const CIRCUIT_BREAKER_DELAY = 5000

  useEffect(() => {
    let cancelled = false
    let lastAttemptTime = 0

    async function run() {
      // Circuit breaker logic
      if (attemptCount >= MAX_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - lastAttemptTime
        if (timeSinceLastAttempt < CIRCUIT_BREAKER_DELAY) {
          setError('Hệ thống đang bận. Vui lòng thử lại sau.')
          return
        }
      }

      try {
        const redirectPath = extractLiffRedirectPath(window.location.search)

        const liff = await initLiff()
        lastAttemptTime = Date.now()

        if (window.location.search.includes('liff.state') || window.location.search.includes('code=')) {
          const cleanUrl = `/liff?redirect=${encodeURIComponent(redirectPath)}`
          window.history.replaceState(null, '', cleanUrl)
        }

        // Luu redirect path vao sessionStorage truoc khi goi liff.login()
        // Chi dung khi phai redirect duoi nhu quen hoac da het session
        const redirectFromStorage = consumeLiffRedirectPath()

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

        const cleanRedirectUri = getCleanLiffRedirectUri()

        if (!liff.isLoggedIn()) {
          if (attemptCount >= MAX_ATTEMPTS) {
            setError('Đăng nhập thất bại sau nhiều lần thử. Vui lòng thử lại sau.')
            return
          }
          // Luu redirect path vao sessionStorage truoc khi di chuyen sang OAuth flow
          const pathToStore = redirectFromStorage || redirectPath
          storeLiffRedirectPath(pathToStore)
          liff.login({ redirectUri: cleanRedirectUri })
          setAttemptCount(prev => prev + 1)
          return
        }

        // Only logout & re-login if decoded ID token exists AND is actually expired
        const decoded = liff.getDecodedIDToken()
        if (decoded && typeof decoded.exp === 'number') {
          const expMs = decoded.exp * 1000
          if (expMs - 30_000 <= Date.now()) {
            if (attemptCount >= MAX_ATTEMPTS) {
              setError('Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang để tiếp tục.')
              return
            }
            // Luu redirect path vao sessionStorage truoc khi di chuyen sang OAuth flow
            const pathToStore = redirectFromStorage || redirectPath
            storeLiffRedirectPath(pathToStore)
            liff.logout()
            liff.login({ redirectUri: cleanRedirectUri })
            setAttemptCount(prev => prev + 1)
            return
          }
        }

        const idToken = liff.getIDToken()
        if (!idToken) throw new Error(t('liff.idTokenError'))

        const { user, token } = await authService.lineLogin(idToken)
        if (cancelled) return

        setAuth(user, token, 'line')
        clearSubscription()

        // Di chuyen toi redirect path tu sessionStorage (neu co), neu khong thi redirectPath tu URL
        const finalRedirectPath = redirectFromStorage || redirectPath
        navigate(finalRedirectPath, { replace: true })
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
            <div className="space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                {t('liff.retry')}
              </button>
              <a href="/login" className="btn-secondary">
                {t('liff.backToLogin')}
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-on-surface-variant text-sm">{t('liff.loggingIn')}</p>
            <p className="text-on-surface-variant text-xs mt-2 opacity-70">
              Thử lần {attemptCount}/{MAX_ATTEMPTS}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
