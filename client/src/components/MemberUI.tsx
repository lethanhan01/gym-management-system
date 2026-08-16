import {
  Card,
  Modal,
  StatCard,
  StatusBadge,
  Badge,
  Select,
  type StatusTone,
  type BadgeTone,
} from '@/components/ui'

export {
  Page as MemberPage,
  PageEmptyState as MemberEmptyState,
  PageErrorState as MemberErrorState,
  PageHeader as MemberPageHeader,
  PageSkeleton as MemberSkeleton,
  SearchToolbar as MemberSearchToolbar,
  SearchInput as MemberSearchInput,
} from '@/components/ui'

export const MemberCard = Card
export const MemberStatCard = StatCard
export const MemberModal = Modal
export const MemberSelect = Select
export const MemberBadge = Badge

export function MemberStatusBadge({
  status,
  tone,
  label,
}: {
  status: string
  tone?: StatusTone | BadgeTone
  label?: string
}) {
  return <StatusBadge status={status} tone={tone} label={label} />
}
