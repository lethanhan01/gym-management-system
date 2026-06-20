import type { Prisma } from '@prisma/client'

type Caller = {
  userId: bigint
  roles: string[]
  staffId?: bigint
  memberId?: bigint
}

export interface ICallerQueryFilter {
  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void
}

export class MemberCallerQueryFilter implements ICallerQueryFilter {
  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void {
    if (caller.memberId) {
      where.memberId = caller.memberId
    }
  }
}

export class TrainerCallerQueryFilter implements ICallerQueryFilter {
  constructor(private readonly requestedMemberId?: bigint) {}

  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void {
    if (caller.staffId) {
      where.trainerStaffId = caller.staffId
    }
    if (this.requestedMemberId) {
      where.memberId = this.requestedMemberId
    }
  }
}

export class AdminCallerQueryFilter implements ICallerQueryFilter {
  constructor(
    private readonly requestedMemberId?: bigint,
    private readonly requestedStaffId?: bigint,
  ) {}

  apply(where: Prisma.TrainingSessionWhereInput, _caller: Caller): void {
    if (this.requestedMemberId) where.memberId = this.requestedMemberId
    if (this.requestedStaffId) where.trainerStaffId = this.requestedStaffId
  }
}

export function resolveCallerFilter(
  caller: Caller,
  memberId?: string,
  trainerStaffId?: string,
): ICallerQueryFilter {
  const memberIdBig = memberId ? BigInt(memberId) : undefined
  const staffIdBig = trainerStaffId ? BigInt(trainerStaffId) : undefined

  const isMemberOnly =
    caller.roles.includes('member') &&
    !caller.roles.some((r) => ['owner', 'staff', 'trainer'].includes(r))
  const isTrainerOnly =
    caller.roles.includes('trainer') &&
    !caller.roles.some((r) => ['owner', 'staff'].includes(r))

  if (isMemberOnly) return new MemberCallerQueryFilter()
  if (isTrainerOnly) return new TrainerCallerQueryFilter(memberIdBig)
  return new AdminCallerQueryFilter(memberIdBig, staffIdBig)
}
