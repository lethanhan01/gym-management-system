import { Controller, Headers, Post, Req } from '@nestjs/common'
import { Request } from 'express'
import { Public } from '../auth/decorators/public.decorator'
import { LineMessagingService } from './line-messaging.service'

@Controller('line')
export class LineMessagingController {
  constructor(private readonly lineMessaging: LineMessagingService) {}

  @Public()
  @Post('webhook')
  async webhook(@Req() req: Request, @Headers('x-line-signature') signature?: string) {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}), 'utf8')
    const result = await this.lineMessaging.handleWebhook(rawBody, signature)
    return { success: true, ...result }
  }
}
