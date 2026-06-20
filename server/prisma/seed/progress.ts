import { SubscriptionStatus, AttendanceMethod, TrainingSessionStatus } from '@prisma/client'
import { prisma } from './client'
import { TRAINER_MINH_MEMBER_CODES } from './users'

export async function seedMemberProgress(): Promise<void> {
  const members = await prisma.member.findMany({
    where: {
      memberCode: {
        in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0003', ...TRAINER_MINH_MEMBER_CODES],
      },
    },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffList = await prisma.staff.findMany({
    where: { staffCode: { in: ['STF-PT-001', 'STF-PT-002'] } },
    select: { staffId: true, staffCode: true },
  })
  const staffMinh = staffList.find((s) => s.staffCode === 'STF-PT-001')
  const staffHuong = staffList.find((s) => s.staffCode === 'STF-PT-002')
  if (!staffMinh || !staffHuong) return

  await prisma.memberProgress.deleteMany({})
  await prisma.memberProgress.createMany({
    data: [
      // Nguyen Van A
      {
        memberId: mMap.get('MB-2026-0001')!,
        staffId: staffMinh.staffId,
        weight: 75.0,
        height: 178.7,
        bmi: 23.5,
        goal: 'Giam mo bung, tang co bap tay va nguc',
        notes: 'The luc tot, can cai thien che do an',
        recordedAt: new Date('2026-03-15T09:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        staffId: staffMinh.staffId,
        weight: 73.2,
        height: 178.7,
        bmi: 22.9,
        goal: 'Giam mo bung, tang co bap tay va nguc',
        notes: 'Giam 1.8kg sau 5 tuan, tien do tot',
        recordedAt: new Date('2026-04-20T09:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        staffId: staffMinh.staffId,
        weight: 71.5,
        height: 178.7,
        bmi: 22.3,
        goal: 'Giam mo bung, tang co bap tay va nguc',
        notes: 'Dat muc tieu -3.5kg, tiep tuc duy tri gian do',
        recordedAt: new Date('2026-05-25T09:00:00'),
      },
      // Tran Thi B
      {
        memberId: mMap.get('MB-2026-0002')!,
        staffId: staffHuong.staffId,
        weight: 58.0,
        height: 162.0,
        bmi: 22.1,
        goal: 'Giam can, tang cuong suc de khang',
        notes: 'Tap trung cardio va dinh duong',
        recordedAt: new Date('2026-05-08T10:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0002')!,
        staffId: staffHuong.staffId,
        weight: 57.0,
        height: 162.0,
        bmi: 21.7,
        goal: 'Giam can, tang cuong suc de khang',
        notes: 'Giam 1kg sau 3 tuan, nang luong on dinh',
        recordedAt: new Date('2026-05-22T10:00:00'),
      },
      // Le Van C
      {
        memberId: mMap.get('MB-2026-0003')!,
        staffId: staffMinh.staffId,
        weight: 85.0,
        height: 176.4,
        bmi: 27.3,
        goal: 'Tang co bap, giam mo the',
        notes: 'Can can bang protein + carb',
        recordedAt: new Date('2026-01-20T14:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0003')!,
        staffId: staffMinh.staffId,
        weight: 83.5,
        height: 176.4,
        bmi: 26.8,
        goal: 'Tang co bap, giam mo the',
        notes: 'Tang suc manh squat & deadlift ro rang',
        recordedAt: new Date('2026-03-15T14:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0003')!,
        staffId: staffMinh.staffId,
        weight: 82.0,
        height: 176.4,
        bmi: 26.3,
        goal: 'Tang co bap, giam mo the',
        notes: 'Tien do tot, can them thoi gian nghi phuc hoi',
        recordedAt: new Date('2026-05-10T14:00:00'),
      },
      // MB-0007
      {
        memberId: mMap.get('MB-2026-0007')!,
        staffId: staffMinh.staffId,
        weight: 81.5,
        height: 176.7,
        bmi: 26.1,
        goal: 'Giam 6kg va cai thien suc ben',
        notes: 'Danh gia ban dau, uu tien cardio nhe',
        recordedAt: new Date('2026-04-22T08:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0007')!,
        staffId: staffMinh.staffId,
        weight: 79.8,
        height: 176.7,
        bmi: 25.6,
        goal: 'Giam 6kg va cai thien suc ben',
        notes: 'Duy tri tot lich tap 3 buoi moi tuan',
        recordedAt: new Date('2026-05-18T08:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0007')!,
        staffId: staffMinh.staffId,
        weight: 78.6,
        height: 176.7,
        bmi: 25.2,
        goal: 'Giam 6kg va cai thien suc ben',
        notes: 'Tien do on dinh, tang them cardio cuoi buoi',
        recordedAt: new Date('2026-06-08T08:00:00'),
      },
      // MB-0008
      {
        memberId: mMap.get('MB-2026-0008')!,
        staffId: staffMinh.staffId,
        weight: 54.0,
        height: 163.1,
        bmi: 20.3,
        goal: 'Tang co than duoi va cai thien tu the',
        notes: 'Can tap trung squat va hip hinge dung ky thuat',
        recordedAt: new Date('2026-04-28T09:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0008')!,
        staffId: staffMinh.staffId,
        weight: 54.8,
        height: 163.1,
        bmi: 20.6,
        goal: 'Tang co than duoi va cai thien tu the',
        notes: 'Suc manh chan tang, tu the squat tot hon',
        recordedAt: new Date('2026-06-06T09:00:00'),
      },
      // MB-0009
      {
        memberId: mMap.get('MB-2026-0009')!,
        staffId: staffMinh.staffId,
        weight: 92.0,
        height: 176.9,
        bmi: 29.4,
        goal: 'Giam mo va kiem soat huyet ap',
        notes: 'Bat dau voi cuong do thap, theo doi nhip tim',
        recordedAt: new Date('2026-05-03T17:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0009')!,
        staffId: staffMinh.staffId,
        weight: 89.7,
        height: 176.9,
        bmi: 28.7,
        goal: 'Giam mo va kiem soat huyet ap',
        notes: 'Giam 2.3kg, kha nang phuc hoi tot',
        recordedAt: new Date('2026-06-07T17:00:00'),
      },
      // MB-0010
      {
        memberId: mMap.get('MB-2026-0010')!,
        staffId: staffMinh.staffId,
        weight: 49.5,
        height: 161.8,
        bmi: 18.9,
        goal: 'Tang 3kg co nac',
        notes: 'Can tang protein va tap khang luc deu',
        recordedAt: new Date('2026-05-10T10:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0010')!,
        staffId: staffMinh.staffId,
        weight: 50.4,
        height: 161.8,
        bmi: 19.2,
        goal: 'Tang 3kg co nac',
        notes: 'Tang can dung huong, tiep tuc giu muc ta',
        recordedAt: new Date('2026-06-09T10:00:00'),
      },
      // MB-0011
      {
        memberId: mMap.get('MB-2026-0011')!,
        staffId: staffMinh.staffId,
        weight: 76.2,
        height: 177.8,
        bmi: 24.1,
        goal: 'Tang suc manh tong the',
        notes: 'Nen tang tot, can cai thien do linh hoat vai',
        recordedAt: new Date('2026-05-17T15:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0011')!,
        staffId: staffMinh.staffId,
        weight: 76.8,
        height: 177.8,
        bmi: 24.3,
        goal: 'Tang suc manh tong the',
        notes: 'Bench press va deadlift tien bo ro',
        recordedAt: new Date('2026-06-08T15:00:00'),
      },
      // MB-0012
      {
        memberId: mMap.get('MB-2026-0012')!,
        staffId: staffMinh.staffId,
        weight: 61.0,
        height: 165.0,
        bmi: 22.4,
        goal: 'Giam dau lung va tang do deo dai',
        notes: 'Uu tien core, mobility va ky thuat tho',
        recordedAt: new Date('2026-05-25T18:00:00'),
      },
      // MB-0013
      {
        memberId: mMap.get('MB-2026-0013')!,
        staffId: staffMinh.staffId,
        weight: 84.3,
        height: 176.7,
        bmi: 27.0,
        goal: 'Giam mo noi tang',
        notes: 'Lich tap 3 buoi, ket hop di bo moi ngay',
        recordedAt: new Date('2026-05-30T07:00:00'),
      },
      // MB-0014
      {
        memberId: mMap.get('MB-2026-0014')!,
        staffId: staffMinh.staffId,
        weight: 52.6,
        height: 163.0,
        bmi: 19.8,
        goal: 'Tang suc ben va giu dang',
        notes: 'Danh gia dau vao, the luc kha',
        recordedAt: new Date('2026-06-03T16:00:00'),
      },
    ],
  })
  console.log('[seed] seeded 22 member progress records')
}

export async function seedTrainingSessions(roomMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where: {
      memberCode: {
        in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0004', ...TRAINER_MINH_MEMBER_CODES],
      },
    },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffList = await prisma.staff.findMany({
    where: { staffCode: { in: ['STF-PT-001', 'STF-PT-002'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))
  const roomId = roomMap.get('ROOM-003')!

  await prisma.trainingSession.deleteMany({})
  await prisma.trainingSession.createMany({
    data: [
      // Member A + Trainer Minh
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-05-20T07:00:00'),
        endTime: new Date('2026-05-20T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-05-22T07:00:00'),
        endTime: new Date('2026-05-22T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-05-27T07:00:00'),
        endTime: new Date('2026-05-27T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-02T07:00:00'),
        endTime: new Date('2026-06-02T08:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // Member B + Trainer Huong
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-05-20T09:00:00'),
        endTime: new Date('2026-05-20T10:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-05-27T09:00:00'),
        endTime: new Date('2026-05-27T10:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-06-03T09:00:00'),
        endTime: new Date('2026-06-03T10:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0007 + Trainer Minh
      {
        memberId: mMap.get('MB-2026-0007')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-03T07:00:00'),
        endTime: new Date('2026-06-03T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0007')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-11T07:00:00'),
        endTime: new Date('2026-06-11T08:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0008
      {
        memberId: mMap.get('MB-2026-0008')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-04T08:30:00'),
        endTime: new Date('2026-06-04T09:30:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0008')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-12T08:30:00'),
        endTime: new Date('2026-06-12T09:30:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0009
      {
        memberId: mMap.get('MB-2026-0009')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-06T10:00:00'),
        endTime: new Date('2026-06-06T11:00:00'),
        status: TrainingSessionStatus.cancelled,
      },
      {
        memberId: mMap.get('MB-2026-0009')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-13T10:00:00'),
        endTime: new Date('2026-06-13T11:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0010
      {
        memberId: mMap.get('MB-2026-0010')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-07T14:00:00'),
        endTime: new Date('2026-06-07T15:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0010')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-14T14:00:00'),
        endTime: new Date('2026-06-14T15:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0011
      {
        memberId: mMap.get('MB-2026-0011')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-08T15:30:00'),
        endTime: new Date('2026-06-08T16:30:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0011')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-15T15:30:00'),
        endTime: new Date('2026-06-15T16:30:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0012
      {
        memberId: mMap.get('MB-2026-0012')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-09T17:00:00'),
        endTime: new Date('2026-06-09T18:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0012')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-16T17:00:00'),
        endTime: new Date('2026-06-16T18:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0013
      {
        memberId: mMap.get('MB-2026-0013')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-17T07:30:00'),
        endTime: new Date('2026-06-17T08:30:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0014
      {
        memberId: mMap.get('MB-2026-0014')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-18T16:00:00'),
        endTime: new Date('2026-06-18T17:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // in_progress hom nay
      {
        memberId: mMap.get('MB-2026-0008')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-13T08:00:00'),
        endTime: new Date('2026-06-13T10:00:00'),
        status: TrainingSessionStatus.in_progress,
      },
      // MB-0002 bo sung
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-05-29T09:00:00'),
        endTime: new Date('2026-05-29T10:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-06-19T09:00:00'),
        endTime: new Date('2026-06-19T10:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // MB-0004 + Trainer Huong
      {
        memberId: mMap.get('MB-2026-0004')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-05-30T09:00:00'),
        endTime: new Date('2026-05-30T10:00:00'),
        status: TrainingSessionStatus.completed,
      },
    ],
  })
  console.log('[seed] seeded 25 training sessions')
}

export async function seedAttendanceLogs(): Promise<void> {
  const activeSubs = await prisma.subscription.findMany({
    where: { status: SubscriptionStatus.active },
    select: { subscriptionId: true, memberId: true },
  })
  if (activeSubs.length === 0) return

  await prisma.attendanceLog.deleteMany({})

  const checkInSlots: [Date, Date][] = [
    [new Date('2026-05-20T06:30:00'), new Date('2026-05-20T08:15:00')],
    [new Date('2026-05-21T17:00:00'), new Date('2026-05-21T18:30:00')],
    [new Date('2026-05-23T06:45:00'), new Date('2026-05-23T08:00:00')],
    [new Date('2026-05-26T06:30:00'), new Date('2026-05-26T08:00:00')],
    [new Date('2026-05-27T17:15:00'), new Date('2026-05-27T18:45:00')],
    [new Date('2026-05-28T06:30:00'), new Date('2026-05-28T07:50:00')],
  ]

  const logs: {
    subscriptionId: bigint
    memberId: bigint
    startTime: Date
    endTime: Date
    method: AttendanceMethod
  }[] = []
  for (const [subIdx, sub] of activeSubs.entries()) {
    const count = 4 + Number(sub.memberId % 3n)
    // offset mỗi member 5 phút để tránh tất cả check-in cùng một lúc
    const offsetMs = (subIdx % 12) * 5 * 60 * 1000
    for (const [start, end] of checkInSlots.slice(0, count)) {
      logs.push({
        subscriptionId: sub.subscriptionId,
        memberId: sub.memberId,
        startTime: new Date(start.getTime() + offsetMs),
        endTime: new Date(end.getTime() + offsetMs),
        method: AttendanceMethod.manual,
      })
    }
  }

  await prisma.attendanceLog.createMany({ data: logs })
  console.log(`[seed] seeded ${logs.length} attendance logs`)
}
