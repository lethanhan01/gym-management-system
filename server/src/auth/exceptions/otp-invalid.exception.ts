import { HttpException, HttpStatus } from '@nestjs/common'

export class OtpInvalidException extends HttpException {
  constructor() {
    super(
      { code: 'OTP_INVALID', message: 'Mã OTP không đúng' },
      HttpStatus.BAD_REQUEST,
    )
  }
}
