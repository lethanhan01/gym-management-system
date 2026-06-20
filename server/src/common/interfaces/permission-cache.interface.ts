export const PERMISSION_CACHE_PROVIDER = Symbol('PERMISSION_CACHE_PROVIDER')

export interface IPermissionCacheProvider {
  get(userId: string): Promise<Set<string> | null>
  set(userId: string, codes: Set<string>, ttlMs: number): Promise<void>
  delete(userId: string): Promise<void>
}
