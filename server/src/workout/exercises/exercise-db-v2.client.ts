import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'crypto'

const EXERCISEDB_EXERCISES_URL = new URL('https://exercisedb.p.rapidapi.com/exercises')
const EXERCISEDB_RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com'
const RESPONSE_PREVIEW_LIMIT = 512

export interface NormalizedExerciseDbExercise {
  externalId: string
  name: string
  category: 'strength' | 'cardio' | 'flexibility' | 'balance'
  muscleGroup: string | null
  equipmentNeeded: string | null
  description: string | null
  imageUrl: string | null
  contentHash: string
  fallbackMapped: boolean
}

@Injectable()
export class ExerciseDbV2Client {
  constructor(private readonly config: ConfigService) {}

  isEnabled() { return this.config.get<string>('EXERCISEDB_SYNC_ENABLED') === 'true' }

  async *allExercises(options: { pageSize?: number; strictPagination?: boolean; onRequest?: () => void } = {}): AsyncGenerator<NormalizedExerciseDbExercise[]> {
    const key = this.config.get<string>('EXERCISEDB_API_KEY')
    if (!this.isEnabled() || !key) throw new Error('ExerciseDB sync is not configured')
    const size = options.pageSize ?? Number(this.config.get<number>('EXERCISEDB_PAGE_SIZE') ?? 50)
    if (!Number.isSafeInteger(size) || size < 1) throw new Error('ExerciseDB page size must be a positive integer')
    let shortPageSeen = false
    for (let offset = 0; ; offset += size) {
      const url = new URL(EXERCISEDB_EXERCISES_URL)
      url.searchParams.set('limit', String(size)); url.searchParams.set('offset', String(offset))
      url.searchParams.set('sortMethod', 'id'); url.searchParams.set('sortOrder', 'ascending')
      options.onRequest?.()
      const payload = await this.request(url, key)
      const items = Array.isArray(payload) ? payload : null
      if (!items) throw new Error('ExerciseDB returned an invalid exercises payload')
      if (options.strictPagination && shortPageSeen && items.length > 0) {
        throw new Error(`ExerciseDB returned records after a short page at offset ${offset}; pagination is unstable`)
      }
      if (items.length === 0) return
      yield items.map((item: Record<string, unknown>) => normalize(item))
      if (options.strictPagination) {
        if (items.length > size) throw new Error(`ExerciseDB returned ${items.length} records for requested page size ${size}`)
        if (items.length < size) shortPageSeen = true
      } else if (items.length < size) return
    }
  }

  private async request(url: URL, apiKey: string): Promise<unknown> {
    const retries = this.config.get<number>('EXERCISEDB_RETRY_LIMIT') ?? 3
    const timeout = this.config.get<number>('EXERCISEDB_TIMEOUT_MS') ?? 15000
    let last: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout)
      let response: Response
      try {
        response = await fetch(url, {
          headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': EXERCISEDB_RAPIDAPI_HOST, Accept: 'application/json' },
          signal: controller.signal,
        })
      } catch (error) {
        last = new Error(`ExerciseDB network request failed: ${sanitize(String(error), apiKey)}`)
        if (attempt < retries) await wait(250 * 2 ** attempt)
        continue
      }
      finally { clearTimeout(timer) }

      if (response.ok) {
        try { return await response.json() }
        catch { throw new Error('ExerciseDB returned invalid JSON') }
      }

      const preview = sanitize((await response.text()).slice(0, RESPONSE_PREVIEW_LIMIT), apiKey)
      const error = new Error(`ExerciseDB request failed (${response.status}) at ${url.hostname}${url.pathname}: ${preview || '<empty response>'}`)
      if (response.status !== 429 && response.status < 500) throw error
      last = error
      if (attempt < retries) await wait(retryDelay(response, attempt))
    }
    throw last instanceof Error ? last : new Error('ExerciseDB request failed')
  }
}

function wait(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)) }

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30_000)
    const timestamp = Date.parse(retryAfter)
    if (!Number.isNaN(timestamp)) return Math.min(Math.max(timestamp - Date.now(), 0), 30_000)
  }
  return 250 * 2 ** attempt
}

function sanitize(value: string, apiKey: string): string {
  return value.split(apiKey).join('[REDACTED]')
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const result = value.replace(/\s+/g, ' ').trim()
  return result || null
}
function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(clean).filter((x): x is string => !!x) : []
}
function normalize(item: Record<string, unknown>): NormalizedExerciseDbExercise {
  const externalId = clean(item.id)
  const name = clean(item.name)
  if (!externalId || !name) throw new Error('ExerciseDB exercise is missing id or name')
  const providerCategory = clean(item.category)?.toLowerCase() ?? null
  const mapped = mapCategory(providerCategory)
  const category = mapped.category
  const muscles = [clean(item.target), ...list(item.secondaryMuscles), clean(item.bodyPart)].filter((x): x is string => !!x)
  const instructions = list(item.instructions)
  // ExerciseDB v2 API no longer provides a gifUrl / image field.
  // imageUrl is preserved in the schema for manual exercises and future provider updates.
  const persisted = {
    externalId, name, category, muscleGroup: muscles.length ? [...new Set(muscles)].join(', ') : null,
    equipmentNeeded: clean(item.equipment),
    description: clean(item.description) ?? (instructions.slice(0, 3).join(' ') || null),
    imageUrl: null as string | null,
  }
  assertColumnLengths(persisted)
  return { ...persisted, category, fallbackMapped: mapped.fallbackMapped, contentHash: createHash('sha256').update(JSON.stringify(persisted)).digest('hex') }
}

function assertColumnLengths(item: Pick<NormalizedExerciseDbExercise, 'externalId' | 'name' | 'muscleGroup' | 'equipmentNeeded' | 'imageUrl'>) {
  // imageUrl is always null for exercisedb source (API v2 dropped gifUrl); skip its check.
  const limits: Array<[string, string | null, number]> = [
    ['id', item.externalId, 191], ['name', item.name, 100], ['equipment', item.equipmentNeeded, 100],
  ]
  for (const [field, value, limit] of limits) {
    if (value && Array.from(value).length > limit) throw new Error(`ExerciseDB exercise ${item.externalId} has ${field} longer than ${limit} characters`)
  }
}

function mapCategory(value: string | null): Pick<NormalizedExerciseDbExercise, 'category' | 'fallbackMapped'> {
  if (value === 'cardio') return { category: 'cardio', fallbackMapped: false }
  if (value === 'flexibility' || value === 'stretch' || value === 'stretching' || value === 'yoga' || value === 'mobility') return { category: 'flexibility', fallbackMapped: false }
  if (value === 'balance') return { category: 'balance', fallbackMapped: false }
  if (value === 'strength') return { category: 'strength', fallbackMapped: false }
  return { category: 'strength', fallbackMapped: true }
}
