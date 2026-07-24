import { PrismaService } from './prisma.service'
import { DatabaseProbeScheduler } from './database-probe.scheduler'

describe('DatabaseProbeScheduler', () => {
  it('probes the database on the scheduled source without surfacing failures', async () => {
    const prisma = { probe: jest.fn().mockResolvedValue(false) } as unknown as PrismaService
    const scheduler = new DatabaseProbeScheduler(prisma)

    await expect(scheduler.probeDatabase()).resolves.toBeUndefined()
    expect(prisma.probe).toHaveBeenCalledWith('scheduled')
  })
})
