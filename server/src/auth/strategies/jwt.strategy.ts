import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
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
      throw new UnauthorizedException('Token khong hop le')
    }
    return {
      userId: BigInt(payload.sub),
      email: payload.email,
      roles: payload.roles ?? [],
    }
  }
}
