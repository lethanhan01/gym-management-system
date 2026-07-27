import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { CheckCircle2, LogIn, QrCode, RefreshCcw, Search } from 'lucide-react'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import { formatDate, formatTime, todayInput, startOfLocalDayIso, endOfLocalDayIso } from '@/lib/date'
import { trainingService, type AttendanceLog, type QrTokenResponse } from '@/services/training.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffStatusBadge,
  SubmitButton,
} from '@/components/StaffUI'
import { toast } from '@/lib/toast'

export default function CheckInPage() {
  const { t } = useTranslation('staff')
  const [memberCode, setMemberCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [lastCheckedIn, setLastCheckedIn] = useState<AttendanceLog | null>(null)
  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([])
  const [logTotal, setLogTotal] = useState(0)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [qrToken, setQrToken] = useState<QrTokenResponse | null>(null)
  const [loadingQr, setLoadingQr] = useState(true)
  const [qrError, setQrError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  function loadTodayLogs() {
    const today = todayInput()
    setLoadingLogs(true)
    setLogsError(null)
    trainingService
      .getAttendance({
        from: startOfLocalDayIso(today),
        to: endOfLocalDayIso(today),
        pageSize: 50,
      })
      .then((result) => {
        setTodayLogs(result.data)
        setLogTotal(result.total)
      })
      .catch((err) => setLogsError(getApiError(err, t('checkIn.loadFailed'))))
      .finally(() => setLoadingLogs(false))
  }

  useEffect(() => {
    loadTodayLogs()
    loadQrToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function loadQrToken() {
    setLoadingQr(true)
    setQrError(null)
    trainingService
      .getQrToken()
      .then(setQrToken)
      .catch((err) => setQrError(getApiError(err, t('checkIn.qrLoadFailed'))))
      .finally(() => setLoadingQr(false))
  }

  function getCountdown() {
    if (!qrToken) return '--:--:--'
    const remaining = Math.max(0, new Date(qrToken.expiresAt).getTime() - now)
    const hours = Math.floor(remaining / 3_600_000)
    const minutes = Math.floor((remaining % 3_600_000) / 60_000)
    const seconds = Math.floor((remaining % 60_000) / 1000)
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
  }

  async function handleCheckin(event: FormEvent) {
    event.preventDefault()
    if (!memberCode.trim()) return
    setChecking(true)
    setLastCheckedIn(null)
    try {
      const log = await trainingService.manualCheckin({
        memberCode: memberCode.trim().toUpperCase(),
        occurredAt: new Date().toISOString(),
      })
      setLastCheckedIn(log)
      setMemberCode('')
      toast.success(t('checkIn.checkInSuccess', { defaultValue: 'Check-in thành công!' }))
      loadTodayLogs()
    } catch (err) {
      const code = getApiErrorCode(err)
      const message =
        code === 'MEMBER_NOT_FOUND'
          ? t('checkIn.errorNotFound')
          : code === 'MEMBER_NO_ACTIVE_SUBSCRIPTION'
            ? t('checkIn.errorNoSub')
            : getApiError(err, t('checkIn.errorDefault'))
      toast.error(message, {
        action: { label: t('common.retry', { defaultValue: 'Thử lại' }), onClick: () => handleCheckin(event) },
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow={t('checkIn.eyebrow')}
        title={t('checkIn.title')}
        description={t('checkIn.description')}
      />

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <section className="rogym-card rogym-card--compact p-6">
            <h2 className="mb-5 text-base font-bold text-white">{t('checkIn.enterCode')}</h2>
            <form className="space-y-4" onSubmit={handleCheckin}>
              <label className="block space-y-2">
                <span className="rogym-field-label">{t('checkIn.memberCode')}</span>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
                    size={17}
                  />
                  <input
                    className="rogym-input pl-10 uppercase"
                    value={memberCode}
                    onChange={(event) => setMemberCode(event.target.value)}
                    placeholder={t('checkIn.memberCodePlaceholder')}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              </label>
              <SubmitButton loading={checking} disabled={!memberCode.trim()}>
                <LogIn size={16} /> Check-in
              </SubmitButton>
            </form>
          </section>

          <section className="rogym-card rogym-card--compact p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-white">
                  <QrCode size={18} />
                  {t('checkIn.qrTitle')}
                </h2>
                <p className="mt-1 text-sm rogym-text-dim">{t('checkIn.qrDescription')}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={loadQrToken}
                disabled={loadingQr}
                aria-label={t('checkIn.qrRefresh')}
                title={t('checkIn.qrRefresh')}
              >
                <RefreshCcw size={17} className={loadingQr ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingQr ? (
              <StaffSkeleton rows={3} />
            ) : qrError ? (
              <StaffErrorState message={qrError} onRetry={loadQrToken} />
            ) : qrToken ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="inline-flex rounded-2xl bg-white p-4">
                    <QRCodeCanvas value={qrToken.token} size={256} className="block h-[256px] w-[256px]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="rogym-text-dim">{t('checkIn.qrValidDate')}</div>
                    <div className="mt-1 font-semibold text-white">
                      {formatDate(`${qrToken.validDate}T00:00:00+07:00`)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="rogym-text-dim">{t('checkIn.qrExpiresIn')}</div>
                    <div className="mt-1 font-semibold text-white">{getCountdown()}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {lastCheckedIn && (
            <section className="rogym-card rogym-card--compact border-[rgba(6,195,132,0.3)] p-6">
              <div className="mb-3 flex items-center gap-3 rogym-text-accent">
                <CheckCircle2 size={22} />
                <span className="font-bold">{t('checkIn.checkInSuccess')}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="rogym-text-dim">{t('checkIn.member')}</span>
                  <span className="font-semibold text-white">{lastCheckedIn.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="rogym-text-dim">{t('checkIn.code')}</span>
                  <span className="text-white">{lastCheckedIn.memberCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="rogym-text-dim">{t('checkIn.checkedInAt')}</span>
                  <span className="text-white">{formatTime(lastCheckedIn.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="rogym-text-dim">{t('checkIn.method')}</span>
                  <StaffStatusBadge
                    status={lastCheckedIn.method}
                    tone="muted"
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        <section className="rogym-card rogym-card--compact p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              {t('checkIn.todayCheckins')}
              {logTotal > 0 && (
                <span className="ml-2 text-sm font-normal rogym-text-dim">
                  ({logTotal})
                </span>
              )}
            </h2>
            <button
              type="button"
              className="rogym-text-link rogym-text-link--accent text-sm"
              onClick={loadTodayLogs}
            >
              {t('checkIn.refresh')}
            </button>
          </div>

          {loadingLogs ? (
            <StaffSkeleton rows={5} />
          ) : logsError ? (
            <StaffErrorState message={logsError} onRetry={loadTodayLogs} />
          ) : todayLogs.length === 0 ? (
            <StaffEmptyState title={t('checkIn.noCheckIns')} />
          ) : (
            <div className="space-y-2">
              {todayLogs.map((log) => (
                <div
                  key={log.attendanceId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{log.memberName}</div>
                    <div className="mt-0.5 text-xs rogym-text-dim">
                      {log.memberCode}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">{formatTime(log.startTime)}</div>
                    {log.endTime && (
                      <div className="text-xs rogym-text-dim">
                        → {formatTime(log.endTime)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </StaffPage>
  )
}
