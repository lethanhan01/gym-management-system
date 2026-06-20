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
import { ExercisesService } from './exercises.service'
import { CreateExerciseDto } from './dto/create-exercise.dto'
import { UpdateExerciseDto } from './dto/update-exercise.dto'
import { ImportExerciseDto } from './dto/import-exercise.dto'

@Controller('exercises')
@UseGuards(PermissionsGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  @RequirePermission('exercise.read')
  async list(@Query('category') category?: string, @Query('muscleGroup') muscleGroup?: string) {
    const data = await this.exercises.findAll({ category, muscleGroup })
    return { success: true, data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('exercise.create')
  async create(@Body() dto: CreateExerciseDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.exercises.create(dto, user)
    return { success: true, data }
  }

  @Get('external')
  @RequirePermission('exercise.read')
  async listExternal(
    @Query('category') category?: string,
    @Query('name') name?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const data = await this.exercises.findFromExerciseDb({
      category,
      name,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
    return { success: true, data }
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('exercise.create')
  async importExternal(@Body() dto: ImportExerciseDto) {
    const data = await this.exercises.importFromExerciseDb(dto)
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
