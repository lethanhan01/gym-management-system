/**
 * Seed RBAC + user/staff/member mau cho dev (theo SRS / Database.md).
 *
 * 4 ROLES (theo SRS_VI.md muc 2.1):
 *   owner   = Chu phong tap
 *   staff   = Nhan vien quan ly
 *   trainer = Huan luyen vien (PT)
 *   member  = Hoi vien
 *
 * Chay: `npm run prisma:seed` (hoac `npx prisma db seed`).
 * Script tu xoa toan bo du lieu 7 bang RBAC/profile truoc khi insert lai
 * de luon o trang thai sach (idempotent).
 */

import { PrismaClient, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SEED_PASSWORD = 'Password123!'

const PERMISSIONS = [
  // Quan ly tai khoan & phan quyen (Quy trinh 2.4.6)
  { code: 'user.read',           name: 'Xem tai khoan',         description: 'Xem danh sach va chi tiet tai khoan he thong' },
  { code: 'user.create',         name: 'Tao tai khoan',         description: 'Tao tai khoan moi (kem dang ky ho so)' },
  { code: 'user.update',         name: 'Cap nhat tai khoan',    description: 'Sua thong tin / khoa / mo khoa tai khoan' },
  { code: 'user.delete',         name: 'Xoa tai khoan',         description: 'Xoa tai khoan khoi he thong' },
  { code: 'rbac.manage',         name: 'Quan ly phan quyen',    description: 'Tao/sua/xoa nhom, gan quyen va gan user vao nhom (2.4.6)' },
  // Hoi vien (UC03)
  { code: 'member.read',         name: 'Xem hoi vien',          description: 'Xem ho so hoi vien' },
  { code: 'member.create',       name: 'Tao hoi vien',          description: 'Dang ky hoi vien moi (UC03)' },
  { code: 'member.update',       name: 'Cap nhat hoi vien',     description: 'Sua ho so hoi vien' },
  { code: 'member.delete',       name: 'Xoa hoi vien',          description: 'Xoa ho so hoi vien' },
  // Nhan su / PT (UC11)
  { code: 'staff.read',          name: 'Xem nhan su',           description: 'Xem danh sach nhan su / PT' },
  { code: 'staff.create',        name: 'Tao nhan su',           description: 'Them nhan su / PT moi (UC11)' },
  { code: 'staff.update',        name: 'Cap nhat nhan su',      description: 'Sua ho so nhan su (UC11)' },
  { code: 'staff.delete',        name: 'Xoa nhan su',           description: 'Xoa nhan su (UC11)' },
  // Goi tap & dang ky (UC04, UC10)
  { code: 'package.read',        name: 'Xem goi tap',           description: 'Xem danh muc goi tap' },
  { code: 'package.manage',      name: 'Quan ly goi tap',       description: 'Tao / sua / ngung kinh doanh goi tap (UC10)' },
  { code: 'subscription.read',   name: 'Xem dang ky goi',       description: 'Xem cac luot dang ky cua hoi vien' },
  { code: 'subscription.create', name: 'Tao dang ky goi',       description: 'Ban / gia han goi cho hoi vien (UC03, UC04)' },
  // Thanh toan (UC03, UC04)
  { code: 'payment.read',        name: 'Xem thanh toan',        description: 'Xem lich su giao dich' },
  { code: 'payment.create',      name: 'Tao giao dich',         description: 'Ghi nhan thanh toan (UC03, UC04)' },
  { code: 'payment.refund',      name: 'Hoan tien',             description: 'Thuc hien hoan tien giao dich' },
  // Phong tap, thiet bi, bao tri (UC08, UC09)
  { code: 'room.manage',         name: 'Quan ly phong tap',     description: 'Tao / sua / xoa phong tap (UC08)' },
  { code: 'equipment.manage',    name: 'Quan ly thiet bi',      description: 'Quan ly danh muc thiet bi (UC09)' },
  { code: 'maintenance.read',    name: 'Xem nhat ky bao tri',   description: 'Xem cac phieu bao tri' },
  { code: 'maintenance.report',  name: 'Bao loi thiet bi',      description: 'Tao phieu bao tri / bao loi (UC09)' },
  { code: 'maintenance.resolve', name: 'Xu ly bao tri',         description: 'Cap nhat ket qua xu ly phieu bao tri (UC09)' },
  // Lich tap / cham cong / tien do (UC05, UC06)
  { code: 'session.read',        name: 'Xem lich tap',          description: 'Xem lich tap voi PT (UC05)' },
  { code: 'session.manage',      name: 'Quan ly lich tap',      description: 'Tao / sua / huy lich tap (UC05)' },
  { code: 'attendance.read',     name: 'Xem cham cong',         description: 'Xem nhat ky check-in / ghi nhan tu dong' },
  { code: 'attendance.checkin',  name: 'Check-in hoi vien',     description: 'Ghi nhan check-in / check-out (UC05 fallback)' },
  { code: 'progress.read',       name: 'Xem tien do tap',       description: 'Xem chi so tien do hoi vien (UC06)' },
  { code: 'progress.record',     name: 'Ghi nhan tien do',      description: 'Ghi chi so BMI / can nang / muc tieu (UC06)' },
  // Phan hoi & thong bao (UC07, 2.4.5)
  { code: 'feedback.read',       name: 'Xem phan hoi',          description: 'Xem phan hoi cua hoi vien' },
  { code: 'feedback.create',     name: 'Gui phan hoi',          description: 'Hoi vien / nhan vien tai quay gui phan hoi (UC07)' },
  { code: 'feedback.handle',     name: 'Xu ly phan hoi',        description: 'Tiep nhan / phan loai / xu ly phan hoi (2.4.5)' },
  // V1.0 da bo notification feature (xem Database.md). Re-add khi UC14 phuc hoi o v1.1+.
  // Lich lam viec & bao cao (UC11, UC12)
  { code: 'schedule.read',       name: 'Xem lich lam viec',     description: 'Xem lich ca lam cua nhan su' },
  { code: 'schedule.manage',     name: 'Quan ly lich lam viec', description: 'Phan ca cho nhan su (UC11)' },
  { code: 'report.view',         name: 'Xem bao cao',           description: 'Xem cac bao cao thong ke (UC12)' },
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
    'user.read', 'user.create', 'user.update',
    'member.read', 'member.create', 'member.update', 'member.delete',
    'staff.read',
    'package.read', 'package.manage',
    'subscription.read', 'subscription.create',
    'payment.read', 'payment.create', 'payment.refund',
    'room.manage',
    'equipment.manage',
    'maintenance.read', 'maintenance.report', 'maintenance.resolve',
    'session.read',
    'attendance.read', 'attendance.checkin',
    'progress.read',
    'feedback.read', 'feedback.create', 'feedback.handle',
    'schedule.read',
  ],
  trainer: [
    'member.read',
    'package.read',
    'subscription.read',
    'maintenance.read', 'maintenance.report',
    'session.read', 'session.manage',
    'attendance.read', 'attendance.checkin',
    'progress.read', 'progress.record',
    'feedback.read',
    'schedule.read',
  ],
  member: [
    'package.read',
    'subscription.read', 'subscription.create',
    'payment.read', 'payment.create',
    'session.read',
    'attendance.read',
    'progress.read',
    'feedback.create',
  ],
}

