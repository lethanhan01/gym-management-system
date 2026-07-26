import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'
import type {
  Exercise,
  ExerciseBodyPart,
  ExerciseMuscle,
  ExerciseEquipment,
} from '@/services/workout.service'
import { cn } from '@/lib/utils'

export function ExerciseCard({
  exercise,
  action,
  onClick,
  imageAspect = 'aspect-[6/4]',
}: {
  exercise: Exercise
  action?: ReactNode
  onClick?: () => void
  imageAspect?: string
}) {
  const { t } = useTranslation('member')
  return (
    <article
      className={cn(
        'rogym-card rogym-card--compact flex flex-col overflow-hidden',
        onClick && 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl',
      )}
      onClick={onClick}
    >
      <div className={cn(imageAspect, 'overflow-hidden border-b border-white/5 bg-black/20')}>
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={t('workout.exercises.imageAlt', { name: exercise.name })}
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center rogym-text-dim">
            <ImageIcon size={32} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">{exercise.name}</h2>
            <p className="mt-1 text-xs uppercase tracking-wider rogym-text-dim">
              {exercise.targetMuscle?.name ?? '—'}
            </p>
          </div>
          {action}
        </div>
        <p className="mt-4 flex-1 text-sm leading-6 rogym-text-secondary">
          {exercise.description ?? t('workout.exercises.noDescription')}
        </p>
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
    </article>
  )
}

export function ExerciseFilterPopover({
  open,
  bodyPartId,
  targetMuscleId,
  equipmentId,
  bodyParts,
  muscles,
  equipments,
  onChange,
  onApply,
  onClose,
}: {
  open: boolean
  bodyPartId?: number
  targetMuscleId?: number
  equipmentId?: number
  bodyParts: ExerciseBodyPart[]
  muscles: ExerciseMuscle[]
  equipments: ExerciseEquipment[]
  onChange: (fields: { bodyPartId?: number; targetMuscleId?: number; equipmentId?: number }) => void
  onApply: () => void
  onClose: () => void
}) {
  const { t } = useTranslation('member')
  const { t: tc } = useTranslation('common')
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-2 min-w-[260px] rounded-[20px] border border-[rgba(6,195,132,0.25)] bg-[#0a1f17] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <p className="mb-4 text-sm font-bold text-white">{t('workout.exercises.filterTitle')}</p>
        
        <div className="space-y-4 mb-5">
          <div>
            <p className="rogym-field-label mb-2">{t('workout.exercises.fieldBodyPart', 'Body Part')}</p>
            <select
              className="rogym-input py-2 text-sm"
              value={bodyPartId || ''}
              onChange={(e) => onChange({ bodyPartId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">{t('workout.categories.all', 'All')}</option>
              {bodyParts.map((item) => (
                <option key={item.bodyPartId} value={item.bodyPartId}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="rogym-field-label mb-2">{t('workout.exercises.fieldTargetMuscle', 'Target Muscle')}</p>
            <select
              className="rogym-input py-2 text-sm"
              value={targetMuscleId || ''}
              onChange={(e) => onChange({ targetMuscleId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">{t('workout.categories.all', 'All')}</option>
              {muscles.map((item) => (
                <option key={item.muscleId} value={item.muscleId}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="rogym-field-label mb-2">{t('workout.exercises.fieldEquipment', 'Equipment')}</p>
            <select
              className="rogym-input py-2 text-sm"
              value={equipmentId || ''}
              onChange={(e) => onChange({ equipmentId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">{t('workout.categories.all', 'All')}</option>
              {equipments.map((item) => (
                <option key={item.equipmentId} value={item.equipmentId}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white px-4"
            onClick={onClose}
          >
            {tc('button.cancel')}
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary px-4"
            onClick={onApply}
          >
            {tc('button.save')}
          </button>
        </div>
      </div>
    </>
  )
}
