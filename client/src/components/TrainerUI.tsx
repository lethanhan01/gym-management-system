import { type ReactNode } from 'react'
import { statusLabel, statusTone, type StatusTone } from '@/lib/status'
import { Modal, StatCard, StatusBadge, Button } from '@/components/ui'
import { Select } from '@/components/Select'
import type { TrainerStudentSummary } from '@/services/member.service'

export {
  Page as TrainerPage,
  PageEmptyState as TrainerEmptyState,
  PageErrorState as TrainerErrorState,
  PageHeader as TrainerPageHeader,
  PageSkeleton as TrainerSkeleton,
} from '@/components/shared/PageUI'

export const TrainerStatCard = StatCard

export function TrainerStatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  return <StatusBadge status={statusLabel(status)} tone={tone ?? statusTone(status)} />
}

export const TrainerModal = Modal

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

export { Select as TrainerSelect } from '@/components/Select'

export function StudentCombobox({
  students,
  value,
  onChange,
  disabled,
}: {
  students: TrainerStudentSummary[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <option value="">Chọn học viên</option>
      {students.map((student) => (
        <option key={student.memberId} value={student.memberId}>
          {student.memberCode} - {student.fullName}
        </option>
      ))}
    </Select>
  )
}
