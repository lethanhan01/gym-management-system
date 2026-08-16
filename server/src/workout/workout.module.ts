import { Module } from '@nestjs/common'
import { ExercisesController } from './exercises/exercises.controller'
import { ExercisesService } from './exercises/exercises.service'
import { ExerciseCatalogController } from './exercises/exercise-catalog.controller'
import { ExerciseCatalogSyncService } from './exercises/exercise-catalog-sync.service'
import { ExerciseDbV2Client } from './exercises/exercise-db-v2.client'
import { ExerciseCatalogScheduler } from './exercises/exercise-catalog.scheduler'
import { WorkoutPlansController } from './workout-plans/workout-plans.controller'
import { WorkoutPlansService } from './workout-plans/workout-plans.service'
import { WorkoutLogsController } from './workout-logs/workout-logs.controller'
import { WorkoutLogsService } from './workout-logs/workout-logs.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [
    ExercisesController,
    ExerciseCatalogController,
    WorkoutPlansController,
    WorkoutLogsController,
  ],
  providers: [
    ExercisesService,
    ExerciseDbV2Client,
    ExerciseCatalogSyncService,
    ExerciseCatalogScheduler,
    WorkoutPlansService,
    WorkoutLogsService,
    AuditService,
  ],
})
export class WorkoutModule {}
