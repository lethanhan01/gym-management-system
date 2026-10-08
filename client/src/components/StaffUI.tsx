import {
  StatusBadge,
  type StatusTone,
} from '@/components/ui'

// Re-exports with Role Aliases (Backwards Compatibility Layer)
export {
  Page as StaffPage,
  PageEmptyState as StaffEmptyState,
  PageErrorState as StaffErrorState,
  PageHeader as StaffPageHeader,
  PageSkeleton as StaffSkeleton,
  SearchToolbar as StaffSearchToolbar,
  SearchInput as StaffSearchInput,
  SubmitButton,
  Card as StaffCard,
  StatCard as StaffStatCard,
  Modal as StaffModal,
  Select as StaffSelect,
} from '@/components/ui'

export function StaffStatusBadge({
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
