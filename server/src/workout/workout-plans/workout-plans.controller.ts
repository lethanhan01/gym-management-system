import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { WorkoutPlansService } from './workout-plans.service'
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto'
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto'
import { AddPlanDayDto } from './dto/add-plan-day.dto'
import { UpdatePlanDayDto } from './dto/update-plan-day.dto'
import { AddPlanExerciseDto } from './dto/add-plan-exercise.dto'
import { AssignPlanDto } from './dto/assign-plan.dto'
import { UpdatePlanExerciseDto } from './dto/update-plan-exercise.dto'

@Controller('workout-plans')
@UseGuards(PermissionsGuard)
export class WorkoutPlansController {
  constructor(private readonly plans: WorkoutPlansService) {}

  @Get()
  @RequirePermission('workout_plan.create')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.plans.findAll(user)
    return { success: true, data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_plan.create')
  async create(@Body() dto: CreateWorkoutPlanDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.plans.create(dto, user)
    return { success: true, data }
  }

  @Patch(':id')
  @RequirePermission('workout_plan.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkoutPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.plans.update(BigInt(id), dto, user)
    return { success: true, data }
  }

  @Delete(':id')
  @RequirePermission('workout_plan.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.plans.softDelete(BigInt(id), user)
    return { success: true }
  }

  @Post(':id/days')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_plan.update')
  async addDay(@Param('id', ParseIntPipe) id: number, @Body() dto: AddPlanDayDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.plans.addDay(BigInt(id), dto, user)
    return { success: true, data }
  }

  @Patch(':id/days/:dayId')
  @RequirePermission('workout_plan.update')
  async updateDay(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) dayId: number,
    @Body() dto: UpdatePlanDayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.plans.updateDay(BigInt(_id), BigInt(dayId), dto, user)
    return { success: true, data }
  }

  @Delete(':id/days/:dayId')
  @RequirePermission('workout_plan.update')
  async deleteDay(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) dayId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.plans.deleteDay(BigInt(_id), BigInt(dayId), user)
    return { success: true }
  }

  @Post(':id/days/:dayId/exercises')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_plan.update')
  async addExercise(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) dayId: number,
    @Body() dto: AddPlanExerciseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.plans.addExercise(BigInt(_id), BigInt(dayId), dto, user)
    return { success: true, data }
  }

  @Delete(':id/days/:dayId/exercises/:peId')
  @RequirePermission('workout_plan.update')
  async removePlanExercise(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) _dayId: number,
    @Param('peId', ParseIntPipe) peId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.plans.removePlanExercise(BigInt(_id), BigInt(_dayId), BigInt(peId), user)
    return { success: true }
  }

  @Patch(':id/days/:dayId/exercises/:peId')
  @RequirePermission('workout_plan.update')
  async updatePlanExercise(
    @Param('id', ParseIntPipe) id: number,
    @Param('dayId', ParseIntPipe) dayId: number,
    @Param('peId', ParseIntPipe) peId: number,
    @Body() dto: UpdatePlanExerciseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.plans.updatePlanExercise(
      BigInt(id),
      BigInt(dayId),
      BigInt(peId),
      dto,
      user,
    )
    return { success: true, data }
  }

  @Get('members/:memberId/assignments')
  async listAssignments(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Query('status') status: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.plans.listAssignments(BigInt(memberId), { status, limit: limit ? Number(limit) : undefined }, user)
    return { success: true, ...data }
  }

  @Post('members/:memberId/assign')
  @HttpCode(HttpStatus.CREATED)
  async assign(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: AssignPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.plans.assignPlan(BigInt(memberId), dto, user)
    return { success: true, data }
  }

  @Get('suggested')
  async listSuggested() {
    const data = await this.plans.findSuggested()
    return { success: true, data }
  }

  @Get(':id/assignments')
  @RequirePermission('workout_plan.create')
  async listPlanAssignments(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.plans.listAssignmentsByPlan(BigInt(id), user)
    return { success: true, data }
  }

  @Delete('assignments/:assignmentId')
  async unassignMember(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.plans.unassignMember(BigInt(assignmentId), user)
    return { success: true }
  }

  @Get(':id')
  @RequirePermission('workout_plan.create')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.plans.findOne(BigInt(id))
    return { success: true, data }
  }
}
