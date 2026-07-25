import { ExerciseCatalogScheduler } from './exercise-catalog.scheduler'

describe('ExerciseCatalogScheduler', () => {
  it('does not register a cron job unless sync and scheduling are both enabled', () => {
    const registry = { addCronJob: jest.fn() }
    const scheduler = new ExerciseCatalogScheduler(
      { get: jest.fn((key: string) => key === 'EXERCISEDB_SYNC_ENABLED' ? 'true' : 'false') } as any,
      registry as any,
      {} as any,
    )

    scheduler.onModuleInit()

    expect(registry.addCronJob).not.toHaveBeenCalled()
  })
})
