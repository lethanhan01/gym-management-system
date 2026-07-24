import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { PrismaService } from '../prisma/prisma.service'

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  root() {
    return { status: 'ok' }
  }

  @Public()
  @Get('health')
  async health() {
    const healthy = await this.prisma.probe()
    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db: healthy ? 'ok' : 'down',
    }
  }

  @Public()
  @Get('health/live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }

  @Public()
  @Get('health/ready')
  async ready() {
    const healthy = await this.prisma.probe('readiness')
    const health = this.prisma.getHealth()
    if (!healthy) {
      throw new ServiceUnavailableException({
        success: false,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database tam thoi khong kha dung, vui long thu lai sau',
        details: health,
      })
    }
    return { status: 'ok', timestamp: new Date().toISOString(), db: health }
  }
}
