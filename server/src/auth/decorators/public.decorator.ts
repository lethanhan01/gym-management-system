import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Danh dau endpoint khong yeu cau JWT (vd: login, forgot-password).
 * Dung kem JwtAuthGuard duoc dang ky global trong AuthModule.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true)
