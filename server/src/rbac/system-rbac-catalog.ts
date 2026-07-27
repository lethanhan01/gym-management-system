export const SYSTEM_GROUP_NAMES = ['owner', 'staff', 'trainer', 'member'] as const

/**
 * Deprecated system permissions that have no supported runtime consumer.
 * They are removed only when no custom group references them.
 */
export const OBSOLETE_SYSTEM_PERMISSION_CODES = ['notification.send'] as const

export type SystemGroupName = (typeof SYSTEM_GROUP_NAMES)[number]

export interface SystemPermissionDefinition {
  code: string
  name: string
  description: string
}

/**
 * System-owned permission catalog. Keep legacy permissions that are still
 * exposed through administration/API contracts even if no controller currently
 * uses them with @RequirePermission.
 */
export const SYSTEM_PERMISSIONS: readonly SystemPermissionDefinition[] = [
  { code: 'user.read', name: 'Xem tài khoản', description: 'Xem danh sách và chi tiết tài khoản hệ thống' },
  { code: 'user.create', name: 'Tạo tài khoản', description: 'Tạo tài khoản hệ thống mới' },
  { code: 'user.update', name: 'Cập nhật tài khoản', description: 'Cập nhật thông tin hoặc trạng thái tài khoản' },
  { code: 'user.delete', name: 'Xóa tài khoản', description: 'Xóa tài khoản khỏi hệ thống' },
  { code: 'rbac.manage', name: 'Quản lý phân quyền', description: 'Quản lý group, permission và user-group assignment' },
  { code: 'member.read', name: 'Xem hội viên', description: 'Xem hồ sơ hội viên' },
  { code: 'member.create', name: 'Tạo hội viên', description: 'Đăng ký hội viên mới' },
  { code: 'member.update', name: 'Cập nhật hội viên', description: 'Cập nhật hồ sơ hội viên' },
  { code: 'member.delete', name: 'Xóa hội viên', description: 'Xóa hội viên' },
  { code: 'staff.read', name: 'Xem nhân sự', description: 'Xem danh sách nhân sự và huấn luyện viên' },
  { code: 'staff.create', name: 'Tạo nhân sự', description: 'Tạo nhân sự hoặc huấn luyện viên' },
  { code: 'staff.update', name: 'Cập nhật nhân sự', description: 'Cập nhật hồ sơ nhân sự' },
  { code: 'staff.delete', name: 'Xóa nhân sự', description: 'Xóa nhân sự' },
  { code: 'package.read', name: 'Xem gói tập', description: 'Xem danh mục gói tập' },
  { code: 'package.manage', name: 'Quản lý gói tập', description: 'Tạo, sửa và ngừng kinh doanh gói tập' },
  { code: 'subscription.read', name: 'Xem đăng ký gói', description: 'Xem đăng ký gói tập' },
  { code: 'subscription.create', name: 'Tạo đăng ký gói', description: 'Tạo hoặc gia hạn đăng ký gói tập' },
  { code: 'subscription.cancel', name: 'Hủy đăng ký gói', description: 'Hủy đăng ký gói tập' },
  { code: 'payment.read', name: 'Xem thanh toán', description: 'Xem lịch sử giao dịch' },
  { code: 'payment.create', name: 'Tạo giao dịch', description: 'Ghi nhận thanh toán' },
  { code: 'payment.refund', name: 'Hoàn tiền', description: 'Thực hiện hoàn tiền giao dịch' },
  { code: 'room.manage', name: 'Quản lý phòng tập', description: 'Tạo, sửa và xóa phòng tập' },
  { code: 'equipment.manage', name: 'Quản lý thiết bị', description: 'Quản lý danh mục thiết bị' },
  { code: 'maintenance.read', name: 'Xem bảo trì', description: 'Xem phiếu bảo trì' },
  { code: 'maintenance.report', name: 'Báo lỗi thiết bị', description: 'Tạo phiếu bảo trì hoặc báo lỗi thiết bị' },
  { code: 'maintenance.resolve', name: 'Xử lý bảo trì', description: 'Cập nhật kết quả xử lý bảo trì' },
  { code: 'session.read', name: 'Xem lịch tập', description: 'Xem lịch tập với huấn luyện viên' },
  { code: 'session.manage', name: 'Quản lý lịch tập', description: 'Tạo, sửa và hủy lịch tập' },
  { code: 'attendance.read', name: 'Xem chấm công', description: 'Xem lịch sử check-in và check-out' },
  { code: 'attendance.checkin', name: 'Check-in hội viên', description: 'Ghi nhận check-in hoặc check-out cho hội viên' },
  { code: 'attendance.self-checkin', name: 'Hội viên tự check-in', description: 'Hội viên tự check-in bằng QR' },
  { code: 'progress.read', name: 'Xem tiến độ', description: 'Xem chỉ số tiến độ luyện tập' },
  { code: 'progress.record', name: 'Ghi nhận tiến độ', description: 'Ghi nhận chỉ số tiến độ luyện tập' },
  { code: 'feedback.read', name: 'Xem phản hồi', description: 'Xem phản hồi của hội viên' },
  { code: 'feedback.create', name: 'Gửi phản hồi', description: 'Tạo phản hồi' },
  { code: 'feedback.handle', name: 'Xử lý phản hồi', description: 'Tiếp nhận và xử lý phản hồi' },
  { code: 'notification.read', name: 'Xem thông báo', description: 'Xem và đánh dấu đã đọc thông báo cá nhân' },
  { code: 'schedule.read', name: 'Xem lịch làm việc', description: 'Xem lịch làm việc của nhân sự' },
  { code: 'schedule.manage', name: 'Quản lý lịch làm việc', description: 'Phân ca cho nhân sự' },
  { code: 'report.view', name: 'Xem báo cáo', description: 'Xem báo cáo thống kê' },
  { code: 'exercise.read', name: 'Xem bài tập', description: 'Xem thư viện bài tập' },
  { code: 'exercise.create', name: 'Tạo bài tập', description: 'Tạo hoặc import bài tập' },
  { code: 'exercise.update', name: 'Cập nhật bài tập', description: 'Cập nhật bài tập' },
  { code: 'exercise.delete', name: 'Xóa bài tập', description: 'Xóa bài tập' },
  { code: 'exercise.sync', name: 'Đồng bộ catalog bài tập', description: 'Chạy và xem đồng bộ ExerciseDB' },
  { code: 'workout_plan.create', name: 'Tạo giáo án', description: 'Tạo giáo án tập luyện' },
  { code: 'workout_plan.update', name: 'Cập nhật giáo án', description: 'Cập nhật giáo án tập luyện' },
  { code: 'workout_plan.delete', name: 'Xóa giáo án', description: 'Xóa giáo án tập luyện' },
  { code: 'workout_log.read', name: 'Xem nhật ký tập', description: 'Xem nhật ký buổi tập' },
  { code: 'workout_log.create', name: 'Tạo nhật ký tập', description: 'Ghi nhận buổi tập' },
  { code: 'workout_log.update', name: 'Cập nhật nhật ký tập', description: 'Cập nhật nhật ký buổi tập' },
] as const

