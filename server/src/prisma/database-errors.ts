import { Prisma } from '@prisma/client'

const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])

export function databaseErrorCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code
  if (error instanceof Prisma.PrismaClientInitializationError) return error.errorCode

  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/\b(P\d{4}|ECONNRESET|ECONNREFUSED|ETIMEDOUT)\b/i)
  return match?.[1]?.toUpperCase()
}

export function isTransientDatabaseError(error: unknown): boolean {
  const code = databaseErrorCode(error)
  if (code && TRANSIENT_CODES.has(code)) return true

  const message = error instanceof Error ? error.message : String(error)
  return /connection reset|connection closed|socket hang up|econnreset|econnrefused|etimedout|can't reach database server|database server.*timed out/i.test(
    message,
  )
}
