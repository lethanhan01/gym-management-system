import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { ReportRangeDto, StaffPerformanceQueryDto } from './dto/report-range.dto'
import { ReportsService } from './reports.service'

@Controller('reports')
@UseGuards(PermissionsGuard)
@RequirePermission('report.view')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  async revenue(@Query() query: ReportRangeDto) {
    const result = await this.reports.revenue(query.from, query.to, query.method)
    return { success: true, ...result }
  }

  @Get('members')
  async members(@Query() query: ReportRangeDto) {
    const result = await this.reports.members(query.from, query.to)
    return { success: true, ...result }
  }

  @Get('renewals')
  async renewals(@Query() query: ReportRangeDto) {
    const result = await this.reports.renewals(query.from, query.to)
    return { success: true, ...result }
  }

  @Get('employee-performance')
  async employeePerformance(@Query() query: ReportRangeDto) {
    const result = await this.reports.employeePerformance(query.from, query.to)
    return { success: true, ...result }
  }

  @Get('employee-performance/:staffId/detail')
  async employeePerformanceDetail(
    @Param('staffId') staffId: string,
    @Query() query: ReportRangeDto,
  ) {
    const result = await this.reports.employeePerformanceDetail(staffId, query.from, query.to)
    return { success: true, ...result }
  }

  @Get('staff-performance')
  async staffPerformance(@Query() query: StaffPerformanceQueryDto) {
    const result = await this.reports.staffPerformance(query.from, query.to, query.staffId)
    return { success: true, ...result }
  }

  @Get('top-packages')
  async topPackages(@Query() query: ReportRangeDto) {
    const result = await this.reports.topPackages(query.from, query.to)
    return { success: true, ...result }
  }
}
