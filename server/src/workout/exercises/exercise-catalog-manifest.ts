import { createHash } from 'crypto'
import { NormalizedExerciseDbExercise } from './exercise-db-v2.client'

export const EXERCISEDB_PAGE_SIZE = 10

export interface ExerciseCatalogManifest {
  version: 1
  pageSize: typeof EXERCISEDB_PAGE_SIZE
  count: number
  externalIdHash: string
  requestCount: number
  firstExternalId: string | null
  lastExternalId: string | null

  generatedAt: string
}

export function externalIdHash(
  items: Iterable<Pick<NormalizedExerciseDbExercise, 'externalId'>>
): string {
  const ids = [...items].map((item) => item.externalId).sort()
  return createHash('sha256').update(ids.join('\n')).digest('hex')
}

export function assertUniqueExternalIds(
  items: Iterable<Pick<NormalizedExerciseDbExercise, 'externalId'>>
) {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.externalId))
      throw new Error(`ExerciseDB returned duplicate exercise id: ${item.externalId}`)
    ids.add(item.externalId)
  }
}

export function assertManifestMatches(
  items: NormalizedExerciseDbExercise[],
  manifest: ExerciseCatalogManifest
) {
  assertManifestShape(manifest)
  assertUniqueExternalIds(items)
  if (items.length !== manifest.count) {
    throw new Error(
      `ExerciseDB returned ${items.length} exercises, but preflight manifest requires ${manifest.count}`
    )
  }
  if (externalIdHash(items) !== manifest.externalIdHash) {
    throw new Error(
      'ExerciseDB external ID set differs from the preflight manifest; refusing to publish a changed snapshot'
    )
  }
}

export function assertManifestShape(
  manifest: unknown
): asserts manifest is ExerciseCatalogManifest {
  if (!manifest || typeof manifest !== 'object')
    throw new Error('ExerciseDB manifest must be a JSON object')
  const value = manifest as Partial<ExerciseCatalogManifest>
  const count = value.count
  const requestCount = value.requestCount
  if (
    value.version !== 1 ||
    value.pageSize !== EXERCISEDB_PAGE_SIZE ||
    !Number.isSafeInteger(count) ||
    typeof count !== 'number' ||
    count < 1 ||
    !Number.isSafeInteger(requestCount) ||
    typeof requestCount !== 'number' ||
    requestCount < 1 ||
    typeof value.externalIdHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.externalIdHash) ||
    typeof value.generatedAt !== 'string'
  )
    throw new Error('ExerciseDB manifest has an invalid shape')
}
