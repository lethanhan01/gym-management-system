import { validateConfig } from './configuration'

const lineConfigBaseEnv = {
  DATABASE_URL:
    'postgresql://postgres.ref:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&application_name=gym-api',
  JWT_SECRET: 'test-secret',
}

describe('validateConfig LINE messaging', () => {
  it('defaults LINE_MESSAGE_LOCALE to vi', () => {
    const config = validateConfig({
      ...lineConfigBaseEnv,
      DB_CONNECTION_MODE: 'supavisor-session',
      DATABASE_URL:
        'postgresql://postgres.ref:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&application_name=gym-api',
    })

    expect(config.LINE_MESSAGE_LOCALE).toBe('vi')
  })

  it('accepts Japanese LINE message locale', () => {
    const config = validateConfig({
      ...lineConfigBaseEnv,
      DB_CONNECTION_MODE: 'supavisor-session',
      DATABASE_URL:
        'postgresql://postgres.ref:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&application_name=gym-api',
      LINE_MESSAGE_LOCALE: 'ja',
    })

    expect(config.LINE_MESSAGE_LOCALE).toBe('ja')
  })

  it('rejects unsupported LINE message locales', () => {
    expect(() => validateConfig({ ...lineConfigBaseEnv, LINE_MESSAGE_LOCALE: 'en' })).toThrow(
      /LINE_MESSAGE_LOCALE/,
    )
  })

  it('requires LINE messaging credentials and LIFF URL when messaging is enabled', () => {
    expect(() => validateConfig({ ...lineConfigBaseEnv, LINE_MESSAGING_ENABLED: 'true' })).toThrow(
      /LINE_CHANNEL_ACCESS_TOKEN[\s\S]*LINE_CHANNEL_SECRET[\s\S]*LINE_LIFF_URL/,
    )
  })

  it('accepts the canonical LINE LIFF URL when messaging is enabled', () => {
    const config = validateConfig({
      ...lineConfigBaseEnv,
      DB_CONNECTION_MODE: 'supavisor-session',
      DATABASE_URL:
        'postgresql://postgres.ref:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&application_name=gym-api',
      LINE_MESSAGING_ENABLED: 'true',
      LINE_CHANNEL_ACCESS_TOKEN: 'token',
      LINE_CHANNEL_SECRET: 'secret',
      LINE_LIFF_URL: ' https://liff.line.me/test-liff ',
    })

    expect(config.LINE_LIFF_URL).toBe('https://liff.line.me/test-liff')
  })

  it('rejects LINE Developers Console URLs as LINE_LIFF_URL', () => {
    expect(() =>
      validateConfig({
        ...lineConfigBaseEnv,
        LINE_MESSAGING_ENABLED: 'true',
        LINE_CHANNEL_ACCESS_TOKEN: 'token',
        LINE_CHANNEL_SECRET: 'secret',
        LINE_LIFF_URL: 'https://developers.line.biz/console/channel/1/liff/1-test',
      }),
    ).toThrow(/must not be a LINE Developers Console URL/)
  })

  it.each([
    ['non-LIFF host', 'https://gym.example.com/liff'],
    ['insecure LIFF URL', 'http://liff.line.me/test-liff'],
    ['missing LIFF ID', 'https://liff.line.me/'],
    ['placeholder LIFF ID', 'https://liff.line.me/<LIFF_ID>'],
    ['space in LIFF ID', 'https://liff.line.me/test%20liff'],
    ['query string', 'https://liff.line.me/test-liff?x=1'],
    ['hash fragment', 'https://liff.line.me/test-liff#callback'],
    ['extra path segment', 'https://liff.line.me/test-liff/callback'],
  ])('rejects %s as LINE_LIFF_URL', (_name, LINE_LIFF_URL) => {
    expect(() =>
      validateConfig({
        ...lineConfigBaseEnv,
        LINE_MESSAGING_ENABLED: 'true',
        LINE_CHANNEL_ACCESS_TOKEN: 'token',
        LINE_CHANNEL_SECRET: 'secret',
        LINE_LIFF_URL,
      }),
    ).toThrow(/LINE_LIFF_URL=https:\/\/liff\.line\.me\/<LIFF_ID>/)
  })
})

const validUrl =
  'postgresql://postgres.ref:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&application_name=gym-api'

describe('validateConfig database connection', () => {
  const base = () => ({
    NODE_ENV: 'development',
    JWT_SECRET: 'test-secret',
    DATABASE_URL: validUrl,
  })

  it('uses Supavisor session mode by default outside production', () => {
    expect(validateConfig(base()).DB_CONNECTION_MODE).toBe('supavisor-session')
  })

  it('accepts a valid direct persistent URL', () => {
    const config = validateConfig({
      ...base(),
      DB_CONNECTION_MODE: 'direct',
      DATABASE_URL:
        'postgresql://postgres:secret@db.project-ref.supabase.co:5432/postgres?sslmode=require&connection_limit=5&application_name=gym-api',
    })

    expect(config.DB_CONNECTION_MODE).toBe('direct')
  })

  it('rejects transaction pooler URLs and pgbouncer mode', () => {
    expect(() =>
      validateConfig({
        ...base(),
        DATABASE_URL: validUrl.replace(':5432', ':6543').replace('application_name', 'pgbouncer=true&application_name'),
      }),
    ).toThrow('port 5432')
  })

  it('requires an explicit mode in production', () => {
    expect(() => validateConfig({ ...base(), NODE_ENV: 'production' })).toThrow('DB_CONNECTION_MODE')
  })
})

describe('validateConfig ExerciseDB sync', () => {
  it('requires a RapidAPI key only when the sync is enabled', () => {
    expect(() => validateConfig({ ...lineConfigBaseEnv, EXERCISEDB_SYNC_ENABLED: 'true' })).toThrow('EXERCISEDB_API_KEY')
    expect(validateConfig(lineConfigBaseEnv).EXERCISEDB_SYNC_ENABLED).toBe('false')
  })

  it('accepts a configured RapidAPI sync without provider URL overrides', () => {
    expect(validateConfig({ ...lineConfigBaseEnv, EXERCISEDB_SYNC_ENABLED: 'true', EXERCISEDB_API_KEY: 'rapid-key' }).EXERCISEDB_API_KEY).toBe('rapid-key')
  })

  it('keeps the ExerciseDB scheduler disabled unless explicitly enabled', () => {
    expect(validateConfig(lineConfigBaseEnv).EXERCISEDB_SCHEDULER_ENABLED).toBe('false')
    expect(() => validateConfig({ ...lineConfigBaseEnv, EXERCISEDB_SCHEDULER_ENABLED: 'true' })).toThrow('requires EXERCISEDB_SYNC_ENABLED')
  })
})
