/**
 * download-exercise-snapshot.mjs
 * Downloads all exercises from the FREE ExerciseDB V1 API (oss.exercisedb.dev)
 * No API key required! Uses cursor-based pagination.
 *
 * Usage: node download-exercise-snapshot.mjs
 * Output: exercise-snapshot.json
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://oss.exercisedb.dev/api/v1/exercises'
const PAGE_SIZE = 25 // Max allowed by free API
const OUTPUT_FILE = resolve(__dirname, 'exercise-snapshot.json')

async function fetchPage(after, retries = 5) {
  const url = new URL(BASE_URL)
  url.searchParams.set('limit', String(PAGE_SIZE))
  if (after) url.searchParams.set('after', after)

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (response.status === 429) {
      const waitMs = Math.min(2000 * 2 ** attempt, 30000)
      console.log(`\n  Rate limited (attempt ${attempt + 1}/${retries + 1}), waiting ${waitMs}ms...`)
      await new Promise(r => setTimeout(r, waitMs))
      continue
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API request failed (${response.status}): ${text.slice(0, 500)}`)
    }

    const json = await response.json()
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(`Unexpected API response shape: ${JSON.stringify(json).slice(0, 200)}`)
    }
    return { data: json.data, meta: json.meta }
  }
  throw new Error('Max retries exceeded due to rate limiting')
}

async function downloadAll() {
  console.log('=== ExerciseDB V1 (Free) Snapshot Downloader ===')
  console.log(`API: ${BASE_URL}`)
  console.log(`Page size: ${PAGE_SIZE}`)
  console.log(`Output: ${OUTPUT_FILE}`)
  console.log('')

  const all = []
  let cursor = null
  let page = 1

  while (true) {
    process.stdout.write(`Fetching page ${page}${cursor ? ` (after=${cursor})` : ''}... `)
    const { data, meta } = await fetchPage(cursor)
    console.log(`${data.length} items (total so far: ${all.length + data.length} / ${meta.total})`)

    all.push(...data)

    if (!meta.hasNextPage || !meta.nextCursor) break
    cursor = meta.nextCursor
    page++

    // Delay to respect rate limits (free API is strict)
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log(`\nTotal exercises fetched: ${all.length}`)

  // Summary stats
  const bodyParts = new Set(all.flatMap(e => Array.isArray(e.bodyParts) ? e.bodyParts : []).map(s => s.toLowerCase().trim()).filter(Boolean))
  const targetMuscles = new Set(all.flatMap(e => Array.isArray(e.targetMuscles) ? e.targetMuscles : []).map(s => s.toLowerCase().trim()).filter(Boolean))
  const secondaryMuscles = new Set(all.flatMap(e => Array.isArray(e.secondaryMuscles) ? e.secondaryMuscles : []).map(s => s.toLowerCase().trim()).filter(Boolean))
  const equipment = new Set(all.flatMap(e => Array.isArray(e.equipments) ? e.equipments : []).map(s => s.toLowerCase().trim()).filter(Boolean))

  console.log(`\nUnique body parts (${bodyParts.size}): ${[...bodyParts].sort().join(', ')}`)
  console.log(`Unique target muscles (${targetMuscles.size}): ${[...targetMuscles].sort().join(', ')}`)
  console.log(`Unique secondary muscles (${secondaryMuscles.size}): ${[...secondaryMuscles].sort().join(', ')}`)
  console.log(`Unique equipment (${equipment.size}): ${[...equipment].sort().join(', ')}`)

  // Save snapshot
  writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2), 'utf8')
  console.log(`\nSnapshot saved to: ${OUTPUT_FILE}`)
  console.log(`File size: ${(JSON.stringify(all).length / 1024 / 1024).toFixed(2)} MB`)
}

downloadAll().catch(err => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
