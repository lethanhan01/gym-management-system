import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { WorkoutLogsService } from './workout-logs.service'
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto'
import { UpdateWorkoutLogDto } from './dto/update-workout-log.dto'

@Controller('workout-logs')
@UseGuards(PermissionsGuard)
export class WorkoutLogsController {
  constructor(private readonly logs: WorkoutLogsService) {}

  @Get()
  @RequirePermission('workout_log.read')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.logs.findAll(user)
    return { success: true, data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_log.create')
  async create(@Body() dto: CreateWorkoutLogDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.logs.create(dto, user)
    return { success: true, data }
  }

  @Patch(':id')
  @RequirePermission('workout_log.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkoutLogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.logs.update(BigInt(id), dto, user)
    return { success: true, data }
  }
}
