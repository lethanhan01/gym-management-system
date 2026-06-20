const VI_DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const VI_DATETIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const VI_TIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value?: string | Date | null): string {
  if (!value) return 'Chưa có'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 'Không hợp lệ' : VI_DATE.format(date)
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return 'Chưa có'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 'Không hợp lệ' : VI_DATETIME.format(date)
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return 'Chưa có'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 'Không hợp lệ' : VI_TIME.format(date)
}

export function toDateInput(value?: string | Date | null): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function toDateTimeLocalInput(value?: string | Date | null): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`
}

export function localDateTimeInputToIso(value: string): string {
  if (!value) return ''
  return new Date(`${value}:00+07:00`).toISOString()
}

export function startOfLocalDayIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00+07:00`).toISOString()
}

export function endOfLocalDayIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59.999+07:00`).toISOString()
}

export function todayInput(): string {
  return toDateInput(new Date())
}

export function monthStart(): string {
  const now = new Date()
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
}
