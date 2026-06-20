import type { StaffSchedule } from '@/services/staff.service'

export function shiftLabel(shift: StaffSchedule['shift']): string {
  if (shift === 'morning') return 'Ca sáng (07:00–12:00)'
  if (shift === 'afternoon') return 'Ca chiều (12:00–17:00)'
  return 'Ca tối (17:00–22:00)'
}
