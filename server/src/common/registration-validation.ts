import { BadRequestException } from '@nestjs/common'

function todayVietnam(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date())
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])) as { year: number; month: number; day: number }
}

export function assertVietnameseDateOfBirth(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Ngày sinh phải là ngày ISO (YYYY-MM-DD)')
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new BadRequestException('Ngày sinh không hợp lệ')
  }
  const today = todayVietnam()
  const afterBirthday = today.month > month || (today.month === month && today.day >= day)
  const age = today.year - year - (afterBirthday ? 0 : 1)
  if (age < 14 || age > 120) throw new BadRequestException('Tuổi phải từ 14 đến 120')
}
