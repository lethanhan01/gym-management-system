import { FeedbackType, FeedbackSeverity, FeedbackStatus } from '@prisma/client'
import { prisma } from './client'

export async function seedFeedback(equipMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where: { memberCode: { in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0003', 'MB-2026-0005'] } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffList = await prisma.staff.findMany({
    where: { staffCode: { in: ['STF-STA-001', 'STF-PT-001'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))

  await prisma.feedback.deleteMany({})
  for (const fb of [
    {
      memberId: mMap.get('MB-2026-0001')!,
      feedbackType: FeedbackType.service,
      content:
        'Phong tap sach se, nhan vien than thien. De nghi mo them gio buoi toi (sau 21:00) de phu hop voi lich lam viec cua hoi vien.',
      severity: FeedbackSeverity.low,
      status: FeedbackStatus.resolved,
      handledByStaffId: sMap.get('STF-STA-001')!,
      handledAt: new Date('2026-03-10T11:00:00'),
      createdAt: new Date('2026-03-08T18:00:00'),
    },
    {
      memberId: mMap.get('MB-2026-0002')!,
      feedbackType: FeedbackType.equipment,
      content:
        'May ep nguc khu vuc ta may bi tieng keu bat thuong khi su dung. Toi khong dam dung vi lo ngai mat an toan.',
      severity: FeedbackSeverity.medium,
      status: FeedbackStatus.in_progress,
      subjectEquipmentId: equipMap.get('EQP-W002')!,
      handledByStaffId: sMap.get('STF-STA-001')!,
      handledAt: new Date('2026-05-21T09:00:00'),
      createdAt: new Date('2026-05-20T19:30:00'),
    },
    {
      memberId: mMap.get('MB-2026-0003')!,
      feedbackType: FeedbackType.staff,
      content:
        'PT Minh rat nhiet tinh va chuyen nghiep. Giao trinh phu hop trinh do, toi cam thay tien bo ro rang sau 2 thang tap.',
      severity: FeedbackSeverity.low,
      status: FeedbackStatus.open,
      subjectStaffId: sMap.get('STF-PT-001')!,
      createdAt: new Date('2026-05-25T20:00:00'),
    },
    {
      memberId: mMap.get('MB-2026-0005')!,
      feedbackType: FeedbackType.service,
      content:
        'Yeu cau hoan tien thang 4 vi ly do ca nhan, khong phu hop voi chinh sach hoan tien cua phong tap.',
      severity: FeedbackSeverity.medium,
      status: FeedbackStatus.rejected,
      handledByStaffId: sMap.get('STF-STA-001')!,
      handledAt: new Date('2026-05-02T10:30:00'),
      createdAt: new Date('2026-04-28T19:00:00'),
    },
  ]) {
    await prisma.feedback.create({ data: fb })
  }
  console.log('[seed] seeded 4 feedback entries')
}
