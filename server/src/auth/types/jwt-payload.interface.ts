import { Role } from '../users.service'

/**
 * Payload JWT phat hanh sau khi login thanh cong.
 * - sub:    user_id (BigInt duoc serialize ra string)
 * - email:  email cua user (de hien thi nhanh)
 * - roles:  danh sach group cua user (vd: ['owner'], ['trainer'])
 *
 * Khong nhe than mat khau / permission codes vao token.
 */
export interface JwtPayload {
  sub: string
  email: string
  roles: Role[]
  staffId?: string  // ◄── Thêm trường này
  memberId?: string // ◄── Thêm trường này
}

/** Thong tin user duoc gan vao request.user sau JwtAuthGuard. */
export interface AuthenticatedUser {
  userId: bigint
  email: string
  roles: Role[]
  memberId?: bigint
  staffId?: bigint
}