interface SeedUser {
  email: string
  phone: string
  fullName: string
  status: UserStatus
  createdAt: Date
  role: (typeof GROUPS)[number]['name']
  staff?: { staffCode: string; position: string }
  member?: { memberCode: string; dateOfBirth: Date; address: string }
}

const USERS: SeedUser[] = [
  {
    email: 'owner@gym.local', phone: '0900000001', fullName: 'Pham Quoc Hung',
    status: UserStatus.active, createdAt: new Date('2026-01-01T08:00:00'),
    role: 'owner',
    staff: { staffCode: 'STF-OWN-001', position: 'owner' },
  },
  {
    email: 'staff.linh@gym.local', phone: '0900000002', fullName: 'Nguyen Thi Linh',
    status: UserStatus.active, createdAt: new Date('2026-01-02T08:00:00'),
    role: 'staff',
    staff: { staffCode: 'STF-STA-001', position: 'staff' },
  },
  {
    email: 'trainer.minh@gym.local', phone: '0900000003', fullName: 'Tran Quang Minh',
    status: UserStatus.active, createdAt: new Date('2026-01-03T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-001', position: 'trainer' },
  },
  {
    email: 'trainer.huong@gym.local', phone: '0900000004', fullName: 'Le Thi Huong',
    status: UserStatus.active, createdAt: new Date('2026-01-04T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-002', position: 'trainer' },
  },
  {
    email: 'nguyen.van.a@email.com', phone: '0911000001', fullName: 'Nguyen Van A',
    status: UserStatus.active, createdAt: new Date('2026-02-01T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0001', dateOfBirth: new Date('1995-04-12'), address: '12 Le Loi, Q.1, TP.HCM' },
  },
  {
    email: 'tran.thi.b@email.com', phone: '0911000002', fullName: 'Tran Thi B',
    status: UserStatus.active, createdAt: new Date('2026-02-02T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0002', dateOfBirth: new Date('1998-09-23'), address: '45 Nguyen Hue, Q.1, TP.HCM' },
  },
  {
    email: 'le.van.c@email.com', phone: '0911000003', fullName: 'Le Van C',
    status: UserStatus.active, createdAt: new Date('2026-02-03T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0003', dateOfBirth: new Date('1990-01-30'), address: '88 Cach Mang Thang 8, Q.3, HCM' },
  },
  {
    email: 'pham.thi.d@email.com', phone: '0911000004', fullName: 'Pham Thi D',
    status: UserStatus.active, createdAt: new Date('2026-02-04T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0004', dateOfBirth: new Date('2001-07-15'), address: '21 Pasteur, Q.3, TP.HCM' },
  },
  {
    email: 'hoang.van.e@email.com', phone: '0911000005', fullName: 'Hoang Van E',
    status: UserStatus.active, createdAt: new Date('2026-02-05T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0005', dateOfBirth: new Date('1993-12-05'), address: '7 Tran Hung Dao, Q.5, TP.HCM' },
  },
  {
    email: 'vu.thi.f@email.com', phone: '0911000006', fullName: 'Vu Thi F',
    status: UserStatus.locked, createdAt: new Date('2026-02-06T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0006', dateOfBirth: new Date('1996-06-18'), address: '102 Vo Van Tan, Q.3, TP.HCM' },
  },
]

