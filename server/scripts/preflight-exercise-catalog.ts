import 'reflect-metadata'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { ExerciseCatalogManifest } from '../src/workout/exercises/exercise-catalog-manifest'
import { preflightExerciseCatalog } from '../src/workout/exercises/exercise-catalog-preflight'
import { ExerciseDbV2Client } from '../src/workout/exercises/exercise-db-v2.client'

function manifestPath(args: string[]) {
  const index = args.indexOf('--manifest')
  const value = index >= 0 ? args[index + 1] : undefined
  if (!value || args.length !== 2) throw new Error('Usage: npm run exercise:catalog:preflight -- --manifest <absolute-or-relative-path>')
  return resolve(value)
}

function envConfig(key: string) {
  if (key === 'EXERCISEDB_PAGE_SIZE') return 10
  if (key === 'EXERCISEDB_RETRY_LIMIT') return Number(process.env.EXERCISEDB_RETRY_LIMIT ?? 3)
  if (key === 'EXERCISEDB_TIMEOUT_MS') return Number(process.env.EXERCISEDB_TIMEOUT_MS ?? 15_000)
  return process.env[key]
}

async function main() {
  const path = manifestPath(process.argv.slice(2))
  if (process.env.EXERCISEDB_SYNC_ENABLED !== 'true' || !process.env.EXERCISEDB_API_KEY?.trim()) {
    throw new Error('EXERCISEDB_SYNC_ENABLED=true and EXERCISEDB_API_KEY are required for preflight')
  }
  if (process.env.EXERCISEDB_RETRY_LIMIT !== '0') throw new Error('EXERCISEDB_RETRY_LIMIT=0 is required so the quota calculation remains deterministic')

  const client = new ExerciseDbV2Client({ get: envConfig } as any)
  const manifest: ExerciseCatalogManifest = await preflightExerciseCatalog(client)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  console.log(JSON.stringify(manifest))
}

void main()
