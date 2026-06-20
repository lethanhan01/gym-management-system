import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator'
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
  return config
}
