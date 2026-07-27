import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { databaseErrorCode } from './database-errors'

/**
 * Khong goi $connect trong constructor de server van bind duoc port
 * khi PostgreSQL tam thoi khong san sang (health tra ve db: down).
 * Prisma tu dong ket noi khi co query dau tien.
 *
 * onModuleInit chay probe SELECT 1 de phat hien credentials sai som.
 * P1000 (sai credentials) -> fail fast, exit process.
 * P1001/P1002 (network/timeout) -> log warning, tiep tuc (transient).
 */
export type DatabaseHealth = {
  status: 'healthy' | 'degraded'
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastErrorCode: string | null
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private reconnectPromise?: Promise<boolean>
  private health: DatabaseHealth = {
    status: 'degraded',
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorCode: null,
  }

  constructor() {
    super({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    })
  }

  async onModuleInit(): Promise<void> {
    const isHealthy = await this.probe('startup')
    if (!isHealthy) {
      const err = this.health.lastErrorCode
      const isAuthFailure =
        err === 'P1000'

      if (isAuthFailure) {
        this.logger.error(
          'DATABASE_AUTH_FAILED: Invalid database credentials. Check DATABASE_URL in .env. Exiting.'
        )
        process.exit(1)
      }

    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }

  getHealth(): DatabaseHealth {
    return { ...this.health }
  }

  async probe(source = 'health'): Promise<boolean> {
    const startedAt = Date.now()
    try {
      await this.$queryRaw`SELECT 1`
      this.recordSuccess(source, Date.now() - startedAt)
      return true
    } catch (error) {
      this.recordFailure(source, error, Date.now() - startedAt)
      return false
    }
  }

  async recoverConnection(): Promise<boolean> {
    if (!this.reconnectPromise) {
      this.reconnectPromise = this.reconnect().finally(() => {
        this.reconnectPromise = undefined
      })
    }
    return this.reconnectPromise
  }

  logRetry(method: string, route: string, attempt: number, reconnectMs: number): void {
    this.logEvent('db_retry', { method, route, attempt, reconnectMs })
  }

  private async reconnect(): Promise<boolean> {
    const startedAt = Date.now()
    this.logEvent('db_reconnect', { phase: 'started' })
    try {
      await this.$disconnect()
      await this.$connect()
      const healthy = await this.probe('reconnect')
      this.logEvent('db_reconnect', { phase: healthy ? 'succeeded' : 'failed', durationMs: Date.now() - startedAt })
      return healthy
    } catch (error) {
      this.recordFailure('reconnect', error, Date.now() - startedAt)
      this.logEvent('db_reconnect', {
        phase: 'failed',
        durationMs: Date.now() - startedAt,
        code: databaseErrorCode(error) ?? 'UNKNOWN',
      })
      return false
    }
  }

  private recordSuccess(source: string, durationMs: number): void {
    const changed = this.health.status !== 'healthy'
    this.health = {
      status: 'healthy',
      lastSuccessAt: new Date().toISOString(),
      lastFailureAt: this.health.lastFailureAt,
      lastErrorCode: null,
    }
    if (changed || source === 'startup') {
      this.logEvent('db_probe', { source, status: 'healthy', durationMs })
    }
  }

  private recordFailure(source: string, error: unknown, durationMs: number): void {
    const code = databaseErrorCode(error) ?? 'UNKNOWN'
    const changed = this.health.status !== 'degraded'
    this.health = {
      status: 'degraded',
      lastSuccessAt: this.health.lastSuccessAt,
      lastFailureAt: new Date().toISOString(),
      lastErrorCode: code,
    }
    if (changed || source === 'startup') {
      this.logEvent('db_probe', { source, status: 'degraded', code, durationMs })
    }
  }

  private logEvent(event: string, data: Record<string, unknown>): void {
    this.logger.log(JSON.stringify({ event, connectionMode: process.env.DB_CONNECTION_MODE, ...data }))
  }
}
