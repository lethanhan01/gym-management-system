import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthenticatedUser } from '../types/jwt-payload.interface'

/**
 * Lay thong tin user da xac thuc tu request (gan boi JwtStrategy.validate).
 *
 * Vi du:
 *   @Get('me')
 *   me(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>()
    return request.user
  },
)
