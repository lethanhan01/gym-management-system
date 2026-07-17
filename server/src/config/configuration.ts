import { IsEnum, IsIn, IsNumber, IsOptional, IsString, validateSync } from 'class-validator'
import { plainToInstance } from 'class-transformer'

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

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

  /**
   * Dung trong schema.prisma (directUrl): migrate drift / tac vu can ket noi truc tiep toi Postgres,
   * (vd Supabase tranh pooler `pgbouncer=true`). Ung dung Nest chu yeu chi dung DATABASE_URL.
   */
  @IsOptional()
  @IsString()
  DIRECT_URL?: string

  @IsString()
  JWT_SECRET!: string

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN: string = '7d'

  @IsOptional() @IsString() SMTP_HOST?: string
  @IsOptional() @IsNumber() SMTP_PORT?: number
  @IsOptional() @IsString() SMTP_USER?: string
  @IsOptional() @IsString() SMTP_PASS?: string

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
  validateLineMessagingConfig(config)
  return config
}

function validateLineMessagingConfig(config: EnvironmentVariables) {
  if (config.LINE_MESSAGING_ENABLED !== 'true') return

  const missing = [
    ['LINE_CHANNEL_ACCESS_TOKEN', config.LINE_CHANNEL_ACCESS_TOKEN],
    ['LINE_CHANNEL_SECRET', config.LINE_CHANNEL_SECRET],
    ['LINE_LIFF_URL', config.LINE_LIFF_URL],
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
    url = new URL(config.LINE_LIFF_URL!)
  } catch {
    throw new Error('Invalid environment configuration:\n  - LINE_LIFF_URL: must be a valid URL')
  }

  if (url.hostname === 'developers.line.biz') {
    throw new Error(
      'Invalid environment configuration:\n  - LINE_LIFF_URL: must not be a LINE Developers Console URL'
    )
  }
  if (url.protocol !== 'https:' || url.hostname !== 'liff.line.me') {
    throw new Error(
      'Invalid environment configuration:\n  - LINE_LIFF_URL: must use https://liff.line.me/<LIFF_ID>'
    )
  }
}
