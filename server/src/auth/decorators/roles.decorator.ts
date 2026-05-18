import { SetMetadata } from '@nestjs/common'
import { Role } from '../../users/users.service'

export const ROLES_KEY = 'roles'

/**
 * Danh dau endpoint chi cho phep cac role nhat dinh truy cap.
 * Dung kem `@UseGuards(JwtAuthGuard, RolesGuard)`.
 *
 * Vi du: `@Roles('owner', 'staff')` -> chi owner hoac staff vao duoc.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles)
