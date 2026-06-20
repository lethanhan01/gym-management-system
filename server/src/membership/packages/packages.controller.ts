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
import { PackagesService } from './packages.service'
import { ListPackagesDto } from './dto/list-packages.dto'
import { CreatePackageDto } from './dto/create-package.dto'
import { UpdatePackageDto } from './dto/update-package.dto'
import { UpdatePackageStatusDto } from './dto/update-package-status.dto'

@Controller('packages')
@UseGuards(PermissionsGuard)
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get()
  @RequirePermission('package.read')
  async list(@Query() query: ListPackagesDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.packages.listPackages(query, user.roles)
    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermission('package.read')
  async detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const hasManage = user.roles.some((r) => r === 'owner' || r === 'staff')
    const result = await this.packages.getPackage(BigInt(id), hasManage)
    return { success: true, ...result }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('package.manage')
  async create(@Body() dto: CreatePackageDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.packages.createPackage(dto, user.userId)
    return { success: true, ...result }
  }

  @Patch(':id')
  @RequirePermission('package.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.packages.updatePackage(BigInt(id), dto, user.userId)
    return { success: true, ...result }
  }

  @Patch(':id/status')
  @RequirePermission('package.manage')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackageStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.packages.updatePackageStatus(BigInt(id), dto.status, user.userId)
    return { success: true, ...result }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('package.manage')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.packages.deletePackage(BigInt(id), user.userId)
  }
}
