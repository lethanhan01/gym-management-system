import { useTranslation } from 'react-i18next'
import {
  Select,
  StatusBadge,
  type StatusTone,
} from '@/components/ui'

import type { TrainerStudentSummary } from '@/services/member.service'

// Re-exports with Role Aliases (Backwards Compatibility Layer)
export {
  Page as TrainerPage,
  PageEmptyState as TrainerEmptyState,
  PageErrorState as TrainerErrorState,
  PageHeader as TrainerPageHeader,
  PageSkeleton as TrainerSkeleton,
  SearchToolbar as TrainerSearchToolbar,
  SearchInput as TrainerSearchInput,
  SubmitButton,
  Card as TrainerCard,
  StatCard as TrainerStatCard,
  Modal as TrainerModal,
  Select as TrainerSelect,
} from '@/components/ui'

export function TrainerStatusBadge({
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

export function StudentCombobox({
  students,
  value,
  onChange,
  disabled,
}: Readonly<{
  students: TrainerStudentSummary[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}>) {
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

