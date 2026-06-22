import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, LogIn, Search } from 'lucide-react'
import { getApiError, getApiErrorCode } from '@/lib/api-error'
import { formatTime, todayInput, startOfLocalDayIso, endOfLocalDayIso } from '@/lib/date'
import { trainingService, type AttendanceLog } from '@/services/training.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffStatusBadge,
  SubmitButton,
} from '@/components/StaffUI'

export default function CheckInPage() {
  const { t } = useTranslation('staff')
  const [memberCode, setMemberCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [lastCheckedIn, setLastCheckedIn] = useState<AttendanceLog | null>(null)
  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([])
  const [logTotal, setLogTotal] = useState(0)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCheckin(event: FormEvent) {
    event.preventDefault()
    if (!memberCode.trim()) return
    setChecking(true)
    setCheckError(null)
    setLastCheckedIn(null)
    try {
      const log = await trainingService.manualCheckin({
        memberCode: memberCode.trim().toUpperCase(),
        occurredAt: new Date().toISOString(),
      })
      setLastCheckedIn(log)
      setMemberCode('')
      loadTodayLogs()
    } catch (err) {
      const code = getApiErrorCode(err)
      const message =
        code === 'MEMBER_NOT_FOUND'
          ? t('checkIn.errorNotFound')
          : code === 'MEMBER_NO_ACTIVE_SUBSCRIPTION'
            ? t('checkIn.errorNoSub')
            : getApiError(err, t('checkIn.errorDefault'))
      setCheckError(message)
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
              {checkError && <StaffErrorState message={checkError} />}
              <SubmitButton loading={checking} disabled={!memberCode.trim()}>
                <LogIn size={16} /> Check-in
              </SubmitButton>
            </form>
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
