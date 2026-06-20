import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

const API_KEY = process.env.EXERCISEDB_API_KEY
if (!API_KEY) {
  console.error('EXERCISEDB_API_KEY is required')
  process.exit(1)
}

interface ExerciseDbItem {
  exerciseId: string
  name: string
  imageUrl: string
  equipments: string[]
  bodyParts: string[]
  exerciseType: string
  targetMuscles: string[]
  secondaryMuscles: string[]
  overview: string
  instructions: string[]
}

interface CachedExercise {
  name: string
  category: string
  muscleGroup: string
  equipmentNeeded: string
  description: string
  imageUrl: string
}

const CATEGORY_MAP: Record<string, string> = {
  STRENGTH: 'strength',
  CARDIO: 'cardio',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance',
  STRETCHING: 'flexibility',
  PLYOMETRICS: 'cardio',
  POWERLIFTING: 'strength',
  OLYMPIC_WEIGHTLIFTING: 'strength',
}

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'x-rapidapi-key': API_KEY! } }, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error(`JSON parse error: ${data.slice(0, 200)}`))
          }
        })
      })
      .on('error', reject)
  })
}

async function main() {
  const BASE = 'https://v2.exercisedb.dev'
  const BODY_PARTS = [
    'chest',
    'back',
    'shoulders',
    'upper arms',
    'lower arms',
    'upper legs',
    'lower legs',
    'waist',
  ]

  const exercises: CachedExercise[] = []

  for (const bodyPart of BODY_PARTS) {
    const url = `${BASE}/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=100&offset=0`
    console.log(`Fetching: ${bodyPart}...`)
    const data = (await fetchJson(url)) as ExerciseDbItem[]
    if (!Array.isArray(data)) {
      console.warn(`Unexpected response for ${bodyPart}:`, JSON.stringify(data).slice(0, 200))
      continue
    }
    for (const item of data) {
      exercises.push({
        name: item.name,
        category: CATEGORY_MAP[item.exerciseType?.toUpperCase()] ?? 'strength',
        muscleGroup: item.targetMuscles?.join(', ') ?? item.bodyParts?.join(', ') ?? '',
        equipmentNeeded: item.equipments?.join(', ') || 'Bodyweight',
        description: item.overview || item.instructions?.slice(0, 2).join(' ') || '',
        imageUrl: item.imageUrl ?? '',
      })
    }
  }

  const seen = new Set<string>()
  const deduped = exercises.filter((e) => {
    const key = e.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const out = path.join(__dirname, '../prisma/exercises-cache.json')
  fs.writeFileSync(out, JSON.stringify(deduped, null, 2), 'utf-8')
  console.log(`Done. Wrote ${deduped.length} exercises to exercises-cache.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
