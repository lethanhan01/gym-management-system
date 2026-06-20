import { StaffShift } from '@prisma/client'
import { prisma } from './client'

// Tính checkIn/checkOut theo ca và ngày làm việc (workDate lưu dạng DATE → UTC midnight)
function shiftTimes(
  workDate: Date,
  shift: StaffShift,
  overtime: boolean,
): { checkIn: Date; checkOut: Date } {
  const y = workDate.getUTCFullYear()
  const m = String(workDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(workDate.getUTCDate()).padStart(2, '0')
  const vnDate = `${y}-${m}-${d}`

  // Ca sáng 07:00-12:00, ca chiều 12:00-17:00, ca tối 17:00-22:00
  if (shift === StaffShift.morning) {
    return {
      checkIn: new Date(`${vnDate}T07:00:00+07:00`),
      checkOut: overtime
        ? new Date(`${vnDate}T13:00:00+07:00`)
        : new Date(`${vnDate}T12:00:00+07:00`),
    }
  }
  if (shift === StaffShift.afternoon) {
    return {
      checkIn: new Date(`${vnDate}T12:00:00+07:00`),
      checkOut: overtime
        ? new Date(`${vnDate}T18:00:00+07:00`)
        : new Date(`${vnDate}T17:00:00+07:00`),
    }
  }
  // evening 17:00-22:00
  return {
    checkIn: new Date(`${vnDate}T17:00:00+07:00`),
    checkOut: overtime
      ? new Date(`${vnDate}T23:00:00+07:00`)
      : new Date(`${vnDate}T22:00:00+07:00`),
  }
}

export async function seedStaffAttendanceLogs(): Promise<void> {
  await prisma.staffAttendanceLog.deleteMany()

  const staffList = await prisma.staff.findMany({
    where: { deletedAt: null, NOT: { position: 'trainer' } },
    orderBy: { staffCode: 'asc' },
  })

  const records: { staffId: bigint; checkIn: Date; checkOut: Date }[] = []

  for (let i = 0; i < staffList.length; i++) {
    const staff = staffList[i]
    // Lấy toàn bộ schedule (mọi tháng) của staff này
    const schedules = await prisma.staffSchedule.findMany({
      where: {
        staffId: staff.staffId,
        deletedAt: null,
      },
      orderBy: { workDate: 'asc' },
    })

    if (schedules.length === 0) continue

    const group = i % 5

    for (let j = 0; j < schedules.length; j++) {
      const sch = schedules[j]

      // Group 4: không tạo log → 0% hiệu suất
      if (group === 4) continue

      // Group 2: giữ 3/5 ca → ~60%
      if (group === 2 && j % 5 >= 3) continue

      // Group 3: giữ mỗi ca thứ 3 → ~33%
      if (group === 3 && j % 3 !== 0) continue

      const overtime = group === 0
      const { checkIn, checkOut } = shiftTimes(sch.workDate, sch.shift, overtime)
      records.push({ staffId: sch.staffId, checkIn, checkOut })
    }
  }

  await prisma.staffAttendanceLog.createMany({ data: records })
  console.log(`[seed] seeded ${records.length} staff attendance logs`)
}
