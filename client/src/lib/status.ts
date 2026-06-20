export type StatusTone = 'success' | 'accent' | 'warning' | 'danger' | 'muted'

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
  pending: 'Chờ xử lý',
  pending_verification: 'Chờ xác thực',
  draft: 'Bản nháp',
  archived: 'Lưu trữ',
  replaced: 'Đã thay thế',
  realtime: 'Thiết bị',
  manual: 'Thủ công',
  qr: 'QR',
  available: 'Sẵn sàng',
  broken: 'Hỏng',
  repairing: 'Đang sửa',
  reported: 'Đã báo cáo',
  resolved: 'Đã xử lý',
  inactive: 'Không hoạt động',
  suspended: 'Đình chỉ',
  retired: 'Đã nghỉ',
  deleted: 'Đã xóa',
  locked: 'Bị khóa',
  maintenance: 'Bảo trì',
}

export function statusLabel(status?: string | null): string {
  if (!status) return 'Không xác định'
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

export function statusTone(status?: string | null): StatusTone {
  if (status === 'active' || status === 'completed' || status === 'resolved') return 'success'
  if (
    status === 'scheduled' ||
    status === 'in_progress' ||
    status === 'realtime' ||
    status === 'available' ||
    status === 'repairing'
  )
    return 'accent'
  if (
    status === 'pending' ||
    status === 'pending_verification' ||
    status === 'draft' ||
    status === 'maintenance' ||
    status === 'reported' ||
    status === 'suspended' ||
    status === 'locked'
  )
    return 'warning'
  if (status === 'cancelled' || status === 'expired' || status === 'broken' || status === 'deleted')
    return 'danger'
  if (
    status === 'inactive' ||
    status === 'retired' ||
    status === 'archived' ||
    status === 'replaced'
  )
    return 'muted'
  return 'muted'
}
