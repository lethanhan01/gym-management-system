import { PrismaClient } from '@prisma/client'
import { synchronizeSystemRbac } from '../src/rbac/system-rbac-sync'

async function main(): Promise<void> {
  const prisma = new PrismaClient()

  try {
    const report = await synchronizeSystemRbac(prisma)
    // eslint-disable-next-line no-console
    console.log('[sync:rbac] completed:', JSON.stringify(report))
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[sync:rbac] failed:', error)
  process.exitCode = 1
})
