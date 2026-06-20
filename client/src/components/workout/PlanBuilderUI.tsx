import type { ExerciseCategory } from '@/services/workout.service'
import { cn } from '@/lib/utils'

export type ExerciseTargetValues = {
  sets: number
  reps: number
  duration: number
  weight: string
  restSeconds: number
}

export type ExerciseTargetChangeHandlers = {
  sets: (value: number) => void
  reps: (value: number) => void
  duration: (value: number) => void
  weight: (value: string) => void
  restSeconds: (value: number) => void
}

export function NumberField({
  label,
  value,
  min,
  onChange,
  className,
}: {
  label: string
  value: number
  min: number
  onChange: (value: number) => void
  className?: string
}) {
  return (
    <label className={cn('block space-y-2', className)}>
      <span className="rogym-field-label">{label}</span>
      <input
        className="rogym-input"
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        required
      />
    </label>
  )
}

export function ExerciseTargetFields({
  category,
  values,
  onChange,
  durationMode = 'cardio-only',
  gridClassName = 'grid gap-4 md:grid-cols-2',
  compact = false,
  restOutsideGrid = false,
  weightPlaceholder,
}: {
  category?: ExerciseCategory | null
  values: ExerciseTargetValues
  onChange: ExerciseTargetChangeHandlers
  durationMode?: 'cardio-only' | 'always'
  gridClassName?: string
  compact?: boolean
  restOutsideGrid?: boolean
  weightPlaceholder?: string
}) {
  const fieldClassName = compact ? 'space-y-1.5' : undefined
  const showReps = category !== 'cardio'
  const showDuration = durationMode === 'always' || category === 'cardio'
  const restField = (
    <NumberField
      label="Nghỉ giữa sets (giây)"
      min={0}
      value={values.restSeconds}
      onChange={onChange.restSeconds}
      className={fieldClassName}
    />
  )

  return (
    <div className={cn(restOutsideGrid && 'space-y-3')}>
      <div className={gridClassName}>
        <NumberField
          label="Số sets"
          min={1}
          value={values.sets}
          onChange={onChange.sets}
          className={fieldClassName}
        />
        {showReps && (
          <NumberField
            label="Số reps"
            min={1}
            value={values.reps}
            onChange={onChange.reps}
            className={fieldClassName}
          />
        )}
        {showDuration && (
          <NumberField
            label="Thời gian tập mỗi set (giây)"
            min={1}
            value={values.duration}
            onChange={onChange.duration}
            className={fieldClassName}
          />
        )}
        <label className={cn('block space-y-2', fieldClassName)}>
          <span className="rogym-field-label">Mức tạ (kg)</span>
          <input
            className="rogym-input"
            type="number"
            min={0}
            step={0.25}
            value={values.weight}
            onChange={(event) => onChange.weight(event.target.value)}
            placeholder={weightPlaceholder}
          />
        </label>
        {!restOutsideGrid && restField}
      </div>
      {restOutsideGrid && restField}
    </div>
  )
}
