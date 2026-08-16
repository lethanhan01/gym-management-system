import { preflightExerciseCatalog } from './exercise-catalog-preflight'

const item = (externalId: string) => ({
  externalId,
  name: externalId,
  bodyPart: 'chest',
  targetMuscle: 'pectorals',
  secondaryMuscles: ['triceps'],
  equipmentName: 'body weight',
  description: null,
  instructions: [],
  imageUrl: null,
  contentHash: externalId,
})

describe('preflightExerciseCatalog', () => {
  it('writes metadata for a fully validated snapshot', async () => {
    const client = {
      async *allExercises() {
        yield [item('a'), item('b')]
      },
    } as any

    await expect(preflightExerciseCatalog(client)).resolves.toMatchObject({
      version: 1,
      pageSize: 10,
      count: 2,
      requestCount: 0,
      firstExternalId: 'a',
      lastExternalId: 'b',
    })
  })

  it('rejects duplicate external IDs before a manifest can be emitted', async () => {
    const client = {
      async *allExercises() {
        yield [item('a'), item('a')]
      },
    } as any

    await expect(preflightExerciseCatalog(client)).rejects.toThrow('duplicate exercise id')
  })
})
