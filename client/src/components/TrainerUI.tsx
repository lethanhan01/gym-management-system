import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Modal,
  StatCard,
  StatusBadge,
  Select,
  type StatusTone,
} from '@/components/ui'
import type { TrainerStudentSummary } from '@/services/member.service'

export {
  Page as TrainerPage,
  PageEmptyState as TrainerEmptyState,
  PageErrorState as TrainerErrorState,
  PageHeader as TrainerPageHeader,
  PageSkeleton as TrainerSkeleton,
  SearchToolbar as TrainerSearchToolbar,
  SearchInput as TrainerSearchInput,
} from '@/components/ui'

export const TrainerCard = Card
export const TrainerStatCard = StatCard
export const TrainerModal = Modal
export const TrainerSelect = Select

export function TrainerStatusBadge({
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
  const { t } = useTranslation('trainer')
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <option value="">{t('students.selectStudent')}</option>
      {students.map((student) => (
        <option key={student.memberId} value={student.memberId}>
          {student.memberCode} - {student.fullName}
        </option>
      ))}
    </Select>
  )
}
