import { SubscriptionStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { prisma } from './client'
import { addDays, formatYMD } from './helpers'
import { TRAINER_MINH_MEMBER_CODES } from './users'
import { NEW_PKG_DETAILS } from './packages'

let txnSeq = 1
function nextTxnRef(date: Date): string {
  return `TXN-${formatYMD(date)}-${String(txnSeq++).padStart(4, '0')}`
}

export async function seedSubscriptionsAndPayments(pkgMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where: {
      memberCode: {
        in: [
          'MB-2026-0001',
          'MB-2026-0002',
          'MB-2026-0003',
          'MB-2026-0004',
          'MB-2026-0005',
          'MB-2026-0006',
          ...TRAINER_MINH_MEMBER_CODES,
        ],
      },
    },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))

  type SubEntry = {
    memberCode: string
    pkgCode: string
    startDate: Date
    endDate: Date
    status: SubscriptionStatus
    cancelledAt?: Date
    payment?: { paidAt: Date; method: PaymentMethod; amount: number }
  }
  const subData: SubEntry[] = [
    {
      memberCode: 'MB-2026-0001',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-08-28'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-03-01T10:30:00'),
        method: PaymentMethod.cash,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0002',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-05-05'),
      endDate: new Date('2026-07-04'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-05T14:00:00'),
        method: PaymentMethod.bank_card,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0003',
      pkgCode: 'PKG-0003',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-07-13'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-01-15T09:00:00'),
        method: PaymentMethod.ewallet,
        amount: 2000000,
      },
    },
    {
      memberCode: 'MB-2026-0004',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      status: SubscriptionStatus.pending,
    },
    {
      memberCode: 'MB-2026-0005',
      pkgCode: 'PKG-0002',
      startDate: new Date('2025-11-15'),
      endDate: new Date('2026-02-12'),
      status: SubscriptionStatus.expired,
      payment: {
        paidAt: new Date('2025-11-15T11:00:00'),
        method: PaymentMethod.cash,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0006',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-03-02'),
      status: SubscriptionStatus.cancelled,
      cancelledAt: new Date('2026-02-15T10:00:00'),
      payment: {
        paidAt: new Date('2026-02-01T15:00:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0007',
      pkgCode: 'PKG-0003',
      startDate: new Date('2026-04-20'),
      endDate: new Date('2026-10-16'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-04-20T09:15:00'),
        method: PaymentMethod.bank_card,
        amount: 2000000,
      },
    },
    {
      memberCode: 'MB-2026-0008',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-04-25'),
      endDate: new Date('2026-07-23'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-04-25T10:30:00'),
        method: PaymentMethod.ewallet,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0009',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-07-04'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-06-05T08:45:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0010',
      pkgCode: 'PKG-0004',
      startDate: new Date('2026-05-08'),
      endDate: new Date('2027-05-07'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-08T15:00:00'),
        method: PaymentMethod.bank_card,
        amount: 3500000,
      },
    },
    {
      memberCode: 'MB-2026-0011',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-05-15'),
      endDate: new Date('2026-08-12'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-15T11:20:00'),
        method: PaymentMethod.cash,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0012',
      pkgCode: 'PKG-0003',
      startDate: new Date('2026-05-22'),
      endDate: new Date('2026-11-17'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-22T17:10:00'),
        method: PaymentMethod.ewallet,
        amount: 2000000,
      },
    },
    {
      memberCode: 'MB-2026-0013',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-05-28'),
      endDate: new Date('2026-06-26'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-28T07:50:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0014',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-29'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-06-01T13:40:00'),
        method: PaymentMethod.bank_card,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0015',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-07-04'),
      status: SubscriptionStatus.pending,
    },
    {
      memberCode: 'MB-2026-0016',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-30'),
      status: SubscriptionStatus.expired,
      payment: {
        paidAt: new Date('2026-04-01T16:30:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0003',
      pkgCode: 'PKG-0001',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-11-30'),
      status: SubscriptionStatus.expired,
      payment: {
        paidAt: new Date('2025-11-01T09:00:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
  ]

  let paymentCount = 0
  for (const s of subData) {
    const sub = await prisma.subscription.create({
      data: {
        memberId: mMap.get(s.memberCode)!,
        packageId: pkgMap.get(s.pkgCode)!,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        cancelledAt: s.cancelledAt,
      },
    })
    if (s.payment) {
      await prisma.payment.create({
        data: {
          memberId: mMap.get(s.memberCode)!,
          subscriptionId: sub.subscriptionId,
          amount: s.payment.amount,
          method: s.payment.method,
          status: PaymentStatus.success,
          transactionReference: nextTxnRef(s.payment.paidAt),
          paidAt: s.payment.paidAt,
        },
      })
      paymentCount++
    }
  }
  console.log(`[seed] seeded ${subData.length} subscriptions + ${paymentCount} payments`)
}

export async function seedNewSubscriptionsAndPayments(pkgMap: Map<string, bigint>): Promise<void> {
  const PAYMENT_METHODS = [PaymentMethod.cash, PaymentMethod.bank_card, PaymentMethod.ewallet]
  let txnCounter = 1
  let subCount = 0
  let payCount = 0

  type PaymentCreate = {
    memberId: bigint
    subscriptionId: bigint
    amount: number
    method: PaymentMethod
    status: PaymentStatus
    transactionReference: string
    paidAt: Date
  }
  const payments: PaymentCreate[] = []

  async function createSubWithPayment(
    memberId: bigint,
    pkgCode: string,
    startDate: Date,
    status: SubscriptionStatus,
    trainerId: bigint | null,
    cancelledAt: Date | null,
    methodIdx: number
  ): Promise<void> {
    const pkg = NEW_PKG_DETAILS[pkgCode]
    const endDate = addDays(startDate, pkg.durationDays - 1)
    const sub = await prisma.subscription.create({
      data: {
        memberId,
        packageId: pkgMap.get(pkgCode)!,
        trainerId: trainerId ?? undefined,
        startDate,
        endDate,
        status,
        cancelledAt: cancelledAt ?? undefined,
      },
    })
    subCount++
    if (status !== SubscriptionStatus.pending) {
      const paidAt = startDate
      const txnRef = `TXN-${formatYMD(paidAt)}-${String(txnCounter).padStart(4, '0')}`
      txnCounter++
      payments.push({
        memberId,
        subscriptionId: sub.subscriptionId,
        amount: pkg.price,
        method: PAYMENT_METHODS[methodIdx % 3],
        status: PaymentStatus.success,
        transactionReference: txnRef,
        paidAt,
      })
      payCount++
    }
  }

  // PT members: MB-2026-0017..0056 (40 members, indices 0-39)
  const ptMemberCodes = Array.from(
    { length: 40 },
    (_, i) => `MB-2026-${String(17 + i).padStart(4, '0')}`
  )
  const ptMembers = await prisma.member.findMany({
    where: { memberCode: { in: ptMemberCodes } },
    select: { memberId: true, memberCode: true, primaryTrainerId: true },
    orderBy: { memberCode: 'asc' },
  })

  // Non-PT members: MB-2026-0057..0086 (30 members, indices 40-69)
  const nonPtMemberCodes = Array.from(
    { length: 30 },
    (_, i) => `MB-2026-${String(57 + i).padStart(4, '0')}`
  )
  const nonPtMembers = await prisma.member.findMany({
    where: { memberCode: { in: nonPtMemberCodes } },
    select: { memberId: true, memberCode: true },
    orderBy: { memberCode: 'asc' },
  })

  const PT_PKG_CODES = ['PKG-0006', 'PKG-0007', 'PKG-0008']
  const PT_START_DATES = [new Date('2026-05-20'), new Date('2026-04-15'), new Date('2026-02-01')]
  const EXP_PKG_CODES = ['PKG-0001', 'PKG-0002']
  const EXP_START_DATES = [new Date('2026-02-01'), new Date('2026-01-15')]
  const ACTIVE_PKG_CODES = ['PKG-0001', 'PKG-0002', 'PKG-0003', 'PKG-0004']
  const ACTIVE_START_DATES = [
    new Date('2026-05-20'),
    new Date('2026-03-20'),
    new Date('2026-01-15'),
    new Date('2026-01-01'),
  ]
  const NON_EXP_PKG_CODES = ['PKG-0001', 'PKG-0002']
  const NON_EXP_START_DATES = [new Date('2026-03-01'), new Date('2026-02-01')]

  // 40 PT members: 1 active PT subscription each
  for (let i = 0; i < ptMembers.length; i++) {
    const m = ptMembers[i]
    await createSubWithPayment(
      m.memberId,
      PT_PKG_CODES[i % 3],
      PT_START_DATES[i % 3],
      SubscriptionStatus.active,
      m.primaryTrainerId,
      null,
      i
    )
  }

  // First 10 PT members: also 1 expired non-PT subscription
  for (let i = 0; i < 10; i++) {
    const m = ptMembers[i]
    await createSubWithPayment(
      m.memberId,
      EXP_PKG_CODES[i % 2],
      EXP_START_DATES[i % 2],
      SubscriptionStatus.expired,
      null,
      null,
      i + 40
    )
  }

  // Non-PT members 0-19: active subscriptions
  for (let j = 0; j < 20; j++) {
    const m = nonPtMembers[j]
    await createSubWithPayment(
      m.memberId,
      ACTIVE_PKG_CODES[j % 4],
      ACTIVE_START_DATES[j % 4],
      SubscriptionStatus.active,
      null,
      null,
      j + 50
    )
  }

  // Non-PT members 20-24: expired subscriptions
  for (let k = 0; k < 5; k++) {
    const m = nonPtMembers[20 + k]
    await createSubWithPayment(
      m.memberId,
      NON_EXP_PKG_CODES[k % 2],
      NON_EXP_START_DATES[k % 2],
      SubscriptionStatus.expired,
      null,
      null,
      k + 70
    )
  }

  // Non-PT members 25-27: cancelled subscriptions
  for (let l = 0; l < 3; l++) {
    const m = nonPtMembers[25 + l]
    await createSubWithPayment(
      m.memberId,
      'PKG-0001',
      new Date('2026-04-01'),
      SubscriptionStatus.cancelled,
      null,
      new Date('2026-04-15'),
      l + 75
    )
  }

  // Non-PT members 28-29: pending subscriptions (no payment)
  for (let p = 0; p < 2; p++) {
    const m = nonPtMembers[28 + p]
    const startDate = new Date('2026-06-10')
    const endDate = addDays(startDate, NEW_PKG_DETAILS['PKG-0002'].durationDays - 1)
    await prisma.subscription.create({
      data: {
        memberId: m.memberId,
        packageId: pkgMap.get('PKG-0002')!,
        startDate,
        endDate,
        status: SubscriptionStatus.pending,
      },
    })
    subCount++
  }

  await prisma.payment.createMany({ data: payments })
  console.log(`[seed] seeded ${subCount} new subscriptions, ${payCount} new payments`)
}
