import { externalIdHash } from './exercise-catalog-manifest'
import { ExerciseCatalogSyncService } from './exercise-catalog-sync.service'

const item = {
  externalId: 'push-up', name: 'Push up',
  bodyPart: 'chest', targetMuscle: 'pectorals', secondaryMuscles: ['triceps'],
  equipmentName: 'body weight', description: 'Push.',
  instructions: ['Lower body', 'Push up'],
  imageUrl: null, contentHash: 'a'.repeat(64),
}

function setup({ min = 1, transaction, client: suppliedClient }: { min?: number; transaction?: jest.Mock; client?: any } = {}) {
  const tx: any = {
    exercise: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    exerciseBodyPart: { upsert: jest.fn().mockResolvedValue({ bodyPartId: 1 }) },
    exerciseMuscle: { upsert: jest.fn().mockResolvedValue({ muscleId: 1 }) },
    exerciseEquipment: { upsert: jest.fn().mockResolvedValue({ equipmentId: 1 }) },
    exerciseSecondaryMuscle: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    exerciseCatalogSyncRun: { update: jest.fn().mockResolvedValue({ syncRunId: 1n, status: 'succeeded' }) },
    $executeRaw: jest.fn(),
  }
  const prisma: any = {
    exerciseCatalogSyncLock: { upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), count: jest.fn().mockResolvedValue(1), update: jest.fn() },
    exerciseCatalogSyncRun: { create: jest.fn().mockResolvedValue({ syncRunId: 1n }), update: jest.fn() },
    exercise: { updateMany: jest.fn() },
    $transaction: transaction ?? jest.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
  }
  const client: any = suppliedClient ?? { isEnabled: () => true, async *allExercises() { yield [item] } }
  const config = { get: jest.fn((key: string) => ({ EXERCISEDB_LOCK_LEASE_SECONDS: 300, EXERCISEDB_MIN_EXPECTED_COUNT: min, EXERCISEDB_UPSERT_BATCH_SIZE: 1 }[key])) }
  return { prisma, tx, client, config, service: new ExerciseCatalogSyncService(prisma, client, config as any) }
}

describe('ExerciseCatalogSyncService', () => {
  it('rejects a provider payload below the configured minimum before starting a database transaction', async () => {
    const { service, prisma } = setup({ min: 2 })

    await expect(service.run()).rejects.toThrow('below the required minimum of 2')

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.exerciseCatalogSyncRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }))
  })

  it('commits all catalog mutations through one transaction and uses one SQL upsert per configured batch', async () => {
    const { service, prisma, tx } = setup()

    await expect(service.run()).resolves.toMatchObject({ started: true, run: { status: 'succeeded' } })

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 270000 })
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
    const query = tx.$executeRaw.mock.calls[0][0].strings.join('')
    expect(query).toContain('"exercise_source"')
    expect(query).not.toContain('"exercise_category"')
    expect(tx.exerciseCatalogSyncRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'succeeded', insertedCount: 1 }) }))
  })

  it('records a failed run when the transaction rolls back', async () => {
    const transaction = jest.fn().mockRejectedValue(new Error('database write failed'))
    const { service, prisma } = setup({ transaction })

    await expect(service.run()).rejects.toThrow('database write failed')

    expect(prisma.exerciseCatalogSyncRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }))
  })

  it('refuses a manifest mismatch before starting a transaction or transitioning legacy exercises', async () => {
    const { service, prisma } = setup()
    const manifest = { version: 1 as const, pageSize: 10 as const, count: 1, externalIdHash: 'b'.repeat(64), requestCount: 1, firstExternalId: 'push-up', lastExternalId: 'push-up', generatedAt: new Date().toISOString() }

    await expect(service.run({ manifest })).rejects.toThrow('external ID set differs')

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('accepts a matching manifest and keeps legacy transition inside the commit transaction', async () => {
    const { service, prisma, tx } = setup()
    const manifest = { version: 1 as const, pageSize: 10 as const, count: 1, externalIdHash: externalIdHash([item]), requestCount: 1, firstExternalId: 'push-up', lastExternalId: 'push-up', generatedAt: new Date().toISOString() }

    await service.onModuleInit()
    await expect(service.run({ manifest })).resolves.toMatchObject({ started: true })

    expect(prisma.exercise.updateMany).not.toHaveBeenCalled()
    expect(tx.exercise.updateMany).toHaveBeenCalledTimes(3)
  })

  it('does not transition legacy exercises when provider fetch fails', async () => {
    const client = { isEnabled: () => true, async *allExercises() { throw new Error('provider unavailable') } }
    const { service, prisma } = setup({ client })

    await expect(service.run()).rejects.toThrow('provider unavailable')

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.exercise.updateMany).not.toHaveBeenCalled()
  })

  it('counts matching existing rows as unchanged while still issuing one batch upsert', async () => {
    const { service, tx } = setup()
    tx.exercise.findMany.mockResolvedValue([{ externalId: 'push-up', contentHash: item.contentHash, exerciseId: 1n }])

    await service.run()

    expect(tx.exerciseCatalogSyncRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ insertedCount: 0, updatedCount: 0, unchangedCount: 1 }) }))
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
  })
})
