import { HttpException } from '@nestjs/common'

// HTTP 410 Gone — OTP het han hoac vuot qua so lan thu toi da
export class OtpExpiredException extends HttpException {
  constructor() {
    super(
      { code: 'OTP_EXPIRED', message: 'Mã OTP đã hết hạn hoặc không còn hiệu lực, vui lòng yêu cầu mã mới' },
      410,
    )
  }
}
