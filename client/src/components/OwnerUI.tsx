import type { ReactNode } from 'react'
import { statusLabel, statusTone } from '@/lib/status'
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
  function ownerTone(s: string): StatusTone {
    if (s === 'available' || s === 'repairing') return 'accent'
    if (s === 'maintenance' || s === 'suspended' || s === 'reported') return 'warning'
    if (s === 'inactive' || s === 'retired') return 'muted'
    if (s === 'broken' || s === 'deleted') return 'danger'
    return statusTone(s)
  }
  return <StatusBadge status={statusLabel(status)} tone={tone ?? ownerTone(status)} />
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
