// connection_limit=1 phù hợp serverless (nhiều instance song song). NestJS là
// persistent server — cần pool đủ để xử lý concurrent requests. Mỗi request
// có thể gọi Promise.all([findMany(), count()]) nên cần ít nhất 2 connections
// đồng thời; 5 là mức an toàn cho Supabase free tier (max 60 direct connections).
const MIN_POOL_SIZE = 5

export function getRuntimeDatabaseUrl(value = process.env.DATABASE_URL): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com')

    if (!isSupabasePooler) return url.toString()

    if (url.port === '5432') {
      url.port = '6543'
    }

    url.searchParams.set('pgbouncer', 'true')
    url.searchParams.set('pool_timeout', '20')
    url.searchParams.set('connect_timeout', '20')

    const currentLimit = parseInt(url.searchParams.get('connection_limit') ?? '0', 10)
    if (currentLimit < MIN_POOL_SIZE) {
      url.searchParams.set('connection_limit', String(MIN_POOL_SIZE))
    }

    return url.toString()
  } catch {
    return value
  }
}
