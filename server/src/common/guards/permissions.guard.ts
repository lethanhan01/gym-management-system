import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { PERMISSION_KEY } from '../decorators/require-permission.decorator'
import {
  IPermissionCacheProvider,
  PERMISSION_CACHE_PROVIDER,
} from '../interfaces/permission-cache.interface'

@Injectable()
export class PermissionsGuard implements CanActivate {
  /** Single-flight: neu co query dang chay cho user nay, dung chung promise thay vi tao query moi. */
  private readonly pendingQueries = new Map<string, Promise<Set<string>>>()
  private readonly cacheTtlMs: number

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PERMISSION_CACHE_PROVIDER) private readonly cache: IPermissionCacheProvider,
  ) {
    this.cacheTtlMs = this.config.get<number>('PERMISSION_CACHE_TTL_MS') ?? 60_000
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required) return true

    const req = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>()
    const user = req.user
    if (!user) return false

    const codes = await this.getUserPermissions(user.userId)
    if (!codes.has(required))
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: `Cần quyền: ${required}`,
      })
    return true
  }

  private async getUserPermissions(userId: bigint): Promise<Set<string>> {
    const key = userId.toString()
    const cached = await this.cache.get(key)
    if (cached) return cached

    // Neu da co query dang in-flight cho user nay, doi ket qua cua no
    const pending = this.pendingQueries.get(key)
    if (pending) return pending

    const promise = this.fetchPermissions(userId, key)
    this.pendingQueries.set(key, promise)
    try {
      return await promise
    } finally {
      this.pendingQueries.delete(key)
    }
  }

  private async fetchPermissions(userId: bigint, key: string): Promise<Set<string>> {
    const rows = await this.prisma.userGroup.findMany({
      where: { userId },
      include: {
        group: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    })

    const codes = new Set<string>()
    for (const ug of rows) {
      for (const gp of ug.group.permissions) {
        codes.add(gp.permission.code)
      }
    }

    await this.cache.set(key, codes, this.cacheTtlMs)
    return codes
  }
}
