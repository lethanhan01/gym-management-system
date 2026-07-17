import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common'
import { Request } from 'express'
import { Public } from '../auth/decorators/public.decorator'
import { LineMessagingService } from './line-messaging.service'

@Controller('line')
export class LineMessagingController {
  constructor(private readonly lineMessaging: LineMessagingService) {}

  @Public()
  @Post('webhook')
  async webhook(@Req() req: Request, @Headers('x-line-signature') signature?: string) {
    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException({
        success: false,
        code: 'LINE_WEBHOOK_RAW_BODY_REQUIRED',
        message: 'LINE webhook yeu cau raw body',
      })
    }

    const result = await this.lineMessaging.handleWebhook(req.body, signature)
    return { success: true, ...result }
  }
}
