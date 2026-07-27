import { Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { PrismaService } from './prisma.service'

/**
 * Keeps database health current even while the API receives no traffic.
 * PrismaService only logs state transitions, so this does not create log spam
 * during a prolonged upstream outage.
 */
@Injectable()
export class DatabaseProbeScheduler {
  constructor(private readonly prisma: PrismaService) {}

  @Interval('database-health-probe', 60_000)
  async probeDatabase(): Promise<void> {
    await this.prisma.probe('scheduled')
  }
}
