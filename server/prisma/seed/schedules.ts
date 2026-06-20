import { StaffShift } from '@prisma/client'
import { prisma } from './client'

export async function seedStaffSchedules(): Promise<void> {
  const staffList = await prisma.staff.findMany({
    where: { staffCode: { in: ['STF-STA-001', 'STF-PT-001', 'STF-PT-002'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))

  await prisma.staffSchedule.deleteMany({})
  await prisma.staffSchedule.createMany({
    data: [
      // Linh (staff): ca sang, ca tuan
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-26'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-27'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-28'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-29'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-30'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-06-02'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-06-03'),
      },
      // Minh (PT): ca chieu, Mon/Wed/Fri
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-05-26'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-05-28'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-05-30'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-06-02'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-06-04'),
      },
      // Huong (PT): ca sang, Tue/Thu/Sat
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-27'),
      },
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-29'),
      },
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-31'),
      },
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-06-03'),
      },
      // Linh (staff): ca toi, 3 tuan tiep theo
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.evening,
        workDate: new Date('2026-06-14'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.evening,
        workDate: new Date('2026-06-21'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.evening,
        workDate: new Date('2026-06-28'),
      },
    ],
  })
  console.log('[seed] seeded 19 staff schedules')
}

export async function seedNewStaffSchedules(): Promise<void> {
  const SCHEDULE_DATES = [
    new Date('2026-06-16'), // Mon
    new Date('2026-06-17'), // Tue
    new Date('2026-06-18'), // Wed
    new Date('2026-06-19'), // Thu
    new Date('2026-06-20'), // Fri
    new Date('2026-06-21'), // Sat
    new Date('2026-06-23'), // Mon
    new Date('2026-06-24'), // Tue
    new Date('2026-06-25'), // Wed
    new Date('2026-06-26'), // Thu
    new Date('2026-06-27'), // Fri
  ]
  const DATE_DOW = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5]
  const S = StaffShift

  // 15 shift sequences for staff members (Mon-Fri only, 10 dates per 2-week window)
  const STAFF_SHIFT_SEQUENCES: StaffShift[][] = [
    [
      S.morning,
      S.morning,
      S.morning,
      S.morning,
      S.morning,
      S.morning,
      S.morning,
      S.morning,
      S.morning,
      S.morning,
    ],
    [
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
    ],
    [
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
    ],
    [
      S.morning,
      S.afternoon,
      S.evening,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.morning,
      S.afternoon,
      S.morning,
    ],
    [
      S.afternoon,
      S.morning,
      S.afternoon,
      S.evening,
      S.afternoon,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
    ],
    [
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.morning,
      S.afternoon,
      S.evening,
      S.afternoon,
      S.morning,
    ],
    [
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
    ],
    [
      S.morning,
      S.afternoon,
      S.evening,
      S.morning,
      S.afternoon,
      S.morning,
      S.evening,
      S.morning,
      S.afternoon,
      S.morning,
    ],
    [
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
    ],
    [
      S.morning,
      S.evening,
      S.morning,
      S.afternoon,
      S.morning,
      S.morning,
      S.afternoon,
      S.morning,
      S.evening,
      S.morning,
    ],
    [
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.afternoon,
    ],
    [
      S.morning,
      S.morning,
      S.afternoon,
      S.morning,
      S.morning,
      S.morning,
      S.morning,
      S.afternoon,
      S.morning,
      S.morning,
    ],
    [
      S.afternoon,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.afternoon,
    ],
    [
      S.morning,
      S.afternoon,
      S.morning,
      S.evening,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.morning,
      S.evening,
      S.afternoon,
    ],
    [
      S.afternoon,
      S.evening,
      S.afternoon,
      S.morning,
      S.afternoon,
      S.afternoon,
      S.evening,
      S.afternoon,
      S.morning,
      S.afternoon,
    ],
  ]

  const newTrainerCodes = Array.from(
    { length: 15 },
    (_, i) => `STF-PT-${String(3 + i).padStart(3, '0')}`
  )
  const newStaffCodes = Array.from(
    { length: 15 },
    (_, i) => `STF-STA-${String(2 + i).padStart(3, '0')}`
  )

  const trainers = await prisma.staff.findMany({
    where: { staffCode: { in: newTrainerCodes } },
    select: { staffId: true, staffCode: true },
    orderBy: { staffCode: 'asc' },
  })
  const staffMembers = await prisma.staff.findMany({
    where: { staffCode: { in: newStaffCodes } },
    select: { staffId: true, staffCode: true },
    orderBy: { staffCode: 'asc' },
  })

  const scheduleData: { staffId: bigint; shift: StaffShift; workDate: Date }[] = []

  // Trainer patterns (grouped by 5):
  // Pattern 0 (ti 0-4): all 11 dates, Mon/Wed/Fri=afternoon, Tue/Thu/Sat=morning
  // Pattern 1 (ti 5-9): skip Sat, Mon/Wed/Fri=afternoon, Tue/Thu=morning
  // Pattern 2 (ti 10-14): skip Fri+Sat, Mon/Wed=afternoon, Tue/Thu=morning
  for (let ti = 0; ti < trainers.length; ti++) {
    const { staffId } = trainers[ti]
    const pattern = Math.floor(ti / 5)
    for (let di = 0; di < SCHEDULE_DATES.length; di++) {
      const dow = DATE_DOW[di]
      if (pattern >= 1 && dow === 6) continue
      if (pattern === 2 && dow === 5) continue
      // Odd DOW (Mon=1, Wed=3, Fri=5) → afternoon; even (Tue=2, Thu=4, Sat=6) → morning
      const shift = dow % 2 === 1 ? S.afternoon : S.morning
      scheduleData.push({ staffId, shift, workDate: SCHEDULE_DATES[di] })
    }
  }

  // Staff: Mon-Fri only (skip Sat at date index 5)
  const WEEKDAY_DI = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10]
  for (let si = 0; si < staffMembers.length; si++) {
    const { staffId } = staffMembers[si]
    const seq = STAFF_SHIFT_SEQUENCES[si]
    for (let k = 0; k < WEEKDAY_DI.length; k++) {
      scheduleData.push({ staffId, shift: seq[k], workDate: SCHEDULE_DATES[WEEKDAY_DI[k]] })
    }
  }

  await prisma.staffSchedule.createMany({ data: scheduleData })
  console.log(`[seed] seeded ${scheduleData.length} new staff schedules`)
}
