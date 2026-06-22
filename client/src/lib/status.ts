import i18n from './i18n'

export type StatusTone = 'success' | 'accent' | 'warning' | 'danger' | 'muted'

export function statusLabel(status?: string | null): string {
  if (!status) return i18n.t('status.unknown', { ns: 'common' })
  const key = status.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
  return i18n.t(`status.${key}`, { ns: 'common', defaultValue: status.replace(/_/g, ' ') })
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
