import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OtpPurpose } from '@prisma/client'
import nodemailer, { Transporter } from 'nodemailer'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)
  private readonly transporter: Transporter | null

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')?.trim()
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(this.config.get<number>('SMTP_PORT')),
          secure: Number(this.config.get<number>('SMTP_PORT')) === 465,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
          auth: { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASS') },
        })
      : null
  }

  async sendOtp(to: string, purpose: OtpPurpose, otp: string): Promise<void> {
    if (!this.transporter) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException({ success: false, code: 'OTP_DELIVERY_FAILED', message: 'Không thể gửi mã xác thực' })
      }
      return
    }
    const subject = purpose === OtpPurpose.email_verify ? 'Xác thực email' : 'Đặt lại mật khẩu'
    try {
      await this.transporter.sendMail({
        from: this.config.getOrThrow<string>('SMTP_FROM'),
        to,
        subject,
        text: `Mã OTP ${subject.toLowerCase()} của bạn là ${otp}. Mã có hiệu lực trong 10 phút.`,
      })
    } catch (error) {
      const smtpError = error as { code?: string; responseCode?: number }
      this.logger.error(
        `OTP email delivery failed (purpose=${purpose}, code=${smtpError.code ?? 'UNKNOWN'}, responseCode=${smtpError.responseCode ?? 'UNKNOWN'})`
      )
      throw new ServiceUnavailableException({ success: false, code: 'OTP_DELIVERY_FAILED', message: 'Không thể gửi mã xác thực' })
    }
  }
}
