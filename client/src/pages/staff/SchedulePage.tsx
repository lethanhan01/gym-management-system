import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StaffScheduleCalendar } from '@/components/staff/StaffScheduleCalendar'
import { StaffErrorState, StaffPage, StaffPageHeader, StaffSkeleton } from '@/components/StaffUI'
import { getApiError } from '@/lib/api-error'
import { getScheduleMonthRange } from '@/lib/staff-schedule-calendar'
import { staffService, type StaffProfile, type StaffSchedule } from '@/services/staff.service'

export default function StaffSchedulePage() {
  const { t } = useTranslation('staff')
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { targetYear, targetMonth } = getScheduleMonthRange(monthOffset)

  const loadSchedules = useCallback(() => {
    setLoading(true)
    setError(null)
    staffService
      .getMe()
      .then(async (currentProfile) => {
        setProfile(currentProfile)
        const ownSchedules = await staffService.getSchedules(currentProfile.staffId)
        setSchedules(
          ownSchedules.filter((schedule) => schedule.staffId === currentProfile.staffId)
        )
      })
      .catch((err) => setError(getApiError(err, t('schedule.loadFailed'))))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow={t('schedule.eyebrow')}
        title={t('schedule.title')}
        description={t('schedule.description')}
      />

      {loading ? (
        <StaffSkeleton />
      ) : error ? (
        <StaffErrorState message={error} onRetry={loadSchedules} />
      ) : (
        <StaffScheduleCalendar
          schedules={schedules}
          targetYear={targetYear}
          targetMonth={targetMonth}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          onPreviousMonth={() => setMonthOffset((offset) => offset - 1)}
          onNextMonth={() => setMonthOffset((offset) => offset + 1)}
          detailEyebrow={t('schedule.detailEyebrow')}
          emptySelectionTitle={t('schedule.emptySelectionTitle')}
          emptySelectionDescription={t('schedule.emptySelectionDescription')}
          emptyDayMessage={t('schedule.emptyDayMessage')}
          emptyShiftMessage={t('schedule.emptyShiftMessage')}
          renderEntry={() => (
            <div className="rounded-lg bg-[rgba(66,224,158,0.08)] px-3 py-2">
              <span className="text-sm font-medium text-white">{t('schedule.myShift')}</span>
              {profile?.staffCode && (
                <span className="ml-2 text-xs rogym-text-dim">{profile.staffCode}</span>
              )}
            </div>
          )}
        />
      )}
    </StaffPage>
  )
}
