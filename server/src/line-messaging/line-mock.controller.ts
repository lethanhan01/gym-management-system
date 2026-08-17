import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { LineMessagingService } from './line-messaging.service'

@Controller('dev/line-mock')
export class LineMockController {
  constructor(private readonly lineMessaging: LineMessagingService) {}

  @Public()
  @Get('messages')
  messages() {
    this.assertMockEnabled()
    return { success: true, data: { messages: this.lineMessaging.getMockMessages() } }
  }

  @Public()
  @Delete('messages')
  @HttpCode(HttpStatus.OK)
  clearMessages() {
    this.assertMockEnabled()
    this.lineMessaging.clearMockMessages()
    return { success: true }
  }

  @Public()
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async event(@Body() body: { type?: unknown }) {
    this.assertMockEnabled()
    if (body.type !== 'follow' && body.type !== 'unfollow') {
      throw new NotFoundException('LINE Mock event không được hỗ trợ')
    }
    const result = await this.lineMessaging.simulateMockEvent(body.type)
    return { success: true, ...result }
  }

  private assertMockEnabled() {
    if (!this.lineMessaging.isMockEnabled()) {
      throw new NotFoundException('LINE Mock không khả dụng')
    }
  }
}
