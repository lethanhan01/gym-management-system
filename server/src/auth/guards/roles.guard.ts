import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '../../users/users.service'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { AuthenticatedUser } from '../types/jwt-payload.interface'

/**
 * Kiem tra user hien tai co thuoc 1 trong cac role yeu cau khong.
 * Phai dat SAU JwtAuthGuard vi can `request.user`.
 *
 * Neu endpoint khong khai bao @Roles thi guard cho qua (chi can dang nhap).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('Khong xac dinh duoc nguoi dung')
    }

    const hasRole = user.roles.some((r) => required.includes(r))
    if (!hasRole) {
      throw new ForbiddenException(
        `Endpoint nay chi danh cho: ${required.join(', ')}`,
      )
    }
    return true
  }
}
