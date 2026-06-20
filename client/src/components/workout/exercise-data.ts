import type {
  Exercise,
  ExerciseCategory,
} from '@/services/workout.service'

export type ExerciseCategoryFilter = ExerciseCategory | ''

export const EXERCISE_CATEGORY_OPTIONS: Array<{
  value: ExerciseCategoryFilter
  label: string
}> = [
  { value: '', label: 'Tất cả' },
  { value: 'strength', label: 'Sức mạnh' },
  { value: 'cardio', label: 'Tim mạch' },
  { value: 'flexibility', label: 'Linh hoạt' },
  { value: 'balance', label: 'Thăng bằng' },
]

export function getExerciseCategoryLabel(category: ExerciseCategory): string {
  return (
    EXERCISE_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ??
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
