import 'reflect-metadata'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { ExerciseCatalogManifest, assertManifestShape } from '../src/workout/exercises/exercise-catalog-manifest'
import { ExerciseCatalogSyncService } from '../src/workout/exercises/exercise-catalog-sync.service'

function manifestPath(args: string[]) {
  const index = args.indexOf('--manifest')
  const value = index >= 0 ? args[index + 1] : undefined
  if (!value || args.length !== 2) throw new Error('Usage: npm run exercise:catalog:sync -- --manifest <absolute-or-relative-path>')
  return resolve(value)
}

async function main() {
  // A one-shot import must never install the recurring cron job, even if the
  // deployment environment has scheduling enabled for a separate use case.
  process.env.EXERCISEDB_SCHEDULER_ENABLED = 'false'
  if (process.env.EXERCISEDB_RETRY_LIMIT !== '0') throw new Error('EXERCISEDB_RETRY_LIMIT=0 is required so the quota calculation remains deterministic')
  const manifest = JSON.parse(await readFile(manifestPath(process.argv.slice(2)), 'utf8')) as ExerciseCatalogManifest
  assertManifestShape(manifest)
  if (Number(process.env.EXERCISEDB_PAGE_SIZE) !== manifest.pageSize) throw new Error(`EXERCISEDB_PAGE_SIZE must match manifest pageSize=${manifest.pageSize}`)
  if (Number(process.env.EXERCISEDB_MIN_EXPECTED_COUNT) !== manifest.count) throw new Error(`EXERCISEDB_MIN_EXPECTED_COUNT must match manifest count=${manifest.count}`)
  const app = await NestFactory.createApplicationContext(AppModule)
  try {
    const result = await app.get(ExerciseCatalogSyncService).run({ manifest })
    console.log(JSON.stringify(result, (_key, value) => typeof value === 'bigint' ? value.toString() : value))
  }
  finally { await app.close() }
}
void main()
