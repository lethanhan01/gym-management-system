import { UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma, SEED_PASSWORD } from './client'
import {
  addDays,
  makeEmail,
  NEW_LAST_NAMES,
  NEW_FIRST_NAMES,
  NEW_MIDDLE_NAMES,
  HCM_ADDRESSES,
  getTrainerCodeForMember,
} from './helpers'

interface SeedUser {
  email: string
  phone: string
  fullName: string
  status: UserStatus
  createdAt: Date
  role: 'owner' | 'staff' | 'trainer' | 'member'
  staff?: { staffCode: string; position: string }
  member?: {
    memberCode: string
    dateOfBirth: Date
    address: string
    primaryTrainerStaffCode?: string
  }
}

const TRAINER_MINH_MEMBERS: SeedUser[] = [
  {
    email: 'gia.bao.mock@gym.local',
    phone: '0911000007',
    fullName: 'Hoang Gia Bao',
    status: UserStatus.active,
    createdAt: new Date('2026-04-20T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0007',
      dateOfBirth: new Date('1994-02-18'),
      address: '15 Nguyen Van Troi, Q. Phu Nhuan, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'minh.chau.mock@gym.local',
    phone: '0911000008',
    fullName: 'Nguyen Minh Chau',
    status: UserStatus.active,
    createdAt: new Date('2026-04-25T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0008',
      dateOfBirth: new Date('1999-08-07'),
      address: '82 Phan Xich Long, Q. Phu Nhuan, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'duc.duy.mock@gym.local',
    phone: '0911000009',
    fullName: 'Tran Duc Duy',
    status: UserStatus.active,
    createdAt: new Date('2026-05-01T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0009',
      dateOfBirth: new Date('1988-11-21'),
      address: '34 Dien Bien Phu, Q. Binh Thanh, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'thu.ha.mock@gym.local',
    phone: '0911000010',
    fullName: 'Le Thu Ha',
    status: UserStatus.active,
    createdAt: new Date('2026-05-08T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0010',
      dateOfBirth: new Date('2000-05-14'),
      address: '106 Ly Chinh Thang, Q.3, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'quoc.khanh.mock@gym.local',
    phone: '0911000011',
    fullName: 'Pham Quoc Khanh',
    status: UserStatus.active,
    createdAt: new Date('2026-05-15T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0011',
      dateOfBirth: new Date('1992-09-03'),
      address: '57 Nguyen Trai, Q.5, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'ngoc.lan.mock@gym.local',
    phone: '0911000012',
    fullName: 'Vo Ngoc Lan',
    status: UserStatus.active,
    createdAt: new Date('2026-05-22T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0012',
      dateOfBirth: new Date('1997-12-19'),
      address: '23 Hoang Van Thu, Q. Tan Binh, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'thanh.nam.mock@gym.local',
    phone: '0911000013',
    fullName: 'Bui Thanh Nam',
    status: UserStatus.active,
    createdAt: new Date('2026-05-28T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0013',
      dateOfBirth: new Date('1985-06-26'),
      address: '91 Cong Hoa, Q. Tan Binh, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'mai.phuong.mock@gym.local',
    phone: '0911000014',
    fullName: 'Do Mai Phuong',
    status: UserStatus.active,
    createdAt: new Date('2026-06-01T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0014',
      dateOfBirth: new Date('2002-03-10'),
      address: '44 Vo Thi Sau, Q.3, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'hoang.son.mock@gym.local',
    phone: '0911000015',
    fullName: 'Dang Hoang Son',
    status: UserStatus.pending_verification,
    createdAt: new Date('2026-06-05T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0015',
      dateOfBirth: new Date('1996-10-30'),
      address: '70 Au Co, Q. Tan Phu, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'bao.tram.mock@gym.local',
    phone: '0911000016',
    fullName: 'Truong Bao Tram',
    status: UserStatus.locked,
    createdAt: new Date('2026-06-08T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0016',
      dateOfBirth: new Date('1991-01-16'),
      address: '11 Kha Van Can, TP. Thu Duc, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
]

export const TRAINER_MINH_MEMBER_CODES = TRAINER_MINH_MEMBERS.map((user) => user.member!.memberCode)

const USERS: SeedUser[] = [
  {
    email: 'owner@gym.local',
    phone: '0900000001',
    fullName: 'Pham Quoc Hung',
    status: UserStatus.active,
    createdAt: new Date('2026-01-01T08:00:00'),
    role: 'owner',
    staff: { staffCode: 'STF-OWN-001', position: 'owner' },
  },
  {
    email: 'staff.linh@gym.local',
    phone: '0900000002',
    fullName: 'Nguyen Thi Linh',
    status: UserStatus.active,
    createdAt: new Date('2026-01-02T08:00:00'),
    role: 'staff',
    staff: { staffCode: 'STF-STA-001', position: 'staff' },
  },
  {
    email: 'trainer.minh@gym.local',
    phone: '0900000003',
    fullName: 'Tran Quang Minh',
    status: UserStatus.active,
    createdAt: new Date('2026-01-03T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-001', position: 'trainer' },
  },
  {
    email: 'trainer.huong@gym.local',
    phone: '0900000004',
    fullName: 'Le Thi Huong',
    status: UserStatus.active,
    createdAt: new Date('2026-01-04T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-002', position: 'trainer' },
  },
  {
    email: 'nguyen.van.a@email.com',
    phone: '0911000001',
    fullName: 'Nguyen Minh Tuan',
    status: UserStatus.active,
    createdAt: new Date('2026-02-01T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0001',
      dateOfBirth: new Date('1995-04-12'),
      address: '12 Le Loi, Q.1, TP.HCM',
    },
  },
  {
    email: 'tran.thi.b@email.com',
    phone: '0911000002',
    fullName: 'Tran Thi Huyen',
    status: UserStatus.active,
    createdAt: new Date('2026-02-02T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0002',
      dateOfBirth: new Date('1998-09-23'),
      address: '45 Nguyen Hue, Q.1, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-002',
    },
  },
  {
    email: 'le.van.c@email.com',
    phone: '0911000003',
    fullName: 'Le Quoc Bao',
    status: UserStatus.active,
    createdAt: new Date('2026-02-03T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0003',
      dateOfBirth: new Date('1990-01-30'),
      address: '88 Cach Mang Thang 8, Q.3, HCM',
    },
  },
  {
    email: 'pham.thi.d@email.com',
    phone: '0911000004',
    fullName: 'Pham Thi Ngoc',
    status: UserStatus.active,
    createdAt: new Date('2026-02-04T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0004',
      dateOfBirth: new Date('2001-07-15'),
      address: '21 Pasteur, Q.3, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-002',
    },
  },
  {
    email: 'hoang.van.e@email.com',
    phone: '0911000005',
    fullName: 'Hoang Duc Thanh',
    status: UserStatus.active,
    createdAt: new Date('2026-02-05T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0005',
      dateOfBirth: new Date('1993-12-05'),
      address: '7 Tran Hung Dao, Q.5, TP.HCM',
    },
  },
  {
    email: 'vu.thi.f@email.com',
    phone: '0911000006',
    fullName: 'Vu Thi Mai',
    status: UserStatus.locked,
    createdAt: new Date('2026-02-06T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0006',
      dateOfBirth: new Date('1996-06-18'),
      address: '102 Vo Van Tan, Q.3, TP.HCM',
    },
  },
  ...TRAINER_MINH_MEMBERS,
]

export async function seedUsers(groupMap: Map<string, bigint>): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  for (const u of USERS) {
    const emailVerifiedAt = u.status === UserStatus.pending_verification ? null : u.createdAt
    const userRow = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        emailVerifiedAt,
        passwordHash,
      },
      create: {
        email: u.email,
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        emailVerifiedAt,
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
      const primaryTrainer = u.member.primaryTrainerStaffCode
        ? await prisma.staff.findUnique({
            where: { staffCode: u.member.primaryTrainerStaffCode },
            select: { staffId: true },
          })
        : null
      if (u.member.primaryTrainerStaffCode && !primaryTrainer) {
        throw new Error(`Trainer staff code khong ton tai: ${u.member.primaryTrainerStaffCode}`)
      }

      await prisma.member.upsert({
        where: { memberCode: u.member.memberCode },
        update: {
          userId: userRow.userId,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
          primaryTrainerId: primaryTrainer?.staffId ?? null,
        },
        create: {
          userId: userRow.userId,
          memberCode: u.member.memberCode,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
          primaryTrainerId: primaryTrainer?.staffId ?? null,
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

export async function seedNewUsersStaffMembers(
  groupMap: Map<string, bigint>
): Promise<{ trainerMap: Map<string, bigint>; memberMap: Map<string, bigint> }> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  const baseMs = new Date('2026-01-05').getTime()
  const spanMs = new Date('2026-06-10').getTime() - baseMs

  function createdAtFor(globalIdx: number): Date {
    return new Date(baseMs + Math.floor((globalIdx / 99) * spanMs))
  }

  function statusFor(globalIdx: number): UserStatus {
    if (globalIdx >= 95) return UserStatus.locked
    if (globalIdx >= 85) return UserStatus.pending_verification
    return UserStatus.active
  }

  const trainerMap = new Map<string, bigint>()
  const memberMap = new Map<string, bigint>()
  const trainerGroupId = groupMap.get('trainer')!
  const staffGroupId = groupMap.get('staff')!
  const memberGroupId = groupMap.get('member')!

  // 15 trainers (global idx 0..14)
  for (let i = 0; i < 15; i++) {
    const globalIdx = i
    const staffCode = `STF-PT-${String(3 + i).padStart(3, '0')}`
    const fullName = `${NEW_LAST_NAMES[i % 16]} ${NEW_MIDDLE_NAMES[i % 10]} ${NEW_FIRST_NAMES[i % 30]}`
    const email = makeEmail(fullName, globalIdx + 1)
    const phone = `09${String(12000001 + globalIdx)}`
    const createdAt = createdAtFor(globalIdx)
    const status = statusFor(globalIdx)

    const userRow = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        phone,
        fullName,
        status,
        emailVerifiedAt: status === UserStatus.pending_verification ? null : createdAt,
        passwordHash,
        createdAt,
      },
    })
    const staffRow = await prisma.staff.upsert({
      where: { staffCode },
      update: { userId: userRow.userId, position: 'trainer' },
      create: { userId: userRow.userId, staffCode, position: 'trainer' },
    })
    await prisma.userGroup.upsert({
      where: { userId_groupId: { userId: userRow.userId, groupId: trainerGroupId } },
      update: {},
      create: { userId: userRow.userId, groupId: trainerGroupId },
    })
    trainerMap.set(staffCode, staffRow.staffId)
  }
  console.log('[seed] seeded 15 new trainers (STF-PT-003..017)')

  // 15 staff (global idx 15..29)
  for (let i = 0; i < 15; i++) {
    const globalIdx = 15 + i
    const staffCode = `STF-STA-${String(2 + i).padStart(3, '0')}`
    const fullName = `${NEW_LAST_NAMES[(15 + i) % 16]} ${NEW_MIDDLE_NAMES[(15 + i) % 10]} ${NEW_FIRST_NAMES[(15 + i) % 30]}`
    const email = makeEmail(fullName, globalIdx + 1)
    const phone = `09${String(12000001 + globalIdx)}`
    const createdAt = createdAtFor(globalIdx)
    const status = statusFor(globalIdx)

    const userRow = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        phone,
        fullName,
        status,
        emailVerifiedAt: status === UserStatus.pending_verification ? null : createdAt,
        passwordHash,
        createdAt,
      },
    })
    await prisma.staff.upsert({
      where: { staffCode },
      update: { userId: userRow.userId, position: 'staff' },
      create: { userId: userRow.userId, staffCode, position: 'staff' },
    })
    await prisma.userGroup.upsert({
      where: { userId_groupId: { userId: userRow.userId, groupId: staffGroupId } },
      update: {},
      create: { userId: userRow.userId, groupId: staffGroupId },
    })
  }
  console.log('[seed] seeded 15 new staff (STF-STA-002..016)')

  // 70 members (global idx 30..99)
  for (let i = 0; i < 70; i++) {
    const globalIdx = 30 + i
    const memberNum = 17 + i
    const memberCode = `MB-2026-${String(memberNum).padStart(4, '0')}`
    const fullName = `${NEW_LAST_NAMES[(30 + i) % 16]} ${NEW_MIDDLE_NAMES[(30 + i) % 10]} ${NEW_FIRST_NAMES[(30 + i) % 30]}`
    const email = makeEmail(fullName, globalIdx + 1)
    const phone = `09${String(12000001 + globalIdx)}`
    const createdAt = createdAtFor(globalIdx)
    const status = statusFor(globalIdx)
    const age = 18 + (i % 37)
    const dateOfBirth = new Date(2026 - age, i % 12, (i % 28) + 1)

    let primaryTrainerId: bigint | null = null
    if (i < 40) {
      const trainerCode = getTrainerCodeForMember(i)
      primaryTrainerId = trainerMap.get(trainerCode) ?? null
    }

    const userRow = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        phone,
        fullName,
        status,
        emailVerifiedAt: status === UserStatus.pending_verification ? null : createdAt,
        passwordHash,
        createdAt,
      },
    })
    const memberRow = await prisma.member.upsert({
      where: { memberCode },
      update: {
        userId: userRow.userId,
        dateOfBirth,
        address: HCM_ADDRESSES[i % 20],
        primaryTrainerId,
      },
      create: {
        userId: userRow.userId,
        memberCode,
        dateOfBirth,
        address: HCM_ADDRESSES[i % 20],
        primaryTrainerId,
        createdAt,
      },
    })
    await prisma.userGroup.upsert({
      where: { userId_groupId: { userId: userRow.userId, groupId: memberGroupId } },
      update: {},
      create: { userId: userRow.userId, groupId: memberGroupId },
    })
    memberMap.set(memberCode, memberRow.memberId)
  }
  console.log('[seed] seeded 70 new members (MB-2026-0017..0086)')

  return { trainerMap, memberMap }
}
