# SOLID Analysis — Backend (server/src/)

Phân tích toàn bộ backend NestJS tại `server/src/` theo 5 nguyên tắc SOLID.
Codebase gồm 13 module: auth, common, facility, members, membership, payments,
rbac, reports, staff, training, workout, feedback, health/prisma.

---

## S — Single Responsibility Principle

> Một class chỉ có một lý do để thay đổi.

### Vi phạm

#### `auth/auth.service.ts` (~634 dòng)

7 trách nhiệm trong một class:

| Trách nhiệm | Method |
|---|---|
| Login / logout + JWT signing | `login()`, `logout()` |
| OTP generation | `forgotPassword()`, `resendVerify()` |
| Password reset | `resetPassword()` |
| Email verification | `verifyEmail()` |
| LINE OAuth + member creation | `lineLogin()` |
| Password change | `changePassword()` |

Bất kỳ thay đổi nào trong bất kỳ flow nào đều chạm tới cùng một file.
Nên tách thành: `AuthenticationService`, `PasswordResetService`,
`EmailVerificationService`, `LineOAuthService`.

#### `training/training.service.ts` (~1402 dòng) — lớn nhất codebase

6 trách nhiệm:

| Trách nhiệm | Ví dụ |
|---|---|
| Session CRUD + state transitions | `scheduled → in_progress → completed` |
| Overlap checking | kiểm tra xung đột lịch |
| Attendance deduplication | tránh chấm công trùng |
| Device check-in qua QR | `DeviceAccessEvent` |
| Progress recording | `MemberProgress` |
| Role resolution + serialization | `isMemberOnly()`, `serializeSession()` |

#### `members/members.service.ts` (~809 dòng)

12 public method bao gồm CRUD, subscription activation, trainer assignment,
self-registration, progress tracking, access control cho trainer-owned members.
Nên tách thành: `MemberService`, `TrainerAssignmentService`, `MemberProgressService`.

#### `staff/staff.service.ts` (~620 dòng)

Staff CRUD + schedule management + attendance check-in/out + cascading deletion
nullify FK qua 9 table. Nên tách thành: `StaffService`, `StaffScheduleService`,
`StaffAttendanceService`.

#### `facility/facility.service.ts` (~648 dòng)

Room CRUD + Equipment CRUD + Maintenance log + code generation. Nên tách thành:
`RoomService`, `EquipmentService`, `MaintenanceService`.

### Tuân thủ

- `common/otp-store/otp-store.service.ts` (~37 dòng): một job — in-memory OTP
  store với TTL + attempt tracking.
- `common/rate-limit/rate-limit.service.ts` (~32 dòng): sliding window rate limit.
- `common/audit/audit.service.ts` (~44 dòng): fire-and-forget audit logging.
- `auth/users.service.ts` (~76 dòng): chỉ lookup user + resolve roles.

---

## O — Open/Closed Principle

> Mở để mở rộng, đóng để sửa đổi.

### Vi phạm

#### Role-branching lặp lại trong `training/training.service.ts`

Pattern này xuất hiện ở nhiều method:

```typescript
if (this.isMemberOnly(caller)) {
  where.memberId = selfMemberId
} else if (this.isTrainerOnly(caller)) {
  where.trainerStaffId = selfStaffId
  if (memberId) where.memberId = BigInt(memberId)
} else {
  if (memberId) where.memberId = BigInt(memberId)
}
```

Thêm role mới buộc sửa tất cả method có block này. Cần strategy pattern:

```typescript
interface ICallerQueryFilter {
  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void
}
```

#### Hardcode Prisma error mapping trong `common/filters/http-exception.filter.ts`

```typescript
switch (err.code) {
  case 'P2002': return { status: 409, ... }
  case 'P2025': return { status: 404, ... }
  // 10 case nữa
}
```

Thêm error code Prisma mới hoặc thay ORM phải sửa filter. Nên dùng registry
pluggable: `Map<string, ErrorMapper>` inject qua DI.

#### Cache TTL hardcode trong `common/guards/permissions.guard.ts`

```typescript
const CACHE_TTL_MS = 60_000
```

Không configurable qua `ConfigService`.

### Tuân thủ

- RBAC permission catalog là data-driven — permission mới thêm qua DB, không
  cần code change.
- Controllers inject service qua DI — implementation có thể swap không sửa controller.

---

## L — Liskov Substitution Principle

> Subtype có thể thay thế supertype mà không làm vỡ hành vi.

### Vi phạm

#### LINE login assumption trong `auth/auth.service.ts`

```typescript
if (user.roles.length === 0 || !user.roles.every((r) => r === 'member')) {
  throw new ForbiddenException({ code: 'LINE_LOGIN_MEMBER_ONLY' })
}
```

User có roles `['member', 'trainer']` — hoàn toàn hợp lệ về business — sẽ bị
từ chối. Điều kiện đúng: `!user.roles.includes('member')`.

#### String enum không type-safe trong `members/members.service.ts`

```typescript
if (subStatus === 'active') { ... }
else if (subStatus === 'expired') { ... }
```

`subStatus` nhận từ query string, không validate bằng enum. Typo (`activee`)
không báo lỗi, im lặng bỏ qua filter.

#### Discriminated union thiếu trong `feedback/feedback.service.ts`

```typescript
if (feedbackType === 'staff' && dto.subjectEquipmentId) {
  throw new BadRequestException(...)
}
if (feedbackType === 'equipment' && dto.subjectStaffId) {
  throw new BadRequestException(...)
}
```