export const SYSTEM_GROUP_DESCRIPTIONS: Record<SystemGroupName, string> = {
  owner: 'Chủ phòng tập: toàn quyền quản lý hệ thống và hoạt động kinh doanh.',
  staff: 'Nhân viên vận hành: tiếp nhận hội viên, gói tập, thanh toán và cơ sở vật chất.',
  trainer: 'Huấn luyện viên: quản lý học viên, giáo án, lịch tập và tiến độ.',
  member: 'Hội viên: sử dụng dịch vụ, theo dõi việc tập luyện và gửi phản hồi.',
}

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemGroupName, readonly string[]> = {
  owner: SYSTEM_PERMISSIONS.map((permission) => permission.code),
  staff: [
    'user.read', 'user.create', 'user.update',
    'member.read', 'member.create', 'member.update', 'member.delete',
    'staff.read', 'staff.update',
    'package.read', 'package.manage',
    'subscription.read', 'subscription.create', 'subscription.cancel',
    'payment.read', 'payment.create', 'payment.refund',
    'room.manage', 'equipment.manage',
    'maintenance.read', 'maintenance.report', 'maintenance.resolve',
    'session.read', 'attendance.read', 'attendance.checkin', 'progress.read',
    'feedback.read', 'feedback.create', 'feedback.handle', 'notification.read', 'schedule.read',
  ],
  trainer: [
    'member.read', 'staff.update', 'package.read', 'subscription.read',
    'maintenance.read', 'maintenance.report', 'session.read', 'session.manage',
    'attendance.read', 'attendance.checkin', 'progress.read', 'progress.record',
    'feedback.read', 'notification.read', 'schedule.read',
    'exercise.read', 'exercise.create', 'exercise.update', 'exercise.delete',
    'workout_plan.create', 'workout_plan.update', 'workout_plan.delete',
  ],
  member: [
    'package.read', 'subscription.read', 'subscription.create', 'subscription.cancel',
    'payment.read', 'payment.create', 'session.read',
    'attendance.read', 'attendance.self-checkin', 'progress.read',
    'feedback.read', 'feedback.create', 'notification.read', 'exercise.read',
    'workout_plan.create', 'workout_plan.update', 'workout_plan.delete',
    'workout_log.read', 'workout_log.create', 'workout_log.update',
  ],
}

export function validateSystemRbacCatalog(): void {
  const codes = SYSTEM_PERMISSIONS.map((permission) => permission.code)
  if (new Set(codes).size !== codes.length) {
    throw new Error('System RBAC catalog contains duplicate permission codes')
  }

  const catalogCodes = new Set(codes)
  for (const groupName of SYSTEM_GROUP_NAMES) {
    const roleCodes = SYSTEM_ROLE_PERMISSIONS[groupName]
    if (new Set(roleCodes).size !== roleCodes.length) {
      throw new Error(`System RBAC mapping for ${groupName} contains duplicate permission codes`)
    }
    const unknownCodes = roleCodes.filter((code) => !catalogCodes.has(code))
    if (unknownCodes.length > 0) {
      throw new Error(`System RBAC mapping for ${groupName} has unknown permissions: ${unknownCodes.join(', ')}`)
    }
  }
}
