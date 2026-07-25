import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ExerciseSource, ExerciseSyncRunStatus, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { ExerciseDbV2Client, NormalizedExerciseDbExercise } from './exercise-db-v2.client'
import { ExerciseCatalogManifest, assertManifestMatches, assertUniqueExternalIds } from './exercise-catalog-manifest'

const LOCK = 'exercisedb-catalog'

@Injectable()
export class ExerciseCatalogSyncService implements OnModuleInit {
  private readonly logger = new Logger(ExerciseCatalogSyncService.name)
  constructor(private readonly prisma: PrismaService, private readonly client: ExerciseDbV2Client, private readonly config: ConfigService) {}

  async onModuleInit() { /* Legacy transition belongs to the validated snapshot transaction. */ }

  async run(options: { manifest?: ExerciseCatalogManifest } = {}): Promise<{ started: boolean; run?: unknown }> {
    if (!this.client.isEnabled()) throw new ServiceUnavailableException('ExerciseDB sync is disabled or not configured')
    const token = randomUUID(); const now = new Date(); const lease = this.leaseExpiry()
    await this.prisma.exerciseCatalogSyncLock.upsert({ where: { lockName: LOCK }, create: { lockName: LOCK }, update: {} })
    const claimed = await this.prisma.exerciseCatalogSyncLock.updateMany({
      where: { lockName: LOCK, OR: [{ executionToken: null }, { leaseExpiresAt: { lt: now } }] },
      data: { executionToken: token, leaseExpiresAt: lease },
    })
    if (!claimed.count) return { started: false }
    const run = await this.prisma.exerciseCatalogSyncRun.create({ data: { status: ExerciseSyncRunStatus.running, executionToken: token } })
    try {
      const counters = { fetchedCount: 0, insertedCount: 0, updatedCount: 0, unchangedCount: 0, fallbackMappedCount: 0 }
      const items: NormalizedExerciseDbExercise[] = []
      for await (const page of this.client.allExercises()) {
        for (const item of page) {
          items.push(item)
          counters.fetchedCount++
          if (item.fallbackMapped) counters.fallbackMappedCount++
        }
        await this.renew(token)
      }
      const minimum = this.config.get<number>('EXERCISEDB_MIN_EXPECTED_COUNT') ?? 1
      if (items.length < minimum) throw new Error(`ExerciseDB returned ${items.length} exercises, below the required minimum of ${minimum}; refusing to publish a partial catalog`)
      assertUniqueExternalIds(items)
      if (options.manifest) assertManifestMatches(items, options.manifest)

      // Provider I/O is deliberately outside the transaction. Once the complete
      // snapshot passes validation, catalog visibility and sync status commit as
      // one unit so a failed persistence step never exposes a partial import.
      await this.assertLease(token)
      const batchSize = this.config.get<number>('EXERCISEDB_UPSERT_BATCH_SIZE') ?? 50
      const leaseMs = (this.config.get<number>('EXERCISEDB_LOCK_LEASE_SECONDS') ?? 300) * 1000
      const completed = await this.prisma.$transaction(async (tx) => {
        await this.transitionLegacyExercises(tx)
        for (let start = 0; start < items.length; start += batchSize) {
          await this.upsertBatch(tx, items.slice(start, start + batchSize), run.syncRunId, counters)
        }
        const hidden = await tx.exercise.updateMany({
          where: { source: ExerciseSource.exercisedb, catalogVisible: true, NOT: { lastSeenSyncRunId: run.syncRunId } },
          data: { catalogVisible: false },
        })
        return tx.exerciseCatalogSyncRun.update({ where: { syncRunId: run.syncRunId }, data: { status: ExerciseSyncRunStatus.succeeded, completedAt: new Date(), hiddenCount: hidden.count, ...counters } })
      }, { timeout: Math.floor(leaseMs * 0.9) })
      return { started: true, run: completed }
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown sync failure'
      this.logger.error(`Exercise catalog sync failed: ${message}`)
      await this.prisma.exerciseCatalogSyncRun.update({ where: { syncRunId: run.syncRunId }, data: { status: ExerciseSyncRunStatus.failed, completedAt: new Date(), errorMessage: message } })
      throw error
    } finally {
      await this.prisma.exerciseCatalogSyncLock.updateMany({ where: { lockName: LOCK, executionToken: token }, data: { executionToken: null, leaseExpiresAt: null } })
    }
  }

