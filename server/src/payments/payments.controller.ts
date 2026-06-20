import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { ListPaymentsDto } from './dto/list-payments.dto'
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto'

@Controller('payments')
@UseGuards(PermissionsGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('payment.create')
  async create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.payments.createPayment(dto, user)
    return { success: true, ...result }
  }

  @Get()
  @RequirePermission('payment.read')
  async list(@Query() query: ListPaymentsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.payments.listPayments(query, user)
    return { success: true, ...result }
  }
}

@Controller()
@UseGuards(PermissionsGuard)
export class PaymentAccountsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('members/:memberId/payment-accounts')
  async list(
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertAccess(memberId, user)
    return this.payments.listPaymentAccounts(BigInt(memberId))
  }

  @Post('members/:memberId/payment-accounts')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: CreatePaymentAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertAccess(memberId, user)
    return this.payments.createPaymentAccount(BigInt(memberId), dto)
  }

  @Patch('members/:memberId/payment-accounts/:accountId')
  @HttpCode(HttpStatus.OK)
  async setDefault(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Param('accountId', ParseIntPipe) accountId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertAccess(memberId, user)
    return this.payments.setDefaultPaymentAccount(BigInt(memberId), accountId)
  }

  @Delete('members/:memberId/payment-accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Param('accountId', ParseIntPipe) accountId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertAccess(memberId, user)
    return this.payments.removePaymentAccount(BigInt(memberId), accountId)
  }

  private assertAccess(memberId: number, user: AuthenticatedUser) {
    const isSelf = user.memberId !== null && Number(user.memberId) === memberId
    const isStaff = user.roles.some(r => r === 'staff' || r === 'owner')
    if (!isSelf && !isStaff) {
      throw new NotFoundException({ success: false, message: 'Không tìm thấy tài khoản' })
    }
  }
}
