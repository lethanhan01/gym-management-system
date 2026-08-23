import {
  Card,
  Modal,
  StatCard,
  StatusBadge,
  Select,
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
} from '@/components/ui'

export const StaffCard = Card
export const StaffStatCard = StatCard
export const StaffModal = Modal
export const StaffSelect = Select

export function StaffStatusBadge({
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
