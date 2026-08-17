import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { CheckCircle2, History, RefreshCcw } from 'lucide-react'
import {
  Button,
  ButtonLink,
  Card,
  Modal,
  Page,
  PageErrorState,
  PageHeader,
} from '@/components/ui'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import { formatTime } from '@/lib/date'
import { attendanceService, type AttendanceLog } from '@/services/attendance.service'

type ScanState = 'idle' | 'starting' | 'scanning' | 'blocked' | 'stopped'

export default function CheckInPage() {
  const { t } = useTranslation('member')
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
        const log = await attendanceService.qrCheckin(normalized)
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
              : code === 'QR_CHECKIN_ALREADY_TODAY'
                ? t('qrCheckIn.errorAlreadyCheckedIn')
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
    <Page>
      <PageHeader
        eyebrow={t('qrCheckIn.eyebrow')}
        title={t('qrCheckIn.title')}
        description={t('qrCheckIn.description')}
      />

      <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card as="article" variant="compact" padding="none" className="overflow-hidden">
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

          <footer className="flex flex-wrap items-center gap-3 p-5">
            <Button
              type="button"
              variant="primary"
              onClick={handleScanAgain}
              disabled={checking}
              leftIcon={<RefreshCcw size={16} />}
            >
              {t('qrCheckIn.scanAgain')}
            </Button>
            <ButtonLink
              variant="text-accent"
              className="text-sm"
              to="/member/attendance"
              leftIcon={<History size={15} />}
            >
              {t('qrCheckIn.viewHistory')}
            </ButtonLink>
          </footer>
        </Card>

        <aside className="space-y-5">
          {lastLog && (
            <Card as="article" variant="compact" className="hidden border-[rgba(6,195,132,0.3)] p-6 md:block">
              <header className="mb-4 flex items-center gap-3 rogym-text-accent">
                <CheckCircle2 size={24} />
                <span className="font-bold">{t('qrCheckIn.successTitle')}</span>
              </header>
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
            </Card>
          )}

          {error && <PageErrorState message={error} onRetry={handleScanAgain} />}
        </aside>
      </main>

      {lastLog && (
        <Modal
          open={successOverlayOpen}
          onClose={closeSuccessOverlay}
          title={t('qrCheckIn.successTitle')}
          size="sm"
          footer={
            <Button
              type="button"
              variant="primary"
              onClick={handleScanAgain}
              fullWidth
              leftIcon={<RefreshCcw size={16} />}
            >
              {t('qrCheckIn.scanAgain')}
            </Button>
          }
        >
          <div className="space-y-3 text-sm py-2">
            <div className="flex justify-between gap-4">
              <span className="rogym-text-dim">{t('qrCheckIn.member')}</span>
              <span className="text-right font-semibold text-white">{lastLog.memberName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="rogym-text-dim">{t('qrCheckIn.checkedInAt')}</span>
              <span className="text-white">{formatTime(lastLog.startTime)}</span>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  )
}

