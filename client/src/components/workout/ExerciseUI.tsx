import { memo } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'
import type {
  Exercise,
  ExerciseBodyPart,
  ExerciseMuscle,
  ExerciseEquipment,
} from '@/services/workout.service'
import {
  Card,
  CardDescription,
  CardMedia,
  CardTitle,
  FilterDropdown,
  Select,
  type CardAspectRatio,
  type FilterDropdownSize,
} from '@/components/ui'

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  action,
  onClick,
  imageAspect = '6/4',
}: {
  exercise: Exercise
  action?: ReactNode
  onClick?: () => void
  imageAspect?: string
}) {
  const { t } = useTranslation('member')
  const aspect = (imageAspect.replace('aspect-[', '').replace(']', '') || '6/4') as CardAspectRatio

  return (
    <Card
      as="article"
      variant={onClick ? 'interactive' : 'compact'}
      padding="none"
      onClick={onClick}
      className="flex flex-col overflow-hidden"
    >
      <CardMedia
        src={exercise.imageUrl ?? undefined}
        alt={t('workout.exercises.imageAlt', { name: exercise.name })}
        aspectRatio={
          aspect === '6/4' || aspect === '16/9' || aspect === '4/3' || aspect === '1/1' || aspect === '21/9'
            ? aspect
            : '6/4'
        }
      >
        {!exercise.imageUrl && (
          <div className="flex h-full items-center justify-center rogym-text-dim">
            <ImageIcon size={32} />
          </div>
        )}
      </CardMedia>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle size="md" as="h2">
              {exercise.name}
            </CardTitle>
            <p className="mt-1 text-xs uppercase tracking-wider rogym-text-dim">
              {exercise.targetMuscle?.name ?? '—'}
            </p>
          </div>
          {action}
        </div>

        <div className="mt-4 flex-1">
          <CardDescription lineClamp={3}>
            {exercise.description ?? t('workout.exercises.noDescription')}
          </CardDescription>
          {exercise.instructions && exercise.instructions.length > 0 && (
            <p className="mt-2 text-sm leading-5 rogym-text-dim line-clamp-2">
              {exercise.instructions.join(' ')}
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-xs">
          <div>
            <span className="rogym-text-dim">{t('workout.exercises.fieldBodyPart', 'Body Part')}</span>
            <div className="mt-1 text-white">{exercise.bodyPart?.name ?? '—'}</div>
          </div>
          <div>
            <span className="rogym-text-dim">{t('workout.exercises.fieldEquipment', 'Equipment')}</span>
            <div className="mt-1 text-white">{exercise.equipment?.name ?? t('workout.exercises.equipmentNone', 'None')}</div>
          </div>
        </div>
      </div>
    </Card>
  )
})

export const ExerciseFilterDropdown = memo(function ExerciseFilterDropdown({
  open,
  onOpenChange,
  activeCount,
  bodyPartId,
  targetMuscleId,
  equipmentId,
  bodyParts,
  muscles,
  equipments,
  onChange,
  onApply,
  size,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCount?: number
  bodyPartId?: number
  targetMuscleId?: number
  equipmentId?: number
  bodyParts: ExerciseBodyPart[]
  muscles: ExerciseMuscle[]
  equipments: ExerciseEquipment[]
  onChange: (fields: { bodyPartId?: number; targetMuscleId?: number; equipmentId?: number }) => void
  onApply: () => void
  size?: FilterDropdownSize
  className?: string
}) {
  const { t } = useTranslation('member')
  return (
    <FilterDropdown
      open={open}
      onOpenChange={onOpenChange}
      activeCount={activeCount}
      title={t('workout.exercises.filterTitle')}
      onApply={onApply}
      size={size}
      className={className}
    >
      <div>
        <p className="rogym-field-label mb-2">{t('workout.exercises.fieldBodyPart', 'Body Part')}</p>
        <Select
          className="w-full"
          value={bodyPartId ? String(bodyPartId) : ''}
          onValueChange={(val) => onChange({ bodyPartId: val ? Number(val) : undefined })}
        >
          <option value="">{t('workout.categories.all', 'All')}</option>
          {bodyParts.map((item) => (
            <option key={item.bodyPartId} value={item.bodyPartId}>{item.name}</option>
          ))}
        </Select>
      </div>

      <div>
        <p className="rogym-field-label mb-2">{t('workout.exercises.fieldTargetMuscle', 'Target Muscle')}</p>
        <Select
          className="w-full"
          value={targetMuscleId ? String(targetMuscleId) : ''}
          onValueChange={(val) => onChange({ targetMuscleId: val ? Number(val) : undefined })}
        >
          <option value="">{t('workout.categories.all', 'All')}</option>
          {muscles.map((item) => (
            <option key={item.muscleId} value={item.muscleId}>{item.name}</option>
          ))}
        </Select>
      </div>

      <div>
        <p className="rogym-field-label mb-2">{t('workout.exercises.fieldEquipment', 'Equipment')}</p>
        <Select
          className="w-full"
          value={equipmentId ? String(equipmentId) : ''}
          onValueChange={(val) => onChange({ equipmentId: val ? Number(val) : undefined })}
        >
          <option value="">{t('workout.categories.all', 'All')}</option>
          {equipments.map((item) => (
            <option key={item.equipmentId} value={item.equipmentId}>{item.name}</option>
          ))}
        </Select>
      </div>
    </FilterDropdown>
  )
})
