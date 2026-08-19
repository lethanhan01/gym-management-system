/**
 * backfill-image-url.ts
 * Batch updates imageUrl for exercises with proper static .jpg image URLs.
 *
 * Mode 1 (Default): Converts gifUrl (/videos/*.gif) to static image URL (/images/*.jpg) and updates image_url.
 * Mode 2 (JSON file): Reads an external id→imageUrl JSON map and updates accordingly.
 *
 * Usage:
 *   npx dotenv-cli -e .env -e .env.local -- ts-node --transpile-only scripts/backfill-image-url.ts
 *   npx dotenv-cli -e .env -e .env.local -- ts-node --transpile-only scripts/backfill-image-url.ts --from-file ./images-map.json
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

function convertGifUrlToJpgUrl(gifUrl: string): string {
  return gifUrl.replace('/videos/', '/images/').replace(/\.gif(\?.*)?$/i, '.jpg$1')
}

async function main() {
  const prisma = new PrismaClient()
  const args = process.argv.slice(2)
  const fileArgIndex = args.indexOf('--from-file')

  try {
    let customMap: Record<string, string> | null = null

    if (fileArgIndex !== -1 && args[fileArgIndex + 1]) {
      const filePath = resolve(process.cwd(), args[fileArgIndex + 1])
      if (existsSync(filePath)) {
        console.log(`📥 Reading custom image mapping from ${filePath}...`)
        customMap = JSON.parse(readFileSync(filePath, 'utf8'))
      } else {
        console.warn(`⚠️ Specified file not found: ${filePath}, falling back to default backfill mode.`)
      }
    }

    if (customMap) {
      console.log(`\n📊 Updating exercises from custom mapping (${Object.keys(customMap).length} entries)...`)
      let updated = 0
      for (const [externalId, imageUrl] of Object.entries(customMap)) {
        const result = await prisma.exercise.updateMany({
          where: { externalId, source: 'exercisedb' },
          data: { imageUrl },
        })
        updated += result.count
      }
      console.log(`✅ Updated ${updated} exercises with custom imageUrl.`)
    } else {
      console.log('🔄 Backfilling exercises: converting gifUrl to static .jpg imageUrl (/images/*.jpg)...')
      const exercises = await prisma.exercise.findMany({
        where: {
          gifUrl: { not: null },
        },
        select: { exerciseId: true, gifUrl: true, imageUrl: true },
      })

      console.log(`   Found ${exercises.length} exercises with gifUrl`)
      const BATCH = 100
      let updated = 0

      for (let i = 0; i < exercises.length; i += BATCH) {
        const batch = exercises.slice(i, i + BATCH)
        for (const ex of batch) {
          if (!ex.gifUrl) continue
          const jpgUrl = convertGifUrlToJpgUrl(ex.gifUrl)
          if (ex.imageUrl === jpgUrl) continue

          await prisma.exercise.update({
            where: { exerciseId: ex.exerciseId },
            data: { imageUrl: jpgUrl },
          })
          updated++
        }
        const pct = Math.round(((i + batch.length) / exercises.length) * 100)
        process.stdout.write(`\r   Progress: ${i + batch.length}/${exercises.length} (${pct}%) — updated: ${updated}`)
      }

      console.log(`\n\n✅ Backfill complete! Updated ${updated} exercises to .jpg image URLs.`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch((e) => {
  console.error(e)
  process.exit(1)
})
