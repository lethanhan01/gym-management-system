import { Global, Module } from '@nestjs/common'
import { DatabaseProbeScheduler } from './database-probe.scheduler'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService, DatabaseProbeScheduler],
  exports: [PrismaService],
})
export class PrismaModule {}
