import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function run(): Promise<void> {
  const p = new PrismaClient()
  try {
    const u1 = await p.user.findFirst({ where: { email: 'pham.thi.d@email.com' } })
    const u2 = await p.user.findFirst({ where: { email: 'owner@gym.local' } })

    const ok1 = u1?.passwordHash ? await bcrypt.compare('Password123!', u1.passwordHash) : false
    const ok2 = u2?.passwordHash ? await bcrypt.compare('Password123!', u2.passwordHash) : false

    console.log(`Member (pham.thi.d@email.com) password match: ${ok1}`)
    console.log(`Trainer (owner@gym.local) password match: ${ok2}`)

    if (!ok1 && u1) {
      const hash = await bcrypt.hash('Password123!', 10)
      await p.user.update({ where: { userId: u1.userId }, data: { passwordHash: hash } })
      console.log('✓ Reset member password to Password123!')
    }
    if (!ok2 && u2) {
      const hash = await bcrypt.hash('Password123!', 10)
      await p.user.update({ where: { userId: u2.userId }, data: { passwordHash: hash } })
      console.log('✓ Reset trainer password to Password123!')
    }
  } finally {
    await p.$disconnect()
  }
}

run()
