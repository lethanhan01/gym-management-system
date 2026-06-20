import { Global, Module } from '@nestjs/common'
import { PERMISSION_CACHE_PROVIDER } from '../interfaces/permission-cache.interface'
import { InMemoryPermissionCacheService } from './in-memory-permission-cache.service'

@Global()
@Module({
  providers: [
    {
      provide: PERMISSION_CACHE_PROVIDER,
      useClass: InMemoryPermissionCacheService,
    },
  ],
  exports: [PERMISSION_CACHE_PROVIDER],
})
export class PermissionCacheModule {}
