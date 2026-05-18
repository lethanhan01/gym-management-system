import { randomInt } from 'crypto'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { JwtPayload } from './types/jwt-payload.interface'

export interface LoginResult {
  accessToken: string
  user: {
    userId: string
    email: string
    fullName: string
    roles: string[]
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** UC00 - Dang nhap. */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) {
      throw new UnauthorizedException('Email hoac mat khau khong dung')
    }
    if (user.status === UserStatus.locked) {
      throw new UnauthorizedException('Tai khoan da bi khoa')
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      throw new UnauthorizedException('Email hoac mat khau khong dung')
    }

    const payload: JwtPayload = {
      sub: user.userId.toString(),
      email: user.email,
      roles: user.roles,
    }
    const accessToken = await this.jwt.signAsync(payload)

    return {
      accessToken,
      user: {
        userId: user.userId.toString(),
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
      },
    }
  }

  /** UC02 - Quen mat khau: phat OTP 6 chu so, het han sau 10 phut. */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.users.findByEmailWithRoles(email)
    if (user) {
      const otp = randomInt(100000, 1000000).toString()
      const codeHash = await bcrypt.hash(otp, 10)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      // Xoa OTP cu cua user truoc khi tao moi
      await this.prisma.otpCode.deleteMany({ where: { userId: user.userId } })
      await this.prisma.otpCode.create({ data: { userId: user.userId, codeHash, expiresAt } })

      // TODO: gui OTP qua email khi SMTP duoc cau hinh
      this.logger.log(`[forgotPassword] OTP cho ${email}: ${otp}`)
    } else {
      this.logger.log(`[forgotPassword] Email khong ton tai (giau loi): ${email}`)
    }
    return { message: 'Neu email ton tai trong he thong, ma OTP da duoc gui' }
  }

  /** UC02 - Dat lai mat khau bang OTP. */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) throw new UnauthorizedException('OTP khong hop le hoac da het han')

    const record = await this.prisma.otpCode.findFirst({
      where: { userId: user.userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!record) throw new UnauthorizedException('OTP khong hop le hoac da het han')

    const valid = await bcrypt.compare(otp, record.codeHash)
    if (!valid) throw new UnauthorizedException('OTP khong hop le hoac da het han')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { userId: user.userId }, data: { passwordHash } }),
      this.prisma.otpCode.deleteMany({ where: { userId: user.userId } }),
    ])
  }
}
