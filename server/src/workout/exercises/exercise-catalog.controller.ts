import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { ExerciseCatalogSyncService } from './exercise-catalog-sync.service'

@Controller('exercise-catalog')
@UseGuards(PermissionsGuard)
export class ExerciseCatalogController {
  constructor(private readonly sync: ExerciseCatalogSyncService) {}

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('exercise.sync')
  async run() {
    return { success: true, ...(await this.sync.run()) }
  }

  @Get('sync-runs')
  @RequirePermission('exercise.sync')
  async runs(@Query('limit') limit?: string) {
    return { success: true, data: await this.sync.recentRuns(limit ? Number(limit) : undefined) }
  }
}
