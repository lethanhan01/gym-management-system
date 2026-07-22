import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { Camera, CheckCircle2, History, Keyboard, RefreshCcw, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import { formatTime } from '@/lib/date'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import { MemberErrorState, MemberPage, MemberPageHeader } from '@/components/MemberUI'
import { Button } from '@/components/ui'

type ScanState = 'idle' | 'starting' | 'scanning' | 'blocked' | 'stopped'

export default function CheckInPage() {
  const { t } = useTranslation('member')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const submittedRef = useRef(false)
  const checkingRef = useRef(false)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [tokenInput, setTokenInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastLog, setLastLog] = useState<AttendanceLog | null>(null)

  useEffect(() => {
    checkingRef.current = checking
  }, [checking])

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanState((state) => (state === 'scanning' || state === 'starting' ? 'stopped' : state))
  }, [])

  const submitToken = useCallback(
    async (token: string) => {
      const normalized = token.trim()
      if (!normalized || checkingRef.current || submittedRef.current) return
      submittedRef.current = true
      setChecking(true)
      setError(null)
      setLastLog(null)
      stopScanner()
      try {
        const log = await trainingService.qrCheckin(normalized)
        setLastLog(log)
        setTokenInput('')
      } catch (err) {
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
      setScanState('blocked')
      setError(t('qrCheckIn.errorCamera'))
    }
  }, [submitToken, t])

  useEffect(() => {
    void startScanner()
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [startScanner])

  function handleManualSubmit(event: FormEvent) {
    event.preventDefault()
    void submitToken(tokenInput)
  }

  function handleScanAgain() {
    submittedRef.current = false
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
          <div className="relative aspect-[4/3] min-h-[280px] bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              aria-label={t('qrCheckIn.cameraLabel')}
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="aspect-square w-[min(72vw,224px)] max-w-[calc(100%-48px)] rounded-[28px] border-2 border-[#42e09e] shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold text-white">
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
            <section className="rogym-card rogym-card--compact border-[rgba(6,195,132,0.3)] p-6">
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

          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <Keyboard size={18} />
              {t('qrCheckIn.manualTitle')}
            </h2>
            <form className="space-y-4" onSubmit={handleManualSubmit}>
              <label className="block space-y-2">
                <span className="rogym-field-label">{t('qrCheckIn.tokenLabel')}</span>
                <div className="relative">
                  <ScanLine
                    className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
                    size={17}
                  />
                  <input
                    className="rogym-input pl-10"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder={t('qrCheckIn.tokenPlaceholder')}
                    autoComplete="off"
                  />
                </div>
              </label>
              <Button type="submit" loading={checking} disabled={!tokenInput.trim()}>
                <Camera size={16} />
                {t('qrCheckIn.submit')}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </MemberPage>
  )
}
