import { type ReactNode } from 'react'
import {
  Button,
  Modal,
  StatCard,
  StatusBadge,
  Select,
  type StatusTone,
} from '@/components/ui'

export {
  Page as StaffPage,
  PageEmptyState as StaffEmptyState,
  PageErrorState as StaffErrorState,
  PageHeader as StaffPageHeader,
  PageSkeleton as StaffSkeleton,
} from '@/components/ui'

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

export function SubmitButton({
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
