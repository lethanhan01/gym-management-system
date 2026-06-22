import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { statusTone } from '@/lib/status'
import type { StatusTone } from '@/lib/status'
import { Modal, StatCard, StatusBadge, Button, SearchInput } from '@/components/ui'

export {
  Page as OwnerPage,
  PageEmptyState as OwnerEmptyState,
  PageErrorState as OwnerErrorState,
  PageHeader as OwnerPageHeader,
  PageSkeleton as OwnerSkeleton,
} from '@/components/shared/PageUI'

export { Select as OwnerSelect } from '@/components/Select'
export { OwnerDateRangeFilter } from '@/components/shared/OwnerDateRangeFilter'
export { OwnerPagination } from '@/components/shared/OwnerPagination'

export const OwnerStatCard = StatCard
export { Modal as OwnerModal }
export { SearchInput as OwnerSearchInput }

export function OwnerBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rogym-tone-badge is-compact"
      style={{ '--rogym-tone': color } as React.CSSProperties}
    >
      {label}
    </span>
  )
}

export function OwnerStatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  const { t } = useTranslation('owner')

  function ownerTone(s: string): StatusTone {
    if (s === 'available' || s === 'repairing') return 'accent'
    if (s === 'maintenance' || s === 'suspended' || s === 'reported') return 'warning'
    if (s === 'inactive' || s === 'retired') return 'muted'
    if (s === 'broken' || s === 'deleted') return 'danger'
    return statusTone(s)
  }
  const statusKey: Record<string, string> = {
    active: 'status.active',
    scheduled: 'status.scheduled',
    in_progress: 'status.inProgress',
    completed: 'status.completed',
    cancelled: 'status.cancelled',
    expired: 'status.expired',
    pending: 'status.pending',
    pending_verification: 'status.pendingVerification',
    draft: 'status.draft',
    archived: 'status.archived',
    replaced: 'status.replaced',
    realtime: 'status.realtime',
    manual: 'status.manual',
    qr: 'status.qr',
    available: 'status.available',
    broken: 'status.broken',
    repairing: 'status.repairing',
    reported: 'status.reported',
    resolved: 'status.resolved',
    inactive: 'status.inactive',
    suspended: 'status.suspended',
    retired: 'status.retired',
    deleted: 'status.deleted',
    locked: 'status.locked',
    maintenance: 'status.maintenance',
  }
  const translate = t as (key: string) => string
  const label = statusKey[status] ? translate(statusKey[status]) : status.replace(/_/g, ' ')

  return (
    <StatusBadge status={label || translate('status.unknown')} tone={tone ?? ownerTone(status)} />
  )
}

export function OwnerSubmitButton({
  loading,
  children,
  disabled,
  form,
}: {
  loading?: boolean
  children: ReactNode
  disabled?: boolean
  form?: string
}) {
  return (
    <Button type="submit" form={form} loading={loading} disabled={disabled}>
      {children}
    </Button>
  )
}
