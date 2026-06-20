export const OWNER_ACCENT = '#06c384'

export const PACKAGE_STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  inactive: '#f59e0b',
}
export const PACKAGE_STATUS_LABEL: Record<string, string> = {
  active: 'Đang bán',
  inactive: 'Ngừng bán',
}

export const USER_STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  pending_verification: '#f59e0b',
  locked: '#ef4444',
  deleted: '#6b7280',
}
export const USER_STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động',
  pending_verification: 'Chờ xác thực',
  locked: 'Bị khóa',
  deleted: 'Đã xóa',
}

export const STAFF_POSITION_COLOR: Record<string, string> = {
  staff: '#3b82f6',
  trainer: '#8b5cf6',
  owner: '#f59e0b',
  member: OWNER_ACCENT,
}

export const FEEDBACK_SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
}
export const FEEDBACK_SEVERITY_LABEL: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
}
