import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { getRuntimeDatabaseUrl } from './database-url'

/**
 * Khong goi $connect trong constructor de server van bind duoc port
 * khi PostgreSQL tam thoi khong san sang (health tra ve db: down).
 * Prisma tu dong ket noi khi co query dau tien.
 *
 * onModuleInit chay probe SELECT 1 de phat hien credentials sai som.
 * P1000 (sai credentials) -> fail fast, exit process.
 * P1001/P1002 (network/timeout) -> log warning, tiep tuc (transient).
 */
// Khoang cach keepalive: 4 phut ngan Supabase Transaction pooler dong ket noi idle.
// Supabase client_idle_timeout mac dinh ~600s; ping moi 240s dam bao connection song.
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private keepaliveTimer?: ReturnType<typeof setInterval>

  constructor() {
    super({
      datasourceUrl: getRuntimeDatabaseUrl(),
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    })
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$queryRaw`SELECT 1`
      this.logger.log('Database connection verified')
    } catch (err) {
      const isAuthFailure =
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1000') ||
        (err instanceof Prisma.PrismaClientInitializationError &&
          err.message.includes('Authentication failed'))

      if (isAuthFailure) {
        this.logger.error(
          'DATABASE_AUTH_FAILED: Invalid database credentials. Check DATABASE_URL in .env. Exiting.'
        )
        process.exit(1)
      }

      // P1001/P1002/P1008 va cac loi transient khac: log warning, van cho server chay
      const code = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : 'UNKNOWN'
      this.logger.warn(
        `Database probe failed (${code}): server will continue but DB may be unavailable`
      )
    }

    this.keepaliveTimer = setInterval(async () => {
      try {
        await this.$queryRaw`SELECT 1`
      } catch {
        // loi transient se bi bat o query thuc — khong log de tranh noise
      }
    }, KEEPALIVE_INTERVAL_MS)
  }

  async onModuleDestroy(): Promise<void> {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer)
    }
    await this.$disconnect()
  }
}
