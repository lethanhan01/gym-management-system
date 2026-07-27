import type { Exercise } from '@/services/workout.service'

export function filterExercises(
  exercises: Exercise[],
  search: string,
  bodyPartId?: number,
  targetMuscleId?: number,
  equipmentId?: number,
  includeDescription = false,
): Exercise[] {
  const query = search.trim().toLocaleLowerCase('vi')
  return exercises.filter((exercise) => {
    if (bodyPartId && exercise.bodyPartId !== bodyPartId) return false
    if (targetMuscleId && exercise.targetMuscleId !== targetMuscleId) return false
    if (equipmentId && exercise.equipmentId !== equipmentId) return false

    if (!query) return true

    const values = [
      exercise.name,
      exercise.bodyPart?.name,
      exercise.targetMuscle?.name,
      exercise.equipment?.name,
      includeDescription ? exercise.description : null,
    ]

    return values
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .some((value) => value.toLocaleLowerCase('vi').includes(query))
  })
}
