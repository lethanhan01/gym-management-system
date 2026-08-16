import type { ReactNode } from 'react'
import {
  Button,
  Modal,
  StatCard,
  StatusBadge,
  SearchInput,
  type StatusTone,
} from '@/components/ui'

export {
  Page as OwnerPage,
  PageEmptyState as OwnerEmptyState,
  PageErrorState as OwnerErrorState,
  PageHeader as OwnerPageHeader,
  PageSkeleton as OwnerSkeleton,
} from '@/components/ui'

export { Select as OwnerSelect } from '@/components/ui'
export { OwnerDateRangeFilter } from '@/components/shared/OwnerDateRangeFilter'
export { Pagination as OwnerPagination } from '@/components/ui'

export const OwnerStatCard = StatCard
export { Modal as OwnerModal }
export { SearchInput as OwnerSearchInput }
export { SearchToolbar as OwnerSearchToolbar } from '@/components/ui'

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

export function OwnerStatusBadge({
  status,
  tone,
  label,
}: {
  status: string
  tone?: StatusTone
  label?: string
}) {
  return <StatusBadge status={status} tone={tone} label={label} />
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
