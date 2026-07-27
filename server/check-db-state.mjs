import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [bodyParts, muscles, equipment, secondaryMuscles, exercisesTotal, exercisesExercisedb] = await Promise.all([
    prisma.exerciseBodyPart.count(),
    prisma.exerciseMuscle.count(),
    prisma.exerciseEquipment.count(),
    prisma.exerciseSecondaryMuscle.count(),
    prisma.exercise.count(),
    prisma.exercise.count({ where: { source: 'exercisedb' } }),
  ])

  const nullBodyPart = await prisma.exercise.count({ where: { source: 'exercisedb', bodyPartId: null } })
  const nullTargetMuscle = await prisma.exercise.count({ where: { source: 'exercisedb', targetMuscleId: null } })
  const nullEquipment = await prisma.exercise.count({ where: { source: 'exercisedb', equipmentId: null } })

  console.log('=== FINAL DATABASE STATE ===')
  console.log(`exercise_body_parts:         ${bodyParts} records`)
  console.log(`exercise_muscles:            ${muscles} records`)
  console.log(`exercise_equipments:         ${equipment} records`)
  console.log(`exercise_secondary_muscles:  ${secondaryMuscles} records`)
  console.log(`exercises (total):           ${exercisesTotal} records`)
  console.log(`exercises (exercisedb):      ${exercisesExercisedb} records`)
  console.log('')
  console.log('=== COVERAGE ===')
  console.log(`exercises with body_part_id:     ${exercisesExercisedb - nullBodyPart} / ${exercisesExercisedb} (${((exercisesExercisedb - nullBodyPart)/exercisesExercisedb*100).toFixed(1)}%)`)
  console.log(`exercises with target_muscle_id: ${exercisesExercisedb - nullTargetMuscle} / ${exercisesExercisedb} (${((exercisesExercisedb - nullTargetMuscle)/exercisesExercisedb*100).toFixed(1)}%)`)
  console.log(`exercises with equipment_id:     ${exercisesExercisedb - nullEquipment} / ${exercisesExercisedb} (${((exercisesExercisedb - nullEquipment)/exercisesExercisedb*100).toFixed(1)}%)`)

  // Sample body parts
  const sampleBodyParts = await prisma.exerciseBodyPart.findMany({ orderBy: { name: 'asc' } })
  console.log('\n--- All exercise_body_parts ---')
  sampleBodyParts.forEach(r => console.log(`  [${r.bodyPartId}] ${r.name}`))

  // Sample muscles (first 10)
  const sampleMuscles = await prisma.exerciseMuscle.findMany({ take: 15, orderBy: { name: 'asc' } })
  console.log('\n--- Sample exercise_muscles (first 15) ---')
  sampleMuscles.forEach(r => console.log(`  [${r.muscleId}] ${r.name}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
