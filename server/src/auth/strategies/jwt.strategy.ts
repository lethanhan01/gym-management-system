  import { Injectable, UnauthorizedException } from '@nestjs/common'
  import { ConfigService } from '@nestjs/config'
  import { PassportStrategy } from '@nestjs/passport'
  import { ExtractJwt, Strategy } from 'passport-jwt'
  import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.interface'
  import { PrismaService } from '../../prisma/prisma.service'

  @Injectable()
  export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(config: ConfigService, private readonly prisma: PrismaService) {
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

    // Ép kiểu ngược từ string trong Token về lại dạng BigInt cho các Service dùng tính toán
    return {
      userId: BigInt(payload.sub),
      email: payload.email,
      roles: payload.roles ?? [],
      // Cứ bốc trực tiếp từ payload ra, có thì ép kiểu sang BigInt, không có thì trả về undefined
      staffId: payload.staffId ? BigInt(payload.staffId) : undefined,
      memberId: payload.memberId ? BigInt(payload.memberId) : undefined,
    }
  }
}
