import { getRuntimeDatabaseUrl } from './database-url'

describe('getRuntimeDatabaseUrl', () => {
  it('normalizes Supabase pooler URLs for Prisma runtime usage', () => {
    const url = getRuntimeDatabaseUrl(
      'postgresql://postgres.ref:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?connection_limit=1'
    )

    expect(url).toBeDefined()

    const parsed = new URL(url!)
    expect(parsed.port).toBe('6543')
    expect(parsed.searchParams.get('sslmode')).toBe('require')
    expect(parsed.searchParams.get('pgbouncer')).toBe('true')
    expect(parsed.searchParams.get('pool_timeout')).toBe('20')
    expect(parsed.searchParams.get('connect_timeout')).toBe('20')
    expect(parsed.searchParams.get('connection_limit')).toBe('5')
  })

  it('leaves non-Supabase pooler URLs unchanged', () => {
    const url = 'postgresql://postgres:secret@localhost:5432/gym'

    expect(getRuntimeDatabaseUrl(url)).toBe(url)
  })
})
