/**
 * backfill-gif-url.ts
 * Reads the pre-built video filename list (from sparse-cloned dataset repo),
 * builds an id→gifUrl map, then batch-updates gifUrl in exercises table.
 *
 * Pre-requisite: run the sparse clone first (already done):
 *   git clone --no-checkout --depth=1 --filter=blob:none \
 *     https://github.com/hasaneyldrm/exercises-dataset.git ./tmp-exercises-dataset
 *   cd ./tmp-exercises-dataset && git sparse-checkout set videos && git checkout
 *
 * Usage:
 *   npx dotenv-cli -e .env -- ts-node --transpile-only scripts/backfill-gif-url.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

const RAW_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos'
const FILENAMES_PATH = resolve(__dirname, '../tmp-exercises-dataset/video-filenames.json')

function fetchAllVideoFiles(): { name: string }[] {
  const raw = readFileSync(FILENAMES_PATH, 'utf8')
  const filenames: string[] = JSON.parse(raw)
  return filenames.map(name => ({ name }))
}

function buildIdToGifUrl(files: { name: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const file of files) {
    if (!file.name.endsWith('.gif')) continue
    // Pattern: {id}-{hash}.gif  e.g. "0001-2gPfomN.gif"
    const match = file.name.match(/^(\d{4})-/)
    if (!match) {
      console.warn(`Skipping unexpected filename: ${file.name}`)
      continue
    }
    const id = match[1]
    // Use the raw CDN URL directly (no need to use download_url which may be slower)
    map.set(id, `${RAW_BASE}/${file.name}`)
  }
  return map
}

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('📥 Reading video file listing from local sparse clone...')
    const files = fetchAllVideoFiles()
    console.log(`   Found ${files.length} GIF files`)

    const idToGifUrl = buildIdToGifUrl(files)
    console.log(`   Mapped ${idToGifUrl.size} unique exercise IDs to GIF URLs`)

    // Print sample mapping
    const sample = [...idToGifUrl.entries()].slice(0, 3)
    for (const [id, url] of sample) {
      console.log(`   Sample: ${id} → ${url}`)
    }

    console.log('\n📊 Counting exercises needing update...')
    const total = await prisma.exercise.count({
      where: { source: 'exercisedb', externalId: { not: null } },
    })
    console.log(`   Total exercisedb exercises in DB: ${total}`)

    // Batch update: 100 at a time
    const BATCH = 100
    let updated = 0
    let skipped = 0

    const allExercises = await prisma.exercise.findMany({
      where: { source: 'exercisedb', externalId: { not: null } },
      select: { exerciseId: true, externalId: true },
    })

    console.log(`\n🔄 Starting batch UPDATE (batch size: ${BATCH})...`)
    for (let i = 0; i < allExercises.length; i += BATCH) {
      const batch = allExercises.slice(i, i + BATCH)
      for (const ex of batch) {
        const gifUrl = idToGifUrl.get(ex.externalId!)
        if (!gifUrl) {
          skipped++
          continue
        }
        await prisma.exercise.update({
          where: { exerciseId: ex.exerciseId },
          data: { gifUrl },
        })
        updated++
      }
      const pct = Math.round(((i + batch.length) / allExercises.length) * 100)
      process.stdout.write(`\r   Progress: ${i + batch.length}/${allExercises.length} (${pct}%) — updated: ${updated}, skipped: ${skipped}`)
    }

    console.log(`\n\n✅ Done!`)
    console.log(`   Updated: ${updated} exercises with gifUrl`)
    console.log(`   Skipped: ${skipped} exercises (no matching GIF in dataset)`)
    console.log(`   Dataset coverage: ${Math.round((updated / total) * 100)}%`)
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch(e => {
  console.error(e)
  process.exit(1)
})
