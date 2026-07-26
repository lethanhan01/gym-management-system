import { PrismaClient, ExerciseSource } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Bắt đầu backfill dữ liệu instructions...')
  
  // 1. Đọc file exercise-snapshot.json
  const snapshotPath = join(__dirname, 'exercise-snapshot.json')
  let snapshotData: any[]
  try {
    const rawData = readFileSync(snapshotPath, 'utf-8')
    snapshotData = JSON.parse(rawData)
    console.log(`Đã đọc thành công file snapshot với ${snapshotData.length} bài tập.`)
  } catch (error) {
    console.error('Không thể đọc file snapshot:', error)
    process.exit(1)
  }

  // 2. Chuẩn bị dữ liệu để update
  let updatedCount = 0
  let skippedCount = 0

  // Do số lượng bài tập khá nhiều nên ta sẽ chia thành các batch
  const batchSize = 100
  for (let i = 0; i < snapshotData.length; i += batchSize) {
    const batch = snapshotData.slice(i, i + batchSize)
    
    // Execute multiple raw queries concurrently per batch without a transaction to avoid timeout
    const promises = batch.map(async (item) => {
      if (!item.exerciseId || !Array.isArray(item.instructions) || item.instructions.length === 0) {
        return { count: 0, skipped: true }
      }

      const instructionsJsonStr = JSON.stringify(item.instructions)

      const result = await prisma.$executeRaw`
        UPDATE "exercises" 
        SET "instructions" = ${instructionsJsonStr} 
        WHERE "name" = ${item.name} AND "source" = 'exercisedb'::"exercise_source"
      `
      return { count: result, skipped: false }
    })
    
    const results = await Promise.all(promises)
    for (const r of results) {
      if (r.skipped) skippedCount++
      else if (r.count > 0) updatedCount += r.count
      else skippedCount++
    }
    
    console.log(`Tiến độ: Đã xử lý ${Math.min(i + batchSize, snapshotData.length)} / ${snapshotData.length} bài tập.`)
  }

  console.log('=============================')
  console.log('Hoàn thành backfill!')
  console.log(`Số bài tập đã cập nhật thành công: ${updatedCount}`)
  console.log(`Số bài tập bỏ qua (không có instructions hoặc không tìm thấy): ${skippedCount}`)
}

main()
  .catch((e) => {
    console.error('Lỗi trong quá trình backfill:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
