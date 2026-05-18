import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { PrismaService } from '../prisma/prisma.service'

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    let dbStatus: 'ok' | 'down' = 'ok'
    try {
      await this.prisma.$queryRawUnsafe<{ ok: number }[]>('SELECT 1 AS ok')
    } catch {
      dbStatus = 'down'
    }
    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db: dbStatus,
    }
  }
}
