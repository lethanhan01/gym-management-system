import { PaymentMethod } from '@prisma/client'
import { prisma } from './client'

export async function seedPaymentAccounts(): Promise<void> {
  type AccountEntry = {
    memberCode: string
    type: PaymentMethod
    provider?: string
    accountRef?: string
    label?: string
    isDefault: boolean
  }

  const entries: AccountEntry[] = [
    {
      memberCode: 'MB-2026-0001',
      type: PaymentMethod.ewallet,
      provider: 'MoMo',
      accountRef: '0901234567',
      label: 'Vi MoMo ca nhan',
      isDefault: true,
    },
    {
      memberCode: 'MB-2026-0002',
      type: PaymentMethod.bank_card,
      provider: 'Vietcombank',
      accountRef: '1234567890',
      label: 'The Vietcombank',
      isDefault: true,
    },
    {
      memberCode: 'MB-2026-0002',
      type: PaymentMethod.ewallet,
      provider: 'ZaloPay',
      accountRef: '0912345678',
      label: 'Vi ZaloPay',
      isDefault: false,
    },
    {
      memberCode: 'MB-2026-0003',
      type: PaymentMethod.ewallet,
      provider: 'MoMo',
      accountRef: '0923456789',
      label: 'Vi MoMo',
      isDefault: true,
    },
    {
      memberCode: 'MB-2026-0003',
      type: PaymentMethod.bank_card,
      provider: 'Techcombank',
      accountRef: '9876543210',
      label: 'The Techcombank',
      isDefault: false,
    },
    {
      memberCode: 'MB-2026-0005',
      type: PaymentMethod.bank_card,
      provider: 'BIDV',
      accountRef: '1111222233',
      label: 'The BIDV',
      isDefault: true,
    },
    {
      memberCode: 'MB-2026-0007',
      type: PaymentMethod.bank_card,
      provider: 'VPBank',
      accountRef: '4444555566',
      label: 'The VPBank',
      isDefault: true,
    },
    {
      memberCode: 'MB-2026-0008',
      type: PaymentMethod.ewallet,
      provider: 'MoMo',
      accountRef: '0934567890',
      label: 'Vi MoMo',
      isDefault: true,
    },
    {
      memberCode: 'MB-2026-0009',
      type: PaymentMethod.ewallet,
      provider: 'ZaloPay',
      accountRef: '0945678901',
      label: 'Vi ZaloPay',
      isDefault: true,
    },
    {
      memberCode: 'MB-2026-0010',
      type: PaymentMethod.bank_card,
      provider: 'ACB',
      accountRef: '7777888899',
      label: 'The ACB',
      isDefault: true,
    },
  ]

  const memberCodes = [...new Set(entries.map((e) => e.memberCode))]
  const members = await prisma.member.findMany({
    where: { memberCode: { in: memberCodes } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))

  await prisma.paymentAccount.createMany({
    data: entries.map((a) => ({
      memberId: mMap.get(a.memberCode)!,
      type: a.type,
      provider: a.provider,
      accountRef: a.accountRef,
      label: a.label,
      isDefault: a.isDefault,
    })),
  })
  console.log(`[seed] seeded ${entries.length} payment accounts`)
}
