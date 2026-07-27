import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { ExerciseCatalogSyncService } from './exercise-catalog-sync.service'

@Injectable()
export class ExerciseCatalogScheduler implements OnModuleInit {
  constructor(private readonly config: ConfigService, private readonly registry: SchedulerRegistry, private readonly sync: ExerciseCatalogSyncService) {}
  onModuleInit() {
    if (this.config.get<string>('EXERCISEDB_SYNC_ENABLED') !== 'true' || this.config.get<string>('EXERCISEDB_SCHEDULER_ENABLED') !== 'true') return
    const job = new CronJob(this.config.get<string>('EXERCISEDB_SYNC_CRON') ?? '0 3 * * 0', () => void this.sync.run().catch(() => undefined), null, false, 'Asia/Ho_Chi_Minh')
    this.registry.addCronJob('exercisedb-catalog-sync', job); job.start()
  }
}
