import { prisma } from './client'

const PERMISSIONS = [
  // Quan ly tai khoan & phan quyen (Quy trinh 2.4.6)
  {
    code: 'user.read',
    name: 'Xem tai khoan',
    description: 'Xem danh sach va chi tiet tai khoan he thong',
  },
  {
    code: 'user.create',
    name: 'Tao tai khoan',
    description: 'Tao tai khoan moi (kem dang ky ho so)',
  },
  {
    code: 'user.update',
    name: 'Cap nhat tai khoan',
    description: 'Sua thong tin / khoa / mo khoa tai khoan',
  },
  { code: 'user.delete', name: 'Xoa tai khoan', description: 'Xoa tai khoan khoi he thong' },
  {
    code: 'rbac.manage',
    name: 'Quan ly phan quyen',
    description: 'Tao/sua/xoa nhom, gan quyen va gan user vao nhom (2.4.6)',
  },
  // Hoi vien (UC03)
  { code: 'member.read', name: 'Xem hoi vien', description: 'Xem ho so hoi vien' },
  { code: 'member.create', name: 'Tao hoi vien', description: 'Dang ky hoi vien moi (UC03)' },
  { code: 'member.update', name: 'Cap nhat hoi vien', description: 'Sua ho so hoi vien' },
  { code: 'member.delete', name: 'Xoa hoi vien', description: 'Xoa ho so hoi vien' },
  // Nhan su / PT (UC11)
  { code: 'staff.read', name: 'Xem nhan su', description: 'Xem danh sach nhan su / PT' },
  { code: 'staff.create', name: 'Tao nhan su', description: 'Them nhan su / PT moi (UC11)' },
  { code: 'staff.update', name: 'Cap nhat nhan su', description: 'Sua ho so nhan su (UC11)' },
  { code: 'staff.delete', name: 'Xoa nhan su', description: 'Xoa nhan su (UC11)' },
  // Goi tap & dang ky (UC04, UC10)
  { code: 'package.read', name: 'Xem goi tap', description: 'Xem danh muc goi tap' },
  {
    code: 'package.manage',
    name: 'Quan ly goi tap',
    description: 'Tao / sua / ngung kinh doanh goi tap (UC10)',
  },
  {
    code: 'subscription.read',
    name: 'Xem dang ky goi',
    description: 'Xem cac luot dang ky cua hoi vien',
  },
  {
    code: 'subscription.create',
    name: 'Tao dang ky goi',
    description: 'Ban / gia han goi cho hoi vien (UC03, UC04)',
  },
  {
    code: 'subscription.cancel',
    name: 'Huy dang ky goi',
    description: 'Huy goi tap dang active/pending (UC04B)',
  },
  // Thanh toan (UC03, UC04)
  { code: 'payment.read', name: 'Xem thanh toan', description: 'Xem lich su giao dich' },
  {
    code: 'payment.create',
    name: 'Tao giao dich',
    description: 'Ghi nhan thanh toan (UC03, UC04)',
  },
  { code: 'payment.refund', name: 'Hoan tien', description: 'Thuc hien hoan tien giao dich' },
  // Phong tap, thiet bi, bao tri (UC08, UC09)
  {
    code: 'room.manage',
    name: 'Quan ly phong tap',
    description: 'Tao / sua / xoa phong tap (UC08)',
  },
  {
    code: 'equipment.manage',
    name: 'Quan ly thiet bi',
    description: 'Quan ly danh muc thiet bi (UC09)',
  },
  { code: 'maintenance.read', name: 'Xem nhat ky bao tri', description: 'Xem cac phieu bao tri' },
  {
    code: 'maintenance.report',
    name: 'Bao loi thiet bi',
    description: 'Tao phieu bao tri / bao loi (UC09)',
  },
  {
    code: 'maintenance.resolve',
    name: 'Xu ly bao tri',
    description: 'Cap nhat ket qua xu ly phieu bao tri (UC09)',
  },
  // Lich tap / cham cong / tien do (UC05, UC06)
  { code: 'session.read', name: 'Xem lich tap', description: 'Xem lich tap voi PT (UC05)' },
  {
    code: 'session.manage',
    name: 'Quan ly lich tap',
    description: 'Tao / sua / huy lich tap (UC05)',
  },
  {
    code: 'attendance.read',
    name: 'Xem cham cong',
    description: 'Xem nhat ky check-in / ghi nhan tu dong',
  },
  {
    code: 'attendance.checkin',
    name: 'Check-in hoi vien',
    description: 'Ghi nhan check-in / check-out (UC05 fallback)',
  },
  {
    code: 'progress.read',
    name: 'Xem tien do tap',
    description: 'Xem chi so tien do hoi vien (UC06)',
  },
  {
    code: 'progress.record',
    name: 'Ghi nhan tien do',
    description: 'Ghi chi so BMI / can nang / muc tieu (UC06)',
  },
  // Phan hoi & thong bao (UC07, 2.4.5)
  { code: 'feedback.read', name: 'Xem phan hoi', description: 'Xem phan hoi cua hoi vien' },
  {
    code: 'feedback.create',
    name: 'Gui phan hoi',
    description: 'Hoi vien / nhan vien tai quay gui phan hoi (UC07)',
  },
  {
    code: 'feedback.handle',
    name: 'Xu ly phan hoi',
    description: 'Tiep nhan / phan loai / xu ly phan hoi (2.4.5)',
  },
  // V1.0 da bo notification feature (xem Database.md). Re-add khi UC14 phuc hoi o v1.1+.
  // Lich lam viec & bao cao (UC11, UC12)
  { code: 'schedule.read', name: 'Xem lich lam viec', description: 'Xem lich ca lam cua nhan su' },
  {
    code: 'schedule.manage',
    name: 'Quan ly lich lam viec',
    description: 'Phan ca cho nhan su (UC11)',
  },
  { code: 'report.view', name: 'Xem bao cao', description: 'Xem cac bao cao thong ke (UC12)' },
  // Workout plan & log (UC05A, UC06A, UC06B)
  { code: 'exercise.read', name: 'Xem danh sach bai tap', description: 'Xem exercise library' },
  { code: 'exercise.create', name: 'Tao bai tap', description: 'Them exercise vao library' },
  { code: 'exercise.update', name: 'Cap nhat bai tap', description: 'Sua thong tin exercise' },
  { code: 'exercise.delete', name: 'Xoa bai tap', description: 'Soft delete exercise' },
  { code: 'workout_plan.create', name: 'Tao workout plan', description: 'Tao plan template moi' },
  { code: 'workout_plan.update', name: 'Cap nhat workout plan', description: 'Sua plan template' },
  {
    code: 'workout_plan.delete',
    name: 'Xoa workout plan',
    description: 'Soft delete plan template',
  },
  {
    code: 'workout_plan.assign',
    name: 'Giao plan cho member',
    description: 'Assign plan cho member (UC05A)',
  },
  {
    code: 'workout_log.create',
    name: 'Ghi buoi tap',
    description: 'Member log workout session (UC06A)',
  },
  { code: 'workout_log.read', name: 'Xem lich su tap', description: 'Xem workout history' },
  { code: 'workout_log.update', name: 'Sua buoi tap', description: 'Sua workout log trong 24h' },
] as const

