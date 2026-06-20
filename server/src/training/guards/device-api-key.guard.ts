import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'crypto'

@Injectable()
export class DeviceApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const key = req.headers['x-device-api-key']
    const expectedKey = this.config.get<string>('DEVICE_API_KEY')

    if (!key || !expectedKey) throw new UnauthorizedException({ success: false, code: 'UNAUTHORIZED', message: 'Thiếu API key' })

    try {
      const bufKey = Buffer.from(key, 'utf8')
      const bufExpected = Buffer.from(expectedKey, 'utf8')
      if (bufKey.length !== bufExpected.length) throw new Error()
      if (!timingSafeEqual(bufKey, bufExpected)) throw new Error()
    } catch {
      throw new UnauthorizedException({ success: false, code: 'UNAUTHORIZED', message: 'API key không hợp lệ' })
    }

    return true
  }
}
