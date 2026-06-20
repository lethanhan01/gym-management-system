import { PackageStatus } from '@prisma/client'
import { prisma } from './client'

const PACKAGES_DATA = [
  {
    packageCode: 'PKG-0001',
    name: 'Goi Co Ban 1 Thang',
    durationDays: 30,
    price: 500000,
    benefits: 'Tap tu do tat ca may, phong va gio mo cua',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0002',
    name: 'Goi Tieu Chuan 3 Thang',
    durationDays: 90,
    price: 1200000,
    benefits: 'Tap tu do + 1 buoi tham van PT + tu giu do ca nhan',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0003',
    name: 'Goi Cao Cap 6 Thang',
    durationDays: 180,
    price: 2000000,
    benefits: 'Tap tu do + 4 buoi PT mien phi + tu giu do + nuoc uong',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0004',
    name: 'Goi Premium 1 Nam',
    durationDays: 365,
    price: 3500000,
    benefits: 'Tap tu do + 12 buoi PT + tu giu do + ao dong phuc + nuoc uong',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0005',
    name: 'Goi PT Ca Nhan 1 Thang',
    durationDays: 30,
    price: 1500000,
    benefits: '8 buoi tap 1-1 voi PT ca nhan, phan tich co the mien phi',
    includesPt: true,
    status: PackageStatus.inactive,
  },
]

export const NEW_PKG_DETAILS: Record<string, { durationDays: number; price: number }> = {
  'PKG-0001': { durationDays: 30, price: 500_000 },
  'PKG-0002': { durationDays: 90, price: 1_200_000 },
  'PKG-0003': { durationDays: 180, price: 2_000_000 },
  'PKG-0004': { durationDays: 365, price: 3_500_000 },
  'PKG-0006': { durationDays: 30, price: 1_500_000 },
  'PKG-0007': { durationDays: 90, price: 3_800_000 },
  'PKG-0008': { durationDays: 180, price: 6_500_000 },
}

export async function seedPackages(): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>()
  for (const p of PACKAGES_DATA) {
    const row = await prisma.package.upsert({
      where: { packageCode: p.packageCode },
      update: {
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        benefits: p.benefits,
        includesPt: p.includesPt ?? false,
        status: p.status,
      },
      create: {
        packageCode: p.packageCode,
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        benefits: p.benefits,
        includesPt: p.includesPt ?? false,
        status: p.status,
      },
    })
    map.set(p.packageCode, row.packageId)
  }
  console.log(`[seed] seeded ${PACKAGES_DATA.length} packages`)
  return map
}

export async function seedNewPackages(): Promise<Map<string, bigint>> {
  const pkgs = [
    {
      packageCode: 'PKG-0006',
      name: 'Gói PT Cá Nhân 1 Tháng',
      durationDays: 30,
      price: 1_500_000,
      includesPt: true,
      status: PackageStatus.active,
    },
    {
      packageCode: 'PKG-0007',
      name: 'Gói PT Cá Nhân 3 Tháng',
      durationDays: 90,
      price: 3_800_000,
      includesPt: true,
      status: PackageStatus.active,
    },
    {
      packageCode: 'PKG-0008',
      name: 'Gói PT Cá Nhân 6 Tháng',
      durationDays: 180,
      price: 6_500_000,
      includesPt: true,
      status: PackageStatus.active,
    },
  ]
  const pkgMap = new Map<string, bigint>()
  for (const pkg of pkgs) {
    const row = await prisma.package.upsert({
      where: { packageCode: pkg.packageCode },
      update: {},
      create: pkg,
    })
    pkgMap.set(pkg.packageCode, row.packageId)
  }
  console.log(`[seed] seeded ${pkgs.length} new packages (PKG-0006..PKG-0008)`)
  return pkgMap
}
