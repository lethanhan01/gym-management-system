import i18n from './i18n'
import type { StaffSchedule } from '@/services/staff.service'

export function shiftLabel(shift: StaffSchedule['shift']): string {
  return i18n.t(`shift.${shift}`, { ns: 'common' })
}