const GROUPS = [
  {
    name: 'owner',
    description:
      'Chu phong tap: quyen cao nhat. Quan ly tong the hoat dong kinh doanh, nhan su, ' +
      'gioi han quyen he thong va xem bao cao (UC11, UC12, Quy trinh 2.4.6).',
  },
  {
    name: 'staff',
    description:
      'Nhan vien quan ly: thuc hien nghiep vu hanh chinh - dang ky hoi vien, gia han goi tap, ' +
      'quan ly phong tap/thiet bi, tiep nhan va xu ly phan hoi (UC03, UC04, UC07-UC10).',
  },
  {
    name: 'trainer',
    description:
      'Huan luyen vien (PT): quan ly danh sach hoc vien, lap giao an, theo doi va danh gia ' +
      'tien do tap luyen (UC05, UC06).',
  },
  {
    name: 'member',
    description:
      'Hoi vien: su dung dich vu - theo doi goi tap, lich tap, tien do va gui phan hoi ' +
      '(UC04 tu gia han, UC05, UC06 xem ket qua, UC07).',
  },
] as const

/** Permission codes mapped to each role. */
const ROLE_PERMISSIONS: Record<(typeof GROUPS)[number]['name'], string[]> = {
  owner: PERMISSIONS.map((p) => p.code), // toan quyen
  staff: [
    'user.read',
    'user.create',
    'user.update',
    'member.read',
    'member.create',
    'member.update',
    'member.delete',
    'staff.read',
    'package.read',
    'package.manage',
    'subscription.read',
    'subscription.create',
    'subscription.cancel',
    'payment.read',
    'payment.create',
    'payment.refund',
    'room.manage',
    'equipment.manage',
    'maintenance.read',
    'maintenance.report',
    'maintenance.resolve',
    'session.read',
    'attendance.read',
    'attendance.checkin',
    'progress.read',
    'feedback.read',
    'feedback.create',
    'feedback.handle',
    'schedule.read',
    'exercise.read',
    'exercise.create',
    'exercise.update',
    'exercise.delete',
    'workout_plan.assign',
    'workout_log.read',
  ],
  trainer: [
    'member.read',
    'package.read',
    'subscription.read',
    'maintenance.read',
    'maintenance.report',
    'session.read',
    'session.manage',
    'attendance.read',
    'progress.read',
    'progress.record',
    'feedback.read',
    'schedule.read',
    'exercise.read',
    'exercise.create',
    'exercise.update',
    'workout_plan.create',
    'workout_plan.update',
    'workout_plan.delete',
    'workout_plan.assign',
    'workout_log.read',
  ],
  member: [
    'package.read',
    'subscription.read',
    'subscription.create',
    'subscription.cancel',
    'payment.read',
    'payment.create',
    'session.read',
    'attendance.read',
    'progress.read',
    'feedback.read',
    'feedback.create',
    'exercise.read',
    'workout_plan.create',
    'workout_plan.update',
    'workout_plan.delete',
    'workout_log.create',
    'workout_log.read',
    'workout_log.update',
  ],
}

export async function seedPermissions(): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>()
  for (const p of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description },
      create: p,
    })
    map.set(row.code, row.permissionId)
  }
  return map
}

export async function seedGroups(permissionMap: Map<string, bigint>): Promise<Map<string, bigint>> {
  const groupMap = new Map<string, bigint>()
  for (const g of GROUPS) {
    const row = await prisma.group.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: g,
    })
    groupMap.set(g.name, row.groupId)

    // Reset & re-gan permissions cho group
    await prisma.groupPermission.deleteMany({ where: { groupId: row.groupId } })
    const permCodes = ROLE_PERMISSIONS[g.name]
    if (permCodes.length > 0) {
      await prisma.groupPermission.createMany({
        data: permCodes.map((code) => {
          const permissionId = permissionMap.get(code)
          if (permissionId === undefined) {
            throw new Error(`Permission code khong ton tai: ${code}`)
          }
          return { groupId: row.groupId, permissionId }
        }),
        skipDuplicates: true,
      })
    }
  }
  return groupMap
}
