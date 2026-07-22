// Prisma co pool o phia ung dung, Supavisor co pool o phia database. Mot Nest
// process khong nen tu y mo qua nhieu client connections den transaction pooler.
// Tuy nhien mot Nest process xu ly request dong thoi va cac endpoint phan trang
// thuong can them mot truy van count. Mot pool nho vua phai tranh de hang doi
// Prisma bi can sau khi Supavisor reset mot ket noi.
// Deployment van co the ghi de connection_limit trong DATABASE_URL.
const DEFAULT_POOL_SIZE = 5

export function getRuntimeDatabaseUrl(value = process.env.DATABASE_URL): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com')

    if (!isSupabasePooler) return url.toString()

    if (url.port === '5432') {
      url.port = '6543'
    }

    url.searchParams.set('sslmode', 'require')
    url.searchParams.set('pgbouncer', 'true')
    url.searchParams.set('pool_timeout', '20')
    url.searchParams.set('connect_timeout', '20')

    const currentLimit = parseInt(url.searchParams.get('connection_limit') ?? '', 10)
    if (!Number.isInteger(currentLimit) || currentLimit < 1) {
      url.searchParams.set('connection_limit', String(DEFAULT_POOL_SIZE))
    }

    return url.toString()
  } catch {
    return value
  }
}
