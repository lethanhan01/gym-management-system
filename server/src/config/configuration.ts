import {
  IsBooleanString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator'
import { plainToInstance } from 'class-transformer'

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

type DatabaseConnectionMode = 'direct' | 'supavisor-session'

/**
 * Schema validate cho process.env. Validate o thoi diem boot, fail-fast neu thieu bien.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development

  @IsOptional()
  @IsNumber()
  PORT: number = 3000

  @IsOptional()
  @IsString()
  CLIENT_URL: string = 'http://localhost:5173'

  @IsString()
  DATABASE_URL!: string

  @IsOptional()
  @IsIn(['direct', 'supavisor-session'])
  DB_CONNECTION_MODE?: DatabaseConnectionMode

  @IsString()
  JWT_SECRET!: string

  // Daily HMAC secret for member QR check-in. Falls back to JWT_SECRET when empty.
  @IsOptional()
  @IsString()
  QR_CHECKIN_SECRET?: string

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN: string = '7d'

  @IsOptional() @IsString() SMTP_HOST?: string
  @IsOptional() @IsNumber() @Min(1) @Max(65535) SMTP_PORT?: number
  @IsOptional() @IsString() SMTP_USER?: string
  @IsOptional() @IsString() SMTP_PASS?: string
  @IsOptional() @IsEmail() SMTP_FROM?: string
  @IsOptional() @IsString() DEMO_MASTER_OTP?: string

  // UC05B device authentication. Optional v1.0 — required khi enable real-time check-in.
  @IsOptional() @IsString() DEVICE_API_KEY?: string

  // LINE LIFF authentication. Required khi feature LINE login được bật.
  @IsOptional() @IsString() LINE_CHANNEL_ID?: string

  // LINE Messaging API. Optional v1.0 — bật bằng LINE_MESSAGING_ENABLED=true.
  @IsOptional() @IsString() LINE_CHANNEL_SECRET?: string
  @IsOptional() @IsString() LINE_CHANNEL_ACCESS_TOKEN?: string
  @IsOptional() @IsString() LINE_LIFF_URL?: string
  @IsOptional() @IsNumber() LINE_REMINDER_MINUTES: number = 30
  @IsOptional() @IsString() LINE_MESSAGING_ENABLED: string = 'false'
  @IsOptional() @IsIn(['vi', 'ja']) LINE_MESSAGE_LOCALE: 'vi' | 'ja' = 'vi'

  @IsOptional() @IsString() EXERCISEDB_API_KEY?: string
  @IsOptional() @IsBooleanString() EXERCISEDB_SYNC_ENABLED: string = 'false'
  @IsOptional() @IsBooleanString() EXERCISEDB_SCHEDULER_ENABLED: string = 'false'
  @IsOptional() @IsString() EXERCISEDB_SYNC_CRON: string = '0 3 * * 0'
  @IsOptional() @IsNumber() @Min(1000) EXERCISEDB_TIMEOUT_MS: number = 15000
  @IsOptional() @IsNumber() @Min(1) @Max(100) EXERCISEDB_PAGE_SIZE: number = 50
  @IsOptional() @IsNumber() @Min(1) @Max(500) EXERCISEDB_UPSERT_BATCH_SIZE: number = 50
  @IsOptional() @IsNumber() @Min(1) @Max(100000) EXERCISEDB_MIN_EXPECTED_COUNT: number = 1
  @IsOptional() @IsNumber() @Min(0) @Max(10) EXERCISEDB_RETRY_LIMIT: number = 3
  @IsOptional() @IsNumber() @Min(15) @Max(3600) EXERCISEDB_LOCK_LEASE_SECONDS: number = 300
}

export function validateConfig(raw: Record<string, unknown>): EnvironmentVariables {
  const config = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: true,
  })
  const errors = validateSync(config, { skipMissingProperties: false })
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${detail}`)
  }
  validateDatabaseConnectionConfig(config, raw)
  validateLineMessagingConfig(config)
  validateSmtpConfig(config)
  validateExerciseDbConfig(config)
  return config
}

function validateExerciseDbConfig(config: EnvironmentVariables) {
  const syncEnabled = config.EXERCISEDB_SYNC_ENABLED === 'true'
  const schedulerEnabled = config.EXERCISEDB_SCHEDULER_ENABLED === 'true'
  if (schedulerEnabled && !syncEnabled) {
    throw new Error(
      'Invalid environment configuration:\n  - EXERCISEDB_SCHEDULER_ENABLED: requires EXERCISEDB_SYNC_ENABLED=true'
    )
  }
  if (!syncEnabled) return
  if (!config.EXERCISEDB_API_KEY?.trim()) {
    throw new Error(
      'Invalid environment configuration:\n  - EXERCISEDB_API_KEY: required when EXERCISEDB_SYNC_ENABLED=true'
    )
  }
  if (schedulerEnabled && config.EXERCISEDB_SYNC_CRON.trim().split(/\s+/).length !== 5) {
    throw new Error(
      'Invalid environment configuration:\n  - EXERCISEDB_SYNC_CRON: must be a five-part cron expression'
    )
  }
}

function validateDatabaseConnectionConfig(
  config: EnvironmentVariables,
  raw: Record<string, unknown>
) {
  const requestedMode = config.DB_CONNECTION_MODE?.trim() as DatabaseConnectionMode | undefined
  if (config.NODE_ENV === NodeEnv.Production && !requestedMode) {
    throw new Error(
      'Invalid environment configuration:\n  - DB_CONNECTION_MODE: required in production (direct or supavisor-session)'
    )
  }

  // Development retains a safe IPv4-compatible default while production must
  // declare its topology explicitly.
  const mode = requestedMode ?? 'supavisor-session'
  config.DB_CONNECTION_MODE = mode

  let url: URL
  try {
    url = new URL(config.DATABASE_URL)
  } catch {
    throw new Error('Invalid environment configuration:\n  - DATABASE_URL: must be a valid URL')
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(
      'Invalid environment configuration:\n  - DATABASE_URL: must use postgres or postgresql'
    )
  }
  if (url.port !== '5432') {
    throw new Error(
      'Invalid environment configuration:\n  - DATABASE_URL: persistent connections must use port 5432; use the Supavisor Session pooler URL (or a direct URL), not the :6543 transaction pooler'
    )
  }
  if (url.searchParams.get('sslmode') !== 'require') {
    throw new Error(
      'Invalid environment configuration:\n  - DATABASE_URL: sslmode=require is required'
    )
  }
  if (url.searchParams.get('connection_limit') !== '5') {
    throw new Error(
      'Invalid environment configuration:\n  - DATABASE_URL: connection_limit=5 is required'
    )
  }
  if (url.searchParams.get('pgbouncer') === 'true') {
    throw new Error(
      'Invalid environment configuration:\n  - DATABASE_URL: pgbouncer=true is not allowed for persistent connections'
    )
  }
  if (!url.searchParams.get('application_name')?.trim()) {
    throw new Error(
      'Invalid environment configuration:\n  - DATABASE_URL: application_name is required'
    )
  }

  const isDirect = /^db\.[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)
  const isSessionPooler = url.hostname.endsWith('.pooler.supabase.com')
  if ((mode === 'direct' && !isDirect) || (mode === 'supavisor-session' && !isSessionPooler)) {
    throw new Error(
      `Invalid environment configuration:\n  - DATABASE_URL: does not match DB_CONNECTION_MODE=${mode}`
    )
  }

  // `raw` is deliberately accepted so validation remains tied to boot-time
  // environment values instead of mutating the database URL at runtime.
  void raw
}

function validateSmtpConfig(config: EnvironmentVariables) {
  const smtp = [
    ['SMTP_HOST', config.SMTP_HOST],
    ['SMTP_PORT', config.SMTP_PORT],
    ['SMTP_USER', config.SMTP_USER],
    ['SMTP_PASS', config.SMTP_PASS],
    ['SMTP_FROM', config.SMTP_FROM],
  ] as const
  const configured = smtp.some(([, value]) => value !== undefined && String(value).trim() !== '')
  const missing = smtp.filter(([, value]) => value === undefined || String(value).trim() === '')
  if (configured && missing.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${missing.map(([key]) => `  - ${key}: required when SMTP is configured`).join('\n')}`
    )
  }
  if (config.NODE_ENV === NodeEnv.Production) {
    if (missing.length > 0) {
      throw new Error(
        `Invalid environment configuration:\n${missing.map(([key]) => `  - ${key}: required in production`).join('\n')}`
      )
    }
    if (config.DEMO_MASTER_OTP?.trim()) {
      throw new Error(
        'Invalid environment configuration:\n  - DEMO_MASTER_OTP: must be empty in production'
      )
    }
  }
}

function validateLineMessagingConfig(config: EnvironmentVariables) {
  if (config.LINE_MESSAGING_ENABLED !== 'true') return

  const liffUrl = config.LINE_LIFF_URL?.trim() ?? ''
  const missing = [
    ['LINE_CHANNEL_ACCESS_TOKEN', config.LINE_CHANNEL_ACCESS_TOKEN],
    ['LINE_CHANNEL_SECRET', config.LINE_CHANNEL_SECRET],
    ['LINE_LIFF_URL', liffUrl],
  ].filter(([, value]) => typeof value !== 'string' || value.trim() === '')

  if (missing.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${missing
        .map(([key]) => `  - ${key}: required when LINE_MESSAGING_ENABLED=true`)
        .join('\n')}`
    )
  }

  let url: URL
  try {
    url = new URL(liffUrl)
  } catch {
    throw new Error('Invalid environment configuration:\n  - LINE_LIFF_URL: must be a valid URL')
  }

  if (url.hostname === 'developers.line.biz') {
    throw new Error(
      'Invalid environment configuration:\n  - LINE_LIFF_URL: must not be a LINE Developers Console URL'
    )
  }

  const liffPathSegments = url.pathname.split('/').filter(Boolean)
  let liffId = ''
  try {
    liffId = liffPathSegments[0] ? decodeURIComponent(liffPathSegments[0]).trim() : ''
  } catch {
    liffId = ''
  }
  const hasSingleLiffIdPath =
    liffPathSegments.length === 1 && url.pathname === `/${liffPathSegments[0]}`
  const hasConcreteLiffId = liffId !== '' && liffId !== 'LIFF_ID' && !/[<>\s]/.test(liffId)
  const hasNoQueryOrHash = url.search === '' && url.hash === ''

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'liff.line.me' ||
    !hasSingleLiffIdPath ||
    !hasConcreteLiffId ||
    !hasNoQueryOrHash
  ) {
    throw new Error(
      'Invalid environment configuration:\n  - LINE_LIFF_URL: must use LINE_LIFF_URL=https://liff.line.me/<LIFF_ID>'
    )
  }

  config.LINE_LIFF_URL = liffUrl
}
