import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Prisma, User, UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService, UserWithRoles } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import { JwtPayload } from './types/jwt-payload.interface'
import type { LoginResult, RequestContext } from './auth.service'
import {
  LINE_MOCK_ID_TOKEN,
  LINE_MOCK_USER_EMAIL,
  LINE_MOCK_USER_ID,
  LINE_MOCK_USER_NAME,
} from '../line-mock/constants'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

interface LineProfile {
  sub: string
  name: string
  email?: string
  picture?: string
}

interface LineIdTokenPayload extends JWTPayload {
  name?: string
  email?: string
  picture?: string
}

@Injectable()
export class LineOAuthService {
  private readonly logger = new Logger(LineOAuthService.name)
  private readonly lineJWKS = createRemoteJWKSet(
    new URL('https://api.line.me/oauth2/v2.1/certs'),
    {
      cacheMaxAge: 24 * 60 * 60 * 1000,
      cooldownDuration: 30 * 1000,
    }
  )

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {}

  // ---------------------------------------------------------------------------
  // LINE LIFF Login
  // ---------------------------------------------------------------------------

  async lineLogin(idToken: string, ctx: RequestContext = {}): Promise<LoginResult> {
    const profile = await this.verifyLineToken(idToken)

    // 1. Tim theo lineId
    let user = await this.users.findByLineIdWithRoles(profile.sub)
    if (!user) {
      await this.throwIfDeleted(
        await this.users.findByLineIdIncludingDeleted(profile.sub),
        'line_id',
        ctx
      )
    }
    if (user && profile.email) {
      await this.throwIfDeleted(
        await this.users.findByEmailIncludingDeleted(profile.email),
        'email',
        ctx
      )
    }

    // 2. Link theo email neu chua co lineId
    if (!user && profile.email) {
      const byEmail = await this.users.findByEmailWithRoles(profile.email)
      if (!byEmail) {
        await this.throwIfDeleted(
          await this.users.findByEmailIncludingDeleted(profile.email),
          'email',
          ctx
        )
      }
      if (byEmail) {
        user = await this.linkExistingUser(byEmail, profile, ctx)
      }
    }

    // 3. Tao moi neu chua co tai khoan
    if (!user) {
      user = await this.createMemberFromLine(profile, ctx)
    }

    // 4. LINE login chi danh cho member
    if (user.roles.length === 0 || !user.roles.every((r) => r === 'member')) {
      throw new ForbiddenException({
        success: false,
        code: 'LINE_LOGIN_MEMBER_ONLY',
        message: 'Đăng nhập LINE chỉ dành cho Hội viên',
      })
    }

    // LINE auth = danh tinh da xac thuc qua LINE — khong yeu cau emailVerifiedAt (pending_verification duoc phep)
    // 5. Kiem tra status
    if (user.status === UserStatus.locked) {
      await this.audit.log({
        actorUserId: user.userId,
        action: 'auth.line-login',
        resourceType: 'auth',
        resourceId: user.userId.toString(),
        afterData: { success: false, reason: 'user_locked' },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedException({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: 'Tài khoản đã bị khoá',
      })
    }

    if (user.status === UserStatus.pending_verification) {
      throw new ForbiddenException({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Vui lòng xác thực email trước khi đăng nhập',
      })
    }

    // 6. Issue JWT, including profile ids so Self-owned endpoints can enforce access.
    const [staff, memberRecord] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: user.userId, deletedAt: null } }),
      this.prisma.member.findFirst({ where: { userId: user.userId, deletedAt: null } }),
    ])
    const payload: JwtPayload = {
      sub: user.userId.toString(),
      email: user.email,
      roles: user.roles,
      staffId: staff?.staffId ? staff.staffId.toString() : undefined,
      memberId: memberRecord?.memberId ? memberRecord.memberId.toString() : undefined,
    }
    const accessToken = await this.jwt.signAsync(payload)

    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.line-login',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { success: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return {
      accessToken,
      user: {
        userId: user.userId.toString(),
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        staffId: staff?.staffId ? staff.staffId.toString() : undefined,
        memberId: memberRecord?.memberId ? memberRecord.memberId.toString() : undefined,
      },
    }
  }

  async linkLine(userId: bigint, idToken: string): Promise<{ lineName: string }> {
    const profile = await this.verifyLineToken(idToken)

    const existing = await this.users.findByLineIdWithRoles(profile.sub)
    if (existing && existing.userId !== userId) {
      throw this.lineAlreadyLinked()
    }
    if (!existing) {
      const includingDeleted = await this.users.findByLineIdIncludingDeleted(profile.sub)
      await this.throwIfDeleted(includingDeleted, 'line_id', {})
      if (includingDeleted && includingDeleted.userId !== userId) throw this.lineAlreadyLinked()
    }

    try {
      await this.prisma.user.update({
        where: { userId },
        data: { lineId: profile.sub },
      })
    } catch (err) {
      if (!this.hasUniqueTarget(err, 'line')) throw err

      const conflicting = await this.users.findByLineIdIncludingDeleted(profile.sub)
      await this.throwIfDeleted(conflicting, 'line_id', {})
      if (conflicting && conflicting.userId !== userId) throw this.lineAlreadyLinked()
      throw err
    }

    this.logger.log(`User ${userId} linked LINE account: ${profile.sub}`)
    return { lineName: profile.name }
  }

  async unlinkLine(userId: bigint): Promise<void> {
    await this.prisma.user.update({
      where: { userId },
      data: { lineId: null },
    })
    this.logger.log(`User ${userId} unlinked LINE account`)
  }

  private async verifyLineToken(idToken: string): Promise<LineProfile> {
    if (this.config.get<string>('LINE_MOCK_ENABLED') === 'true') {
      if (idToken !== LINE_MOCK_ID_TOKEN) {
        throw new UnauthorizedException({
          success: false,
          code: 'LINE_AUTH_FAILED',
          message: 'LINE Mock ID token không hợp lệ',
        })
      }
      return {
        sub: LINE_MOCK_USER_ID,
        name: LINE_MOCK_USER_NAME,
        email: LINE_MOCK_USER_EMAIL,
      }
    }

    const channelId = this.config.get<string>('LINE_CHANNEL_ID')
    if (!channelId) {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE login chưa được cấu hình trên server',
      })
    }

    // 1. Thu verify token offline qua JWKS cache (giam latency roundtrip)
    try {
      const { payload } = await jwtVerify<LineIdTokenPayload>(idToken, this.lineJWKS, {
        issuer: 'https://access.line.me',
        audience: channelId,
      })

      if (!payload.sub) {
        throw new Error('LINE ID token missing subject claim')
      }

      return {
        sub: payload.sub,
        name: (payload.name as string | undefined) ?? 'LINE User',
        email: payload.email as string | undefined,
        picture: payload.picture as string | undefined,
      }
    } catch (jwksErr) {
      this.logger.warn(
        `LINE JWKS verify failed, falling back to HTTP verify: ${jwksErr instanceof Error ? jwksErr.message : String(jwksErr)}`
      )
    }

    // 2. Fallback ve LINE verify HTTP API
    return this.verifyLineTokenViaHttp(idToken, channelId)
  }

  private async verifyLineTokenViaHttp(idToken: string, channelId: string): Promise<LineProfile> {
    const body = new URLSearchParams({ id_token: idToken, client_id: channelId })
    let res: Response
    try {
      res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
    } catch {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'Không thể kết nối đến LINE API',
      })
    }

    if (!res.ok) {
      // Lấy body lỗi thật từ LINE để phân biệt expired token vs client_id/aud mismatch.
      const errorBody = await res.text().catch(() => '<no body>')
      this.logger.warn(`LINE verify failed (${res.status}): ${errorBody}`)
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE ID token không hợp lệ hoặc đã hết hạn',
      })
    }

    let data: { sub: string; name?: string; email?: string; picture?: string }
    try {
      data = (await res.json()) as { sub: string; name?: string; email?: string; picture?: string }
    } catch {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE ID token không hợp lệ hoặc đã hết hạn',
      })
    }
    return {
      sub: data.sub,
      name: data.name ?? 'LINE User',
      email: data.email,
      picture: data.picture,
    }
  }

  private async createMemberFromLine(
    profile: LineProfile,
    ctx: RequestContext
  ): Promise<UserWithRoles> {
    const memberCode = await this.generateLineMemberCode()
    const email = profile.email ?? `line_${profile.sub}@line.local`

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            emailNormalized: email.trim().toLowerCase(),
            fullName: profile.name,
            passwordHash: null,
            lineId: profile.sub,
            status: UserStatus.active,
            emailVerifiedAt: new Date(),
          },
        })
        await tx.member.create({ data: { userId: user.userId, memberCode } })
        const memberGroup = await tx.group.findUnique({ where: { name: 'member' } })
        if (!memberGroup) throw new InternalServerErrorException('Thiếu cấu hình group member')
        await tx.userGroup.create({ data: { userId: user.userId, groupId: memberGroup.groupId } })
        return { ...user, roles: ['member' as const] }
      })
    } catch (err) {
      return this.resolveCreateConflict(profile, ctx, err)
    }
  }

  private async linkExistingUser(
    user: UserWithRoles,
    profile: LineProfile,
    ctx: RequestContext
  ): Promise<UserWithRoles> {
    try {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: { lineId: profile.sub },
      })
    } catch (err) {
      if (!this.hasUniqueTarget(err, 'line')) throw err

      const existing = await this.users.findByLineIdIncludingDeleted(profile.sub)
      await this.throwIfDeleted(existing, 'line_id', ctx)
      throw this.lineAlreadyLinked()
    }

    this.logger.log(`LINE login linked existing account userId=${user.userId}`)
    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.line-login',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { linked_existing_account: true },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return { ...user, lineId: profile.sub }
  }

  private async resolveCreateConflict(
    profile: LineProfile,
    ctx: RequestContext,
    err: unknown
  ): Promise<UserWithRoles> {
    if (!this.isP2002(err)) throw err

    if (this.hasUniqueTarget(err, 'line')) {
      const byLineId = await this.users.findByLineIdWithRoles(profile.sub)
      if (byLineId && this.sameEmail(byLineId, profile)) {
        return this.logUniqueConflictRetry(byLineId, 'line_id', ctx)
      }
      await this.throwIfDeleted(
        await this.users.findByLineIdIncludingDeleted(profile.sub),
        'line_id',
        ctx
      )
      throw this.lineAlreadyLinked()
    }

    if (profile.email && this.hasUniqueTarget(err, 'email')) {
      const byEmail = await this.users.findByEmailWithRoles(profile.email)
      if (byEmail) return this.logUniqueConflictRetry(byEmail, 'email', ctx)
      await this.throwIfDeleted(
        await this.users.findByEmailIncludingDeleted(profile.email),
        'email',
        ctx
      )
    }

    throw err
  }

  private async logUniqueConflictRetry(
    user: UserWithRoles,
    target: 'email' | 'line_id',
    ctx: RequestContext
  ): Promise<UserWithRoles> {
    this.logger.log(`LINE login retried after unique conflict target=${target}`)
    await this.audit.log({
      actorUserId: user.userId,
      action: 'auth.line-login',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { unique_conflict_retry: target },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return user
  }

  private async throwIfDeleted(
    user: User | null,
    target: 'email' | 'line_id',
    ctx: RequestContext
  ): Promise<void> {
    if (!user?.deletedAt) return

    this.logger.warn(`LINE login blocked by soft-deleted account target=${target}`)
    await this.audit.log({
      action: 'auth.line-login',
      resourceType: 'auth',
      resourceId: user.userId.toString(),
      afterData: { success: false, reason: 'soft_deleted_account_conflict', target },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    })
    throw new ConflictException({
      success: false,
      code: 'ACCOUNT_DELETED',
      message: 'Tài khoản này đã bị ngừng hoạt động. Vui lòng liên hệ hỗ trợ.',
    })
  }

  private isP2002(err: unknown): boolean {
    return (err as { code?: string } | undefined)?.code === 'P2002'
  }

  private hasUniqueTarget(err: unknown, field: 'email' | 'line'): boolean {
    const target = (err as Prisma.PrismaClientKnownRequestError | undefined)?.meta?.target
    const values = Array.isArray(target) ? target : target ? [target] : []
    return values.some((value) => String(value).toLowerCase().includes(field))
  }

  private sameEmail(user: UserWithRoles, profile: LineProfile): boolean {
    const email = profile.email ?? `line_${profile.sub}@line.local`
    return (user.emailNormalized ?? user.email).trim().toLowerCase() === email.trim().toLowerCase()
  }

  private lineAlreadyLinked(): ConflictException {
    return new ConflictException({
      success: false,
      code: 'LINE_ALREADY_LINKED',
      message: 'Tài khoản LINE này đã liên kết với người dùng khác',
    })
  }

  private async generateLineMemberCode(): Promise<string> {
    const year = new Date()
      .toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      .slice(0, 4)
    for (let attempt = 0; attempt < 10; attempt++) {
      const count = await this.prisma.member.count({ where: { deletedAt: null } })
      const seq = String(count + 1 + attempt).padStart(6, '0')
      const code = `MEM-${year}-${seq}`
      const existing = await this.prisma.member.findFirst({ where: { memberCode: code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException({
      success: false,
      code: 'MEMBER_CODE_GENERATION_FAILED',
      message: 'Không thể tạo memberCode sau 10 lần thử',
    })
  }
}
