import { useTranslation } from 'react-i18next'
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
  isCardio = false,
  values,
  onChange,
  durationMode = 'cardio-only',
  gridClassName = 'grid gap-4 md:grid-cols-2',
  compact = false,
  restOutsideGrid = false,
  weightPlaceholder,
}: {
  isCardio?: boolean
  values: ExerciseTargetValues
  onChange: ExerciseTargetChangeHandlers
  durationMode?: 'cardio-only' | 'always'
  gridClassName?: string
  compact?: boolean
  restOutsideGrid?: boolean
  weightPlaceholder?: string
}) {
  const { t } = useTranslation('member')
  const fieldClassName = compact ? 'space-y-1.5' : undefined
  const showReps = !isCardio
  const showDuration = durationMode === 'always' || isCardio
  const restField = (
    <NumberField
      label={t('workout.planBuilder.fieldRest')}
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
          label={t('workout.planBuilder.fieldSets')}
          min={1}
          value={values.sets}
          onChange={onChange.sets}
          className={fieldClassName}
        />
        {showReps && (
          <NumberField
            label={t('workout.planBuilder.fieldReps')}
            min={1}
            value={values.reps}
            onChange={onChange.reps}
            className={fieldClassName}
          />
        )}
        {showDuration && (
          <NumberField
            label={t('workout.planBuilder.fieldDuration')}
            min={1}
            value={values.duration}
            onChange={onChange.duration}
            className={fieldClassName}
          />
        )}
        <label className={cn('block space-y-2', fieldClassName)}>
          <span className="rogym-field-label">{t('workout.planBuilder.fieldWeight')}</span>
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
