import {
  EXERCISEDB_PAGE_SIZE,
  ExerciseCatalogManifest,
  assertUniqueExternalIds,
  externalIdHash,
} from './exercise-catalog-manifest'
import { ExerciseDbV2Client, NormalizedExerciseDbExercise } from './exercise-db-v2.client'

export async function preflightExerciseCatalog(
  client: ExerciseDbV2Client
): Promise<ExerciseCatalogManifest> {
  const items: NormalizedExerciseDbExercise[] = []
  let requestCount = 0

  for await (const page of client.allExercises({
    pageSize: EXERCISEDB_PAGE_SIZE,
    strictPagination: true,
    onRequest: () => requestCount++,
  })) {
    items.push(...page)
  }

  assertUniqueExternalIds(items)
  if (!items.length) throw new Error('ExerciseDB preflight returned no exercises')
  return {
    version: 1,
    pageSize: EXERCISEDB_PAGE_SIZE,
    count: items.length,
    externalIdHash: externalIdHash(items),
    requestCount,
    firstExternalId: items[0]?.externalId ?? null,
    lastExternalId: items.at(-1)?.externalId ?? null,
    generatedAt: new Date().toISOString(),
  }
}