Type system không ngăn được tổ hợp sai. Nên model bằng discriminated union:

```typescript
type FeedbackInput =
  | { type: 'staff';     subjectStaffId: bigint }
  | { type: 'equipment'; subjectEquipmentId: bigint }
  | { type: 'service' }
```

### Tuân thủ

- `Caller` type nhất quán qua toàn `training.service.ts`.
- Guards implement `CanActivate` contract đúng — thay thế được trong `@UseGuards()`.

---

## I — Interface Segregation Principle

> Client không được phụ thuộc method nó không dùng.

### Vi phạm

#### `auth/auth.service.ts` — 7 public method không tách được

Controller cần login/logout nhưng vẫn nhận cả cụm 7 method khi inject service.
Unit test một endpoint phải mock toàn bộ.

Nên tách thành 3 interface hẹp:

```typescript
interface IAuthenticator   { login(...): ...; logout(...): ... }
interface IPasswordManager { forgotPassword(...): ...; resetPassword(...): ... }
interface IEmailVerifier   { verifyEmail(...): ...; resendVerify(...): ... }
```

#### `members/members.service.ts` — 12 public method

Các endpoint dùng subset khác nhau nhưng không thể tách dependency.

#### `common/guards/permissions.guard.ts` — 3 concern trong một class

Cache management (Map + TTL) + single-flight dedup (`pendingQueries`) + access
control decision. Không thể swap Redis vào mà không sửa guard.

Nên inject `IPermissionCacheProvider`:

```typescript
interface IPermissionCacheProvider {
  get(userId: string): Promise<Set<string> | null>
  set(userId: string, codes: Set<string>, ttlMs: number): Promise<void>
}
```

### Tuân thủ

- Decorators nhỏ và single-purpose: `CurrentUser` (~15 dòng), `Roles` (~13 dòng),
  `RequirePermission` (~6 dòng).
- DTO classes chỉ chứa validation rules — không leak business logic.
- `AuditParams` interface tối giản — caller chỉ dùng field cần thiết.

---

## D — Dependency Inversion Principle

> Module cấp cao phụ thuộc abstraction, không phụ thuộc concrete.

### Vi phạm

#### `auth/auth.service.ts` — inject 7 concrete class

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly users: UsersService,
  private readonly jwt: JwtService,
  private readonly audit: AuditService,
  private readonly rateLimit: RateLimitService,
  private readonly config: ConfigService,
  private readonly otpStore: OtpStoreService,
) {}
```

Không có abstraction layer. Unit test phải mock 7 dependency.

#### `training/training.service.ts` — ORM call trực tiếp trong service method

```typescript
const [data, total] = await Promise.all([
  this.prisma.trainingSession.findMany({ where, skip, take, include }),
  this.prisma.trainingSession.count({ where }),
])
```

Business logic trộn lẫn ORM call. Không thể swap database không đụng service.

#### `common/guards/permissions.guard.ts` — global variable ngoài class

```typescript
// Ngoài class, file scope
const permCache = new Map<string, { codes: Set<string>; exp: number }>()
const pendingQueries = new Map<string, Promise<Set<string>>>()
const CACHE_TTL_MS = 60_000
```

Scaled deployment (multiple instance) sẽ có inconsistent cache vì in-memory.
Không inject được Redis thay thế.

#### Duplicate Prisma error handling trong nhiều service

`facility.service.ts` bắt `P2002` trực tiếp trong service — duplicate logic đã
có trong `HttpExceptionFilter`. Database error code leak lên business layer.

```typescript
catch (error: unknown) {
  if ((error as { code?: string }).code === 'P2002') {
    throw new ConflictException(...)  // đã xử lý ở filter rồi
  }
  throw error
}
```

### Tuân thủ

- `prisma/prisma.service.ts`: extend `PrismaClient`, inject qua DI, lifecycle
  hooks cho graceful shutdown — đúng hướng.
- `auth/auth.module.ts`: `JwtModule.registerAsync` với `ConfigService` inject —
  không hardcode JWT secret.
- Module DI graph explicit — NestJS resolve tại startup, không runtime coupling.

---

## Bảng tóm tắt

| Nguyên tắc | Trạng thái | Mức độ | File vi phạm chính |
|---|---|---|---|
| SRP | Vi phạm | Cao | auth.service, training.service, members.service, staff.service, facility.service |
| OCP | Vi phạm | Trung bình | training.service (role branches), http-exception.filter |
| LSP | Vi phạm | Thấp-Trung | auth.service (LINE login), members.service (string enum) |
| ISP | Vi phạm | Trung bình | auth.service, members.service, permissions.guard |
| DIP | Vi phạm | Cao | auth.service, training.service, permissions.guard |

**Vấn đề cốt lõi:** SRP và DIP cộng hưởng — service quá lớn → khó inject
abstraction → khó test → phân nhánh theo role cứng nhắc lan rộng.

---

## Ưu tiên refactor

1. **Phase 1 — LSP fixes (low risk):** sửa điều kiện sai ngay, không cần tái cấu trúc.
2. **Phase 2 — SRP splits:** tách 5 service monolithic thành service nhỏ hơn.
3. **Phase 3 — OCP/ISP/DIP abstractions:** strategy pattern, interface segregation,
   cache abstraction — sau khi service đã gọn.
