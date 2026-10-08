import {
  StatusBadge,
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
  Card as OwnerCard,
  StatCard as OwnerStatCard,
  Modal as OwnerModal,
  SearchInput as OwnerSearchInput,
} from '@/components/ui'

export { OwnerDateRangeFilter } from '@/components/shared/OwnerDateRangeFilter'

export function OwnerBadge({ label, color }: Readonly<{ label: string; color: string }>) {
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
}: Readonly<{
  status: string
  tone?: StatusTone
  label?: string
}>) {
  return <StatusBadge status={status} tone={tone} label={label} />
}
