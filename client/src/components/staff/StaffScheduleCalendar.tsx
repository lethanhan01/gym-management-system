import type { ReactNode } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  STAFF_SCHEDULE_SHIFTS,
  type StaffScheduleCalendarEntry,
  type StaffScheduleShift,
} from '@/lib/staff-schedule-calendar'
import { cn } from '@/lib/utils'

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7))
  }
  return rows
}

type StaffScheduleCalendarProps<TSchedule extends StaffScheduleCalendarEntry> = {
  schedules: TSchedule[]
  targetYear: number
  targetMonth: number
  selectedDate: string | null
  onSelectedDateChange: (date: string | null) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  detailEyebrow: string
  renderEntry: (schedule: TSchedule) => ReactNode
  className?: string
  emptySelectionTitle?: string
  emptySelectionDescription?: string
  emptyDayMessage?: string
  emptyDayAction?: ReactNode
  emptyShiftMessage?: string
  headerAction?: ReactNode
}

export function StaffScheduleCalendar<TSchedule extends StaffScheduleCalendarEntry>({
  schedules,
  targetYear,
  targetMonth,
  selectedDate,
  onSelectedDateChange,
  onPreviousMonth,
  onNextMonth,
  detailEyebrow,
  renderEntry,
  className,
  emptySelectionTitle,
  emptySelectionDescription,
  emptyDayMessage,
  emptyDayAction,
  emptyShiftMessage,
  headerAction,
}: StaffScheduleCalendarProps<TSchedule>) {
  const { t, i18n } = useTranslation('common')
  const locale = i18n.language === 'ja' ? 'ja-JP' : 'vi-VN'

  // 2024-01-01 is a Monday — generates Mon–Sun day abbreviations for current locale
  const DOW_LABELS = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i))
  )

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(targetYear, targetMonth, 1)
  )

  function formatSelectedDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const grid = getMonthGrid(targetYear, targetMonth)
  const scheduleMap = new Map<string, Map<StaffScheduleShift, TSchedule[]>>()

  for (const schedule of schedules) {
    if (!scheduleMap.has(schedule.workDate)) {
      scheduleMap.set(schedule.workDate, new Map())
    }
    const shiftMap = scheduleMap.get(schedule.workDate)!
    if (!shiftMap.has(schedule.shift)) {
      shiftMap.set(schedule.shift, [])
    }
    shiftMap.get(schedule.shift)!.push(schedule)
  }

  const selectedDaySchedules = selectedDate
    ? STAFF_SCHEDULE_SHIFTS.map((shift) => ({
        shift,
        entries: scheduleMap.get(selectedDate)?.get(shift) ?? [],
      }))
    : null

  function countForDay(date: string): number {
    const shiftMap = scheduleMap.get(date)
    if (!shiftMap) return 0

    let total = 0
    for (const entries of shiftMap.values()) total += entries.length
    return total
  }

  function moveMonth(direction: 'previous' | 'next') {
    if (direction === 'previous') {
      onPreviousMonth()
    } else {
      onNextMonth()
    }
    onSelectedDateChange(null)
  }

  return (
    <div className={cn('grid gap-5 lg:grid-cols-[1fr_340px]', className)}>
      <div className="rogym-card rogym-card--compact p-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth('previous')}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            aria-label={t('calendar.prevMonth')}
          >
            <ChevronLeft size={16} className="text-white/60" />
          </button>
          <span className="text-sm font-bold text-white">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => moveMonth('next')}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            aria-label={t('calendar.nextMonth')}
          >
            <ChevronRight size={16} className="text-white/60" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7">
          {DOW_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[11px] font-bold uppercase rogym-text-dim"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 gap-1">
              {row.map((day, columnIndex) => {
                if (day === null) {
                  return <div key={columnIndex} className="h-[52px] rounded-xl" />
                }

                const date = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(
                  day
                ).padStart(2, '0')}`
                const count = countForDay(date)
                const todayCell = isToday(targetYear, targetMonth, day)
                const selected = selectedDate === date

                return (
                  <button
                    key={columnIndex}
                    type="button"
                    onClick={() => onSelectedDateChange(selected ? null : date)}
                    className={cn(
                      'flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-colors',
                      selected
                        ? 'bg-[var(--rogym-teal)] text-[var(--rogym-bg-base)]'
                        : todayCell
                          ? 'border border-[rgba(66,224,158,0.5)] text-[var(--rogym-teal)]'
                          : 'text-white/60 hover:text-white'
                    )}
                  >
                    <span className="text-xs font-semibold leading-none">{day}</span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0 text-[10px] font-bold leading-5',
                          selected
                            ? 'bg-[var(--rogym-bg-base)]/20 text-[var(--rogym-bg-base)]'
                            : 'bg-[rgba(66,224,158,0.15)] text-[var(--rogym-teal)]'
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="h-5" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="rogym-card rogym-card--compact p-5">
        {selectedDate === null ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 rogym-text-dim">
              <CalendarDays size={20} />
            </div>
            <p className="text-sm font-medium text-white">{emptySelectionTitle ?? t('calendar.emptySelectionTitle')}</p>
            <p className="mt-1 text-xs rogym-text-dim">{emptySelectionDescription ?? t('calendar.emptySelectionDescription')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs rogym-text-dim">{detailEyebrow}</p>
                <p className="text-sm font-bold text-white">{formatSelectedDate(selectedDate)}</p>
              </div>
              {headerAction}
            </div>

            {selectedDaySchedules?.every((shift) => shift.entries.length === 0) ? (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
                <p className="text-sm rogym-text-dim">{emptyDayMessage ?? t('calendar.emptyDayMessage')}</p>
                {emptyDayAction && <div className="mt-3">{emptyDayAction}</div>}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDaySchedules?.map(({ shift, entries }) => (
                  <div key={shift}>
                    <p className="mb-1.5 text-xs font-bold uppercase rogym-text-dim">
                      {t(`shift.${shift}` as const)}
                    </p>
                    {entries.length === 0 ? (
                      <p className="pl-2 text-xs italic rogym-text-dim">{emptyShiftMessage ?? t('calendar.emptyShiftMessage')}</p>
                    ) : (
                      <div className="space-y-1">
                        {entries.map((entry) => (
                          <div key={entry.scheduleId}>{renderEntry(entry)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
