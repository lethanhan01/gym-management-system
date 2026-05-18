import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/**
 * Khong goi $connect trong onModuleInit de server van bind duoc port
 * khi PostgreSQL tam thoi khong san sang (health tra ve db: down).
 * Prisma tu dong ket noi khi co query dau tien.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'production'
          ? ['error']
          : ['warn', 'error'],
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
