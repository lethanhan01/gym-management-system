import {
  Card,
  Modal,
  StatCard,
  StatusBadge,
  SearchInput,
  type StatusTone,
} from '@/components/ui'

// Re-exports with Role Aliases (Backwards Compatibility Layer)
export {
  Page as OwnerPage,
  PageEmptyState as OwnerEmptyState,
  PageErrorState as OwnerErrorState,
  PageHeader as OwnerPageHeader,
  PageSkeleton as OwnerSkeleton,
  Select as OwnerSelect,
  Pagination as OwnerPagination,
  SearchToolbar as OwnerSearchToolbar,
  SubmitButton as OwnerSubmitButton,
} from '@/components/ui'

export { OwnerDateRangeFilter } from '@/components/shared/OwnerDateRangeFilter'

export const OwnerCard = Card
export const OwnerStatCard = StatCard
export const OwnerModal = Modal
export const OwnerSearchInput = SearchInput

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
