import {
  StatusBadge,
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
  Card as MemberCard,
  StatCard as MemberStatCard,
  Modal as MemberModal,
  Select as MemberSelect,
  Badge as MemberBadge,
} from '@/components/ui'

export function MemberStatusBadge({
  status,
  tone,
  label,
}: Readonly<{
  status: string
  tone?: StatusTone | BadgeTone
  label?: string
}>) {
  return <StatusBadge status={status} tone={tone} label={label} />
}