  async recentRuns(limit = 20) { return this.prisma.exerciseCatalogSyncRun.findMany({ take: Math.min(limit, 100), orderBy: { startedAt: 'desc' } }) }
  private async transitionLegacyExercises(tx: Prisma.TransactionClient) {
    // Idempotent compatibility transition; IDs/FKs are deliberately untouched.
    await tx.exercise.updateMany({ where: { source: ExerciseSource.legacy, createdByStaffId: { not: null } }, data: { source: ExerciseSource.manual, catalogVisible: true } })
    await tx.exercise.updateMany({ where: { source: ExerciseSource.legacy }, data: { catalogVisible: false } })
  }
  private leaseExpiry() { return new Date(Date.now() + (this.config.get<number>('EXERCISEDB_LOCK_LEASE_SECONDS') ?? 300) * 1000) }
  private async renew(token: string) {
    const renewed = await this.prisma.exerciseCatalogSyncLock.updateMany({
      where: { lockName: LOCK, executionToken: token, leaseExpiresAt: { gt: new Date() } },
      data: { leaseExpiresAt: this.leaseExpiry() },
    })
    if (!renewed.count) throw new Error('Exercise catalog sync lease was lost')
  }
  private async assertLease(token: string) { const owned = await this.prisma.exerciseCatalogSyncLock.count({ where: { lockName: LOCK, executionToken: token, leaseExpiresAt: { gt: new Date() } } }); if (!owned) throw new Error('Exercise catalog sync lease was lost') }
  private async upsertBatch(tx: Prisma.TransactionClient, items: NormalizedExerciseDbExercise[], runId: bigint, counters: Record<string, number>) {
    const existing = await tx.exercise.findMany({
      where: { source: ExerciseSource.exercisedb, externalId: { in: items.map((item) => item.externalId) } },
      select: { externalId: true, contentHash: true },
    })
    const hashes = new Map(existing.map((item: { externalId: string | null; contentHash: string | null }) => [item.externalId, item.contentHash]))
    for (const item of items) {
      const hash = hashes.get(item.externalId)
      if (!hashes.has(item.externalId)) counters.insertedCount++
      else if (hash === item.contentHash) counters.unchangedCount++
      else counters.updatedCount++
    }

    const now = new Date()
    const rows = items.map((item) => Prisma.sql`(
      ${item.name}, ${item.category}::"exercise_category", ${item.muscleGroup}, ${item.equipmentNeeded}, ${item.description},
      ${item.imageUrl}, ${ExerciseSource.exercisedb}::"exercise_source", ${item.externalId}, ${item.contentHash}, ${runId}, ${now}, true
    )`)
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "exercises" (
        "name", "category", "muscle_group", "equipment_needed", "description", "image_url", "source",
        "external_id", "content_hash", "last_seen_sync_run_id", "last_synced_at", "catalog_visible"
      ) VALUES ${Prisma.join(rows)}
      ON CONFLICT ("source", "external_id") DO UPDATE SET
        "name" = EXCLUDED."name", "category" = EXCLUDED."category", "muscle_group" = EXCLUDED."muscle_group",
        "equipment_needed" = EXCLUDED."equipment_needed", "description" = EXCLUDED."description",
        "image_url" = EXCLUDED."image_url", "content_hash" = EXCLUDED."content_hash",
        "last_seen_sync_run_id" = EXCLUDED."last_seen_sync_run_id", "last_synced_at" = EXCLUDED."last_synced_at",
        "catalog_visible" = true
    `)
  }
}
