import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const p = new PrismaClient()
const users = await p.user.findMany({ select: { email: true, passwordHash: true, status: true }, take: 10 })
console.log('--- Users in DB ---')
for (const u of users) {
  console.log(u.email, '|', u.status, '|', u.passwordHash ? u.passwordHash.substring(0, 10) + '...' : 'NULL')
}

// Test bcrypt verify for the first user that has a hash
const testUser = users.find(u => u.passwordHash)
if (testUser) {
  const ok = await bcrypt.compare('Password123!', testUser.passwordHash)
  console.log(`\nbcrypt.compare('Password123!', hash of ${testUser.email}):`, ok)
}

await p.$disconnect()
