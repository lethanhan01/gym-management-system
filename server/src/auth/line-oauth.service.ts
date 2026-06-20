import { Injectable, Logger, UnauthorizedException, InternalServerErrorException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService, UserWithRoles } from './users.service'
import { AuditService } from '../common/audit/audit.service'
import { JwtPayload } from './types/jwt-payload.interface'
import type { LoginResult, RequestContext } from './auth.service'

interface LineProfile {
  sub: string
  name: string
  email?: string
  picture?: string
}

@Injectable()
export class LineOAuthService {
  private readonly logger = new Logger(LineOAuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // LINE LIFF Login
  // ---------------------------------------------------------------------------

  async lineLogin(idToken: string, ctx: RequestContext = {}): Promise<LoginResult> {
    const profile = await this.verifyLineToken(idToken)

    // 1. Tim theo lineId
    let user = await this.users.findByLineIdWithRoles(profile.sub)

    // 2. Link theo email neu chua co lineId
    if (!user && profile.email) {
      const byEmail = await this.users.findByEmailWithRoles(profile.email)
      if (byEmail) {
        await this.prisma.user.update({
          where: { userId: byEmail.userId },
          data: { lineId: profile.sub },
        })
        user = { ...byEmail, lineId: profile.sub }
      }
    }

    // 3. Tao moi neu chua co tai khoan
    if (!user) {
      user = await this.createMemberFromLine(profile)
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

  private async verifyLineToken(idToken: string): Promise<LineProfile> {
    const channelId = this.config.get<string>('LINE_CHANNEL_ID')
    if (!channelId) {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE login chưa được cấu hình trên server',
      })
    }

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
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE ID token không hợp lệ hoặc đã hết hạn',
      })
    }

    let data: { sub: string; name?: string; email?: string; picture?: string }
    try {
      data = await res.json() as { sub: string; name?: string; email?: string; picture?: string }
    } catch {
      throw new UnauthorizedException({
        success: false,
        code: 'LINE_AUTH_FAILED',
        message: 'LINE ID token không hợp lệ hoặc đã hết hạn',
      })
    }
    return { sub: data.sub, name: data.name ?? 'LINE User', email: data.email, picture: data.picture }
  }

  private async createMemberFromLine(profile: LineProfile): Promise<UserWithRoles> {
    const memberCode = await this.generateLineMemberCode()
    const email = profile.email ?? `line_${profile.sub}@line.local`

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            fullName: profile.name,
            passwordHash: null,
            lineId: profile.sub,
            status: UserStatus.active,
            emailVerifiedAt: new Date(),
          },
        })
        await tx.member.create({ data: { userId: user.userId, memberCode } })
        const memberGroup = await tx.group.findUnique({ where: { name: 'member' } })
        if (memberGroup) {
          await tx.userGroup.create({ data: { userId: user.userId, groupId: memberGroup.groupId } })
        }
        return { ...user, roles: ['member' as const] }
      })
    } catch (err) {
      // Race condition: concurrent request tao cung user (trung email hoac lineId)
      if ((err as { code?: string }).code === 'P2002') {
        if (profile.email) {
          const byEmail = await this.users.findByEmailWithRoles(profile.email)
          if (byEmail) return byEmail
        }
        const byLineId = await this.users.findByLineIdWithRoles(profile.sub)
        if (byLineId) return byLineId
      }
      throw err
    }
  }

  private async generateLineMemberCode(): Promise<string> {
    const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 4)
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