async function reset(): Promise<void> {
  await prisma.$transaction([
    prisma.groupPermission.deleteMany(),
    prisma.userGroup.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.group.deleteMany(),
    prisma.member.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

async function seedPermissions(): Promise<Map<string, bigint>> {
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

async function seedGroups(
  permissionMap: Map<string, bigint>,
): Promise<Map<string, bigint>> {
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

async function seedUsers(groupMap: Map<string, bigint>): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  for (const u of USERS) {
    const userRow = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        passwordHash,
      },
      create: {
        email: u.email,
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        passwordHash,
        createdAt: u.createdAt,
      },
    })

    if (u.staff) {
      await prisma.staff.upsert({
        where: { staffCode: u.staff.staffCode },
        update: { userId: userRow.userId, position: u.staff.position },
        create: {
          userId: userRow.userId,
          staffCode: u.staff.staffCode,
          position: u.staff.position,
        },
      })
    }

    if (u.member) {
      await prisma.member.upsert({
        where: { memberCode: u.member.memberCode },
        update: {
          userId: userRow.userId,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
        },
        create: {
          userId: userRow.userId,
          memberCode: u.member.memberCode,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
          createdAt: u.createdAt,
        },
      })
    }

    const groupId = groupMap.get(u.role)
    if (groupId === undefined) {
      throw new Error(`Group khong ton tai: ${u.role}`)
    }
    await prisma.userGroup.upsert({
      where: { userId_groupId: { userId: userRow.userId, groupId } },
      update: {},
      create: { userId: userRow.userId, groupId },
    })
  }
}

async function main(): Promise<void> {
  console.log('[seed] reset RBAC + profile tables...')
  await reset()

  console.log('[seed] permissions...')
  const permissionMap = await seedPermissions()

  console.log('[seed] groups + group_permissions...')
  const groupMap = await seedGroups(permissionMap)

  console.log('[seed] users + staff + members + user_groups...')
  await seedUsers(groupMap)

  const counts = {
    users: await prisma.user.count(),
    staff: await prisma.staff.count(),
    members: await prisma.member.count(),
    groups: await prisma.group.count(),
    permissions: await prisma.permission.count(),
    user_groups: await prisma.userGroup.count(),
    group_permissions: await prisma.groupPermission.count(),
  }
  console.log('[seed] done. Row counts:', counts)
  console.log(`[seed] All seeded users share password: ${SEED_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
