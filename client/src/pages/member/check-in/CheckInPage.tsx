import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { CheckCircle2, History, RefreshCcw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import { formatTime } from '@/lib/date'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import { MemberErrorState, MemberPage, MemberPageHeader } from '@/components/MemberUI'
import { Button } from '@/components/ui'

type ScanState = 'idle' | 'starting' | 'scanning' | 'blocked' | 'stopped'

export default function CheckInPage() {
  const { t } = useTranslation('member')
  const { t: tCommon } = useTranslation('common')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const submittedRef = useRef(false)
  const checkingRef = useRef(false)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastLog, setLastLog] = useState<AttendanceLog | null>(null)
  const [successOverlayOpen, setSuccessOverlayOpen] = useState(false)

  useEffect(() => {
    checkingRef.current = checking
  }, [checking])

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanState((state) => (state === 'scanning' || state === 'starting' ? 'stopped' : state))
  }, [])

  const closeSuccessOverlay = useCallback(() => {
    setSuccessOverlayOpen(false)
  }, [])

  const submitToken = useCallback(
    async (token: string) => {
      const normalized = token.trim()
      if (!normalized || checkingRef.current || submittedRef.current) return
      submittedRef.current = true
      setChecking(true)
      setError(null)
      setLastLog(null)
      setSuccessOverlayOpen(false)
      stopScanner()
      try {
        const log = await trainingService.qrCheckin(normalized)
        setLastLog(log)
        setSuccessOverlayOpen(true)
      } catch (err) {
        setSuccessOverlayOpen(false)
        const code = getApiErrorCode(err)
        const message =
          code === 'QR_TOKEN_EXPIRED'
            ? t('qrCheckIn.errorExpired')
            : code === 'QR_TOKEN_INVALID'
              ? t('qrCheckIn.errorInvalid')
              : code === 'MEMBER_NO_ACTIVE_SUBSCRIPTION'
                ? t('qrCheckIn.errorNoSub')
                : getApiError(err, t('qrCheckIn.errorDefault'))
        setError(message)
        submittedRef.current = false
      } finally {
        setChecking(false)
      }
    },
    [stopScanner, t]
  )

  const startScanner = useCallback(async () => {
    if (!videoRef.current || checkingRef.current) return
    submittedRef.current = false
    setLastLog(null)
    setSuccessOverlayOpen(false)
    setError(null)
    setScanState('starting')

    try {
      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          const text = result?.getText()
          if (text) void submitToken(text)
        }
      )
      controlsRef.current = controls
      setScanState('scanning')
    } catch {
      setSuccessOverlayOpen(false)
      setScanState('blocked')
      setError(t('qrCheckIn.errorCamera'))
    }
  }, [submitToken, t])

  useEffect(() => {
    if (!lastLog || !successOverlayOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSuccessOverlay()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeSuccessOverlay, lastLog, successOverlayOpen])

  useEffect(() => {
    void startScanner()
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [startScanner])

  function handleScanAgain() {
    submittedRef.current = false
    setSuccessOverlayOpen(false)
    setLastLog(null)
    setError(null)
    void startScanner()
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('qrCheckIn.eyebrow')}
        title={t('qrCheckIn.title')}
        description={t('qrCheckIn.description')}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rogym-card rogym-card--compact overflow-hidden p-0">
          <div className="relative aspect-[4/3] min-h-[280px] overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              aria-label={t('qrCheckIn.cameraLabel')}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative z-10 aspect-square w-[min(64%,224px)] max-w-[calc(100%-72px)] rounded-[28px] border-2 border-[#42e09e] shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              {scanState === 'starting'
                ? t('qrCheckIn.statusStarting')
                : scanState === 'scanning'
                  ? t('qrCheckIn.statusScanning')
                  : scanState === 'blocked'
                    ? t('qrCheckIn.statusBlocked')
                    : t('qrCheckIn.statusStopped')}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-5">
            <Button type="button" onClick={handleScanAgain} disabled={checking}>
              <RefreshCcw size={16} />
              {t('qrCheckIn.scanAgain')}
            </Button>
            <Link className="rogym-text-link rogym-text-link--accent text-sm" to="/member/attendance">
              <History size={15} className="inline-block" /> {t('qrCheckIn.viewHistory')}
            </Link>
          </div>
        </section>

        <div className="space-y-5">
          {lastLog && (
            <section className="rogym-card rogym-card--compact hidden border-[rgba(6,195,132,0.3)] p-6 md:block">
              <div className="mb-4 flex items-center gap-3 rogym-text-accent">
                <CheckCircle2 size={24} />
                <span className="font-bold">{t('qrCheckIn.successTitle')}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="rogym-text-dim">{t('qrCheckIn.member')}</span>
                  <span className="text-right font-semibold text-white">{lastLog.memberName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="rogym-text-dim">{t('qrCheckIn.checkedInAt')}</span>
                  <span className="text-white">{formatTime(lastLog.startTime)}</span>
                </div>
              </div>
            </section>
          )}

          {error && <MemberErrorState message={error} onRetry={handleScanAgain} />}
        </div>
      </div>

      {lastLog && successOverlayOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-check-in-success-title"
          onClick={closeSuccessOverlay}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[rgba(6,195,132,0.3)] bg-[var(--rogym-bg-card)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 rogym-text-accent">
                <CheckCircle2 size={28} />
                <h2 id="member-check-in-success-title" className="text-lg font-bold text-white">
                  {t('qrCheckIn.successTitle')}
                </h2>
              </div>
              <Button
                type="button"
                variant="icon"
                onClick={closeSuccessOverlay}
                aria-label={tCommon('button.close')}
              >
                <X size={17} />
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="rogym-text-dim">{t('qrCheckIn.member')}</span>
                <span className="text-right font-semibold text-white">{lastLog.memberName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="rogym-text-dim">{t('qrCheckIn.checkedInAt')}</span>
                <span className="text-white">{formatTime(lastLog.startTime)}</span>
              </div>
            </div>

            <div className="mt-6">
              <Button type="button" onClick={handleScanAgain} wide>
                <RefreshCcw size={16} />
                {t('qrCheckIn.scanAgain')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
