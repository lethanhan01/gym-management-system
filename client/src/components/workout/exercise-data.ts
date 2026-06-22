import type {
  Exercise,
  ExerciseCategory,
} from '@/services/workout.service'
import i18n from '@/lib/i18n'

export type ExerciseCategoryFilter = ExerciseCategory | ''

export function getExerciseCategories(): Array<{
  value: ExerciseCategoryFilter
  label: string
}> {
  return [
    { value: '', label: i18n.t('workout.categories.all', { ns: 'member' }) },
    { value: 'strength', label: i18n.t('workout.categories.strength', { ns: 'member' }) },
    { value: 'cardio', label: i18n.t('workout.categories.cardio', { ns: 'member' }) },
    { value: 'flexibility', label: i18n.t('workout.categories.flexibility', { ns: 'member' }) },
    { value: 'balance', label: i18n.t('workout.categories.balance', { ns: 'member' }) },
  ]
}

export function getExerciseCategoryLabel(category: ExerciseCategory): string {
  return (
    getExerciseCategories().find((item) => item.value === category)?.label ??
    category
  )
}

export function filterExercises(
  exercises: Exercise[],
  search: string,
  category: ExerciseCategoryFilter = '',
  includeDescription = false,
): Exercise[] {
  const query = search.trim().toLocaleLowerCase('vi')
  return exercises.filter((exercise) => {
    if (category && exercise.category !== category) return false
    if (!query) return true
    const values = [
      exercise.name,
      exercise.muscleGroup,
      exercise.equipmentNeeded,
      includeDescription ? exercise.description : null,
    ]
    return values
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase('vi').includes(query))
  })
}
