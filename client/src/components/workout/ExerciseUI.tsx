import type { ReactNode } from 'react'
import { ImageIcon } from 'lucide-react'
import type {
  Exercise,
} from '@/services/workout.service'
import { cn } from '@/lib/utils'
import {
  EXERCISE_CATEGORY_OPTIONS,
  getExerciseCategoryLabel,
  type ExerciseCategoryFilter,
} from './exercise-data'

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
            alt={`Minh họa ${exercise.name}`}
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
              {getExerciseCategoryLabel(exercise.category)}
            </p>
          </div>
          {action}
        </div>
        <p className="mt-4 flex-1 text-sm leading-6 rogym-text-secondary">
          {exercise.description ?? 'Chưa có mô tả.'}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-xs">
          <div>
            <span className="rogym-text-dim">Nhóm cơ</span>
            <div className="mt-1 text-white">{exercise.muscleGroup ?? 'Không xác định'}</div>
          </div>
          <div>
            <span className="rogym-text-dim">Dụng cụ</span>
            <div className="mt-1 text-white">{exercise.equipmentNeeded ?? 'Không cần'}</div>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ExerciseCategoryFilterPopover({
  open,
  value,
  onChange,
  onApply,
  onClose,
}: {
  open: boolean
  value: ExerciseCategoryFilter
  onChange: (value: ExerciseCategoryFilter) => void
  onApply: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-2 min-w-[260px] rounded-[20px] border border-[rgba(6,195,132,0.25)] bg-[#0a1f17] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <p className="mb-4 text-sm font-bold text-white">Bộ lọc</p>
        <p className="rogym-field-label mb-2">Loại bài tập</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {EXERCISE_CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rogym-choice-chip rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                value === option.value ? 'is-active' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white px-4"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rogym-btn rogym-btn--primary px-4"
            onClick={onApply}
          >
            Lưu
          </button>
        </div>
      </div>
    </>
  )
}
