export type StaffScheduleShift = 'morning' | 'afternoon' | 'evening'

export interface StaffScheduleCalendarEntry {
  scheduleId: string
  staffId: string
  shift: StaffScheduleShift
  workDate: string
}

export const STAFF_SCHEDULE_SHIFTS: StaffScheduleShift[] = ['morning', 'afternoon', 'evening']

export function toScheduleISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getScheduleMonthRange(monthOffset: number, baseDate = new Date()) {
  const targetYear =
    baseDate.getFullYear() + Math.floor((baseDate.getMonth() + monthOffset) / 12)
  const targetMonth = ((baseDate.getMonth() + monthOffset) % 12 + 12) % 12

  return {
    targetYear,
    targetMonth,
    monthStart: toScheduleISODate(new Date(targetYear, targetMonth, 1)),
    monthEnd: toScheduleISODate(new Date(targetYear, targetMonth + 1, 0)),
  }
}
