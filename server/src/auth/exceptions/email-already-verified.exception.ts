import { HttpException, HttpStatus } from '@nestjs/common'

export class EmailAlreadyVerifiedException extends HttpException {
  constructor() {
    super(
      { code: 'EMAIL_ALREADY_VERIFIED', message: 'Email đã được xác thực trước đó' },
      HttpStatus.CONFLICT,
    )
  }
}
