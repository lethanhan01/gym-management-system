import { PrismaClient } from '@prisma/client'
import { normalizeEmail } from '../src/common/normalization'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

async function main() {
  const users = await prisma.user.findMany({ select: { userId: true, email: true, emailNormalized: true } })
  const collisions = new Map<string, string[]>()
  for (const user of users) {
    const normalized = normalizeEmail(user.email)
    const same = collisions.get(normalized) ?? []
    same.push(user.userId.toString())
    collisions.set(normalized, same)
  }
  const duplicates = [...collisions.entries()].filter(([, ids]) => ids.length > 1)
  if (duplicates.length > 0) {
    console.error('Không thể backfill emailNormalized do collision:')
    for (const [email, ids] of duplicates) console.error(`- ${email}: user IDs ${ids.join(', ')}`)
    process.exitCode = 1
    return
  }
  if (!apply) {
    console.log(`Preflight OK: ${users.length} users. Chạy với --apply để backfill.`)
    return
  }
  await prisma.$transaction(users.map((user) => prisma.user.update({
    where: { userId: user.userId }, data: { emailNormalized: normalizeEmail(user.email) },
  })))
  console.log(`Đã backfill emailNormalized cho ${users.length} users.`)
}

main().finally(() => prisma.$disconnect())
