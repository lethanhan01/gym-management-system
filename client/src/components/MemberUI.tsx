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
  Button as MemberButton,
  Input as MemberInput,
  FormField as MemberFormField,
  Textarea as MemberTextarea,
  Checkbox as MemberCheckbox,
  Pagination as MemberPagination,
  ConfirmDialog as MemberConfirmDialog,
  Table as MemberTable,
  ResponsiveTable as MemberResponsiveTable,
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

