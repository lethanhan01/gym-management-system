import { preflightExerciseCatalog } from './exercise-catalog-preflight'

const item = (externalId: string) => ({ externalId, name: externalId, category: 'strength' as const, muscleGroup: null, equipmentNeeded: null, description: null, imageUrl: null, contentHash: externalId, fallbackMapped: false })

describe('preflightExerciseCatalog', () => {
  it('writes metadata for a fully validated snapshot', async () => {
    const client = { async *allExercises() { yield [item('a'), item('b')] } } as any

    await expect(preflightExerciseCatalog(client)).resolves.toMatchObject({ version: 1, pageSize: 10, count: 2, requestCount: 0, firstExternalId: 'a', lastExternalId: 'b' })
  })

  it('accepts provider muscle metadata longer than the manual API limit', async () => {
    const longMuscleGroup = Array.from({ length: 30 }, (_, index) => `secondary-muscle-${index}`).join(', ')
    const client = { async *allExercises() { yield [{ ...item('a'), muscleGroup: longMuscleGroup }] } } as any

    await expect(preflightExerciseCatalog(client)).resolves.toMatchObject({ count: 1, firstExternalId: 'a' })
    expect(longMuscleGroup.length).toBeGreaterThan(100)
  })

  it('rejects duplicate external IDs before a manifest can be emitted', async () => {
    const client = { async *allExercises() { yield [item('a'), item('a')] } } as any

    await expect(preflightExerciseCatalog(client)).rejects.toThrow('duplicate exercise id')
  })
})
