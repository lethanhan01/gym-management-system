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
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { CreateEquipmentDto } from './dto/create-equipment.dto'
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto'
import { CreateRoomDto } from './dto/create-room.dto'
import { ListEquipmentDto } from './dto/list-equipment.dto'
import { ListMaintenanceLogsDto } from './dto/list-maintenance-logs.dto'
import { ListRoomsDto } from './dto/list-rooms.dto'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'
import { UpdateMaintenanceLogDto } from './dto/update-maintenance-log.dto'
import { UpdateRoomDto } from './dto/update-room.dto'
import { FacilityService } from './facility.service'

@Controller()
@UseGuards(PermissionsGuard)
export class FacilityController {
  constructor(private readonly facility: FacilityService) {}

  @Get('rooms/lookup')
  async lookupRooms(@Query() query: ListRoomsDto) {
    const result = await this.facility.listRooms({ ...query, pageSize: Math.min(query.pageSize ?? 100, 100) })
    return { success: true, ...result }
  }

  @Get('rooms')
  @RequirePermission('room.manage')
  async listRooms(@Query() query: ListRoomsDto) {
    const result = await this.facility.listRooms(query)
    return { success: true, ...result }
  }

  @Get('rooms/:id')
  @RequirePermission('room.manage')
  async getRoom(@Param('id', ParseIntPipe) id: number) {
    const result = await this.facility.getRoom(BigInt(id))
    return { success: true, ...result }
  }

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('room.manage')
  async createRoom(@Body() dto: CreateRoomDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.facility.createRoom(dto, user.userId)
    return { success: true, ...result }
  }

  @Patch('rooms/:id')
  @RequirePermission('room.manage')
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.facility.updateRoom(BigInt(id), dto, user.userId)
    return { success: true, ...result }
  }

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('room.manage')
  async deleteRoom(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.facility.deleteRoom(BigInt(id), user.userId)
  }

  @Get('equipment')
  @RequirePermission('equipment.manage')
  async listEquipment(@Query() query: ListEquipmentDto) {
    const result = await this.facility.listEquipment(query)
    return { success: true, ...result }
  }

  @Get('equipment/:id')
  @RequirePermission('equipment.manage')
  async getEquipment(@Param('id', ParseIntPipe) id: number) {
    const result = await this.facility.getEquipment(BigInt(id))
    return { success: true, ...result }
  }

  @Post('equipment')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('equipment.manage')
  async createEquipment(@Body() dto: CreateEquipmentDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.facility.createEquipment(dto, user.userId)
    return { success: true, ...result }
  }

  @Patch('equipment/:id')
  @RequirePermission('equipment.manage')
  async updateEquipment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.facility.updateEquipment(BigInt(id), dto, user.userId)
    return { success: true, ...result }
  }

  @Delete('equipment/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('equipment.manage')
  async deleteEquipment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Query('force') force?: string,
  ) {
    await this.facility.deleteEquipment(BigInt(id), user.userId, user.roles, force === 'true')
  }

  @Get('equipment/:id/maintenance-logs')
  @RequirePermission('maintenance.read')
  async listMaintenanceLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListMaintenanceLogsDto,
  ) {
    const result = await this.facility.listMaintenanceLogs(BigInt(id), query)
    return { success: true, ...result }
  }

  @Post('equipment/:id/maintenance-logs')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('maintenance.report')
  async createMaintenanceLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMaintenanceLogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.facility.createMaintenanceLog(BigInt(id), dto, user.userId)
    return { success: true, ...result }
  }

  @Patch('maintenance-logs/:id')
  @RequirePermission('maintenance.resolve')
  async updateMaintenanceLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceLogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.facility.updateMaintenanceLog(BigInt(id), dto, user.userId)
    return { success: true, ...result }
  }
}
