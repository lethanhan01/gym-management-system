import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TrainingCaller } from './training.types'
@Injectable()
export class TrainingCallerResolverService {
  constructor(private readonly prisma: PrismaService) {}
  async resolveStaffId(caller: TrainingCaller): Promise<bigint | null> { if (caller.staffId) return caller.staffId; const staff = await this.prisma.staff.findFirst({ where: { userId: caller.userId, deletedAt: null }, select: { staffId: true } }); return staff?.staffId ?? null }
  async resolveMemberId(caller: TrainingCaller): Promise<bigint | null> { if (caller.memberId) return caller.memberId; const member = await this.prisma.member.findFirst({ where: { userId: caller.userId, deletedAt: null }, select: { memberId: true } }); return member?.memberId ?? null }
  isOwnerOrStaff(caller: TrainingCaller) { return caller.roles.some(role => role === 'owner' || role === 'staff') }
  isTrainerOnly(caller: TrainingCaller) { return caller.roles.includes('trainer') && !this.isOwnerOrStaff(caller) }
  isMemberOnly(caller: TrainingCaller) { return caller.roles.includes('member') && !caller.roles.includes('staff') && !caller.roles.includes('trainer') && !caller.roles.includes('owner') }
  checkSessionAccess(session: { memberId: bigint; trainerStaffId: bigint }, caller: TrainingCaller) { if (this.isOwnerOrStaff(caller)) return; if (this.isTrainerOnly(caller) && session.trainerStaffId === caller.staffId) return; if (this.isMemberOnly(caller) && session.memberId === caller.memberId) return; throw new ForbiddenException({ success: false, code: 'FORBIDDEN', message: 'Khong co quyen truy cap session nay' }) }
}
