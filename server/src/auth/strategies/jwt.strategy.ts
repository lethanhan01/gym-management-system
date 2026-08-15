import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserStatus } from '@prisma/client'
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.interface'
import { UsersService } from '../users.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService
  ) {
    const secret = config.get<string>('JWT_SECRET')
    if (!secret) {
      throw new Error('JWT_SECRET phai duoc cau hinh trong .env')
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  /**
   * Passport goi method nay sau khi xac thuc chu ky thanh cong.
   * Gia tri tra ve duoc gan vao `request.user`.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token không hợp lệ')
    }

    let userId: bigint
    try {
      userId = BigInt(payload.sub)
    } catch {
      throw new UnauthorizedException('Token không hợp lệ')
    }

    // JWT chi xac nhan danh tinh tai thoi diem dang nhap. Luon nap lai user
    // tu DB de khoa/xoa tai khoan va thay doi role co hieu luc ngay lap tuc.
    const user = await this.users.findByIdWithRoles(userId)
    if (!user || user.deletedAt || user.status !== UserStatus.active) {
      throw new UnauthorizedException('Token không hợp lệ')
    }

    return {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
      staffId: user.staffId ?? undefined,
      memberId: user.memberId ?? undefined,
    }
  }
}
