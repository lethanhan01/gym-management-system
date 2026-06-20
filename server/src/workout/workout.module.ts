import { Module } from '@nestjs/common'
import { ExercisesController } from './exercises/exercises.controller'
import { ExercisesService } from './exercises/exercises.service'
import { WorkoutPlansController } from './workout-plans/workout-plans.controller'
import { WorkoutPlansService } from './workout-plans/workout-plans.service'
import { WorkoutLogsController } from './workout-logs/workout-logs.controller'
import { WorkoutLogsService } from './workout-logs/workout-logs.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [ExercisesController, WorkoutPlansController, WorkoutLogsController],
  providers: [ExercisesService, WorkoutPlansService, WorkoutLogsService, AuditService],
})
export class WorkoutModule {}
