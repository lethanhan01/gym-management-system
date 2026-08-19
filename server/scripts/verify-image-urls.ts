import { PrismaClient } from '@prisma/client'

async function check() {
  const prisma = new PrismaClient()
  try {
    const totalExercises = await prisma.exercise.count()
    const gifInImageUrl = await prisma.exercise.count({
      where: { imageUrl: { contains: '.gif' } },
    })
    const jpgInImageUrl = await prisma.exercise.count({
      where: { imageUrl: { contains: '.jpg' } },
    })
    const samples = await prisma.exercise.findMany({
      take: 4,
      select: { exerciseId: true, name: true, gifUrl: true, imageUrl: true },
    })

    console.log('--- DATABASE VERIFICATION ---')
    console.log('Total exercises:', totalExercises)
    console.log('Number of .gif in imageUrl:', gifInImageUrl)
    console.log('Number of .jpg in imageUrl:', jpgInImageUrl)
    console.log('Sample rows:')
    for (const row of samples) {
      console.log(`\nExercise #${row.exerciseId} - ${row.name}:`)
      console.log(`  gifUrl:   ${row.gifUrl}`)
      console.log(`  imageUrl: ${row.imageUrl}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

void check()
