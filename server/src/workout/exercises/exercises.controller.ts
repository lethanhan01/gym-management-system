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
import { DatabaseRetryable } from '../../common/decorators/database-retryable.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { ExercisesService } from './exercises.service'
import { CreateExerciseDto } from './dto/create-exercise.dto'
import { UpdateExerciseDto } from './dto/update-exercise.dto'

@Controller('exercises')
@DatabaseRetryable()
@UseGuards(PermissionsGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get('body-parts')
  @RequirePermission('exercise.read')
  async listBodyParts() {
    const data = await this.exercises.findBodyParts()
    return { success: true, data }
  }

  @Get('equipments')
  @RequirePermission('exercise.read')
  async listEquipments() {
    const data = await this.exercises.findEquipments()
    return { success: true, data }
  }

  @Get('muscles')
  @RequirePermission('exercise.read')
  async listMuscles() {
    const data = await this.exercises.findMuscles()
    return { success: true, data }
  }

  @Get()
  @RequirePermission('exercise.read')
  async list(
    @Query()
    query: {
      q?: string
      bodyPartId?: string
      targetMuscleId?: string
      equipmentId?: string
      page?: string
      pageSize?: string
    }
  ) {
    const result = await this.exercises.findAll({
      ...query,
      bodyPartId: query.bodyPartId ? Number(query.bodyPartId) : undefined,
      targetMuscleId: query.targetMuscleId ? Number(query.targetMuscleId) : undefined,
      equipmentId: query.equipmentId ? Number(query.equipmentId) : undefined,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    })
    return { success: true, ...result }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('exercise.create')
  async create(@Body() dto: CreateExerciseDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.exercises.create(dto, user)
    return { success: true, data }
  }

  @Delete(':id/overrides')
  @RequirePermission('exercise.update')
  async clearOverrides(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.exercises.clearOverrides(BigInt(id), user)
    return { success: true, data }
  }

  @Patch(':id')
  @RequirePermission('exercise.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExerciseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.exercises.update(BigInt(id), dto, user)
    return { success: true, data }
  }

  @Delete(':id')
  @RequirePermission('exercise.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.exercises.softDelete(BigInt(id), user)
    return { success: true }
  }
}
