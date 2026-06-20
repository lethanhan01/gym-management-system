import { type ReactNode } from 'react'
import { statusLabel, statusTone, type StatusTone } from '@/lib/status'
import { Modal, StatCard, StatusBadge, Button } from '@/components/ui'

export {
  Page as StaffPage,
  PageEmptyState as StaffEmptyState,
  PageErrorState as StaffErrorState,
  PageHeader as StaffPageHeader,
  PageSkeleton as StaffSkeleton,
} from '@/components/shared/PageUI'

export const StaffStatCard = StatCard

export function StaffStatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  return <StatusBadge status={statusLabel(status)} tone={tone ?? statusTone(status)} />
}

export const StaffModal = Modal

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

export { Select as StaffSelect } from '@/components/Select'
