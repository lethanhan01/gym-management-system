# API Conventions

| Field | Value |
|---|---|
| Document ID | GMS-API-CONV-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD — 1 backend lead khi team formed |
| Last Updated | 2026-05-17 |
| Related docs | [`Architecture.md §4`](../Architecture.md), [`Database.md`](../Database.md), [`server/src/common/filters/http-exception.filter.ts`](../../../server/src/common/filters/http-exception.filter.ts) |

---

## 1. Mục đích

Quy ước chung áp dụng cho mọi endpoint Module 1-9. Mỗi module spec chỉ định nghĩa endpoint-specific behavior; những gì áp dụng toàn cục (auth header, error shape, pagination, error codes) ghi ở đây để tránh lặp.

Source-of-truth thực thi: `server/src/common/filters/http-exception.filter.ts` (error envelope), `server/src/main.ts` (global prefix, ValidationPipe, BigInt serialization), Architecture v1.1.3 §4 (business conventions).

## 2. Base URL & Versioning

- Base URL: `/api/v1`. Set ở `main.ts:14` qua `app.setGlobalPrefix('api/v1', { exclude: ['health'] })`.
- Path-based versioning. Breaking change → bump `/api/v2`. Không dùng header `Accept-Version`.
- Health endpoint `/health` (no prefix) dành cho monitoring, không thuộc API resource spec.

## 3. Authentication

- Header: `Authorization: Bearer <JWT>`.
- JWT TTL: 7 ngày. HS256. Payload: `{ sub: string, email: string, roles: Role[] }`. `sub` là string (BigInt PK cast — xem ADR-002).
- Endpoint không cần auth khai báo `@Public()` (vd `/auth/login`, `/auth/forgot-password`, `/health`).
- `JwtAuthGuard` global; `@Public()` opt-out per route. Thiếu/sai/expired token → 401 `UNAUTHORIZED`.
- Logout client-side: client xoá token khỏi storage. Không có refresh token v1.0 (ADR-008).

## 4. Authorization (RBAC + Ownership)

### 4.1 Role-based

4 role chính (Architecture §4.1.2): `owner`, `staff` (gồm position `manager`/`receptionist`/`technician`), `pt` (trainer), `member`. Quan hệ qua `user_groups → groups → group_permissions`.

`RolesGuard` per-route dùng decorator `@Roles('owner', 'staff')`. Match bằng `roles.some()` để hỗ trợ multi-role.

### 4.2 RBAC notation trong spec

Mỗi endpoint khai báo cột RBAC theo notation:

| Token | Ý nghĩa |
|---|---|
| `Owner` | role `owner` |
| `Staff` | role `staff` (mọi position) |
| `PT` | role `pt` |
| `Member` | role `member` |
| `PT-if-primary` | role `pt` VÀ `member.primary_trainer_id = self.staff_id` |
| `Self` | JWT `sub` khớp `:id` resource hoặc `resource.userId` |
| `Public` | không cần JWT |

Combine bằng dấu `|`: `Owner | Staff | PT-if-primary | Self` = bất kỳ điều kiện nào match. RolesGuard handle role-based; ownership check qua custom guard.

### 4.3 OwnershipGuard pattern

`Self` và `PT-if-primary` cần ownership check sau khi pass role gate. Implementation hint (impl phase Module 4):

- Custom guard `OwnershipGuard` đọc `:id` param hoặc resource từ query.
- Lookup resource qua Prisma (vd `member.findUnique({ where: { id }, select: { userId: true, primaryTrainerId: true } })`).
- Compare:
  - `Self`: `resource.userId === jwt.sub` (cast BigInt).
  - `PT-if-primary`: `resource.primaryTrainerId === jwt.staffId` (staffId derive từ `staff.findUnique({ where: { userId: jwt.sub } })`).
- Fail → 403 `FORBIDDEN`.

Stack guard: `JwtAuthGuard → RolesGuard → OwnershipGuard`. RBAC `Owner | Staff` bypass ownership (mọi resource).

Permission-code-based RBAC (vd `member.read.own`) defer khi Module 2 RBAC spec — sẽ refactor RBAC column thay role bằng permission code.

## 5. Response Envelope

### 5.1 Success

Single resource:

```json
{
  "success": true,
  "data": { "userId": "1", "email": "a@b.com" }
}
```

List resource (pagination):

```json
{
  "success": true,
  "data": [ { ... }, { ... } ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 137,
    "totalPages": 7
  }
}
```

Action không trả resource (vd logout):

```json
{
  "success": true,
  "message": "Đã đăng xuất khỏi tài khoản a@b.com"
}
```

### 5.2 Error

Shape thực tế từ `HttpExceptionFilter` (`http-exception.filter.ts:12-17`):

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Email không hợp lệ",
  "details": ["email phải hợp lệ", "password tối thiểu 8 ký tự"]
}
```

`details` optional, dùng cho validation error array hoặc Prisma meta.

> **Drift note:** Architecture v1.1.3 §4.2 còn ghi error shape NestJS default `{statusCode, message, error}`. API spec match code thực tế. Architecture sẽ sync v1.1.4 session sau.


## 6. Error Codes Catalog

Standard codes (`http-exception.filter.ts:105-152`):

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | class-validator fail / `PrismaClientValidationError` |
| 400 | `FK_CONSTRAINT` | Prisma P2003 (foreign key violation) |
| 401 | `UNAUTHORIZED` | JWT thiếu / sai / expired / `UnauthorizedException` |
| 403 | `FORBIDDEN` | `RolesGuard` reject / `OwnershipGuard` reject |
| 404 | `NOT_FOUND` | Prisma P2025 (record not found) |
| 409 | `DUPLICATE_VALUE` | Prisma P2002 (unique violation) |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded (vd forgot-password 3/h) |
| 500 | `INTERNAL_SERVER_ERROR` | Uncaught / unmapped |
| 500 | `PRISMA_<code>` | Other Prisma `PrismaClientKnownRequestError` |

Module có thể thêm domain-specific codes (vd `OTP_EXPIRED`, `SUBSCRIPTION_ALREADY_ACTIVE`). Bắt buộc:

- Code SCREAMING_SNAKE_CASE.
- Liệt kê trong appendix module spec.
- HTTP status code phải match table trên (không tự đặt status mới).
- Map qua `HttpException` subclass + `code` field trong response object (filter sẽ pick up).

## 7. Pagination

- Query: `?page=1&pageSize=20`.
- Defaults: `page=1`, `pageSize=20`.
- Constraints: `pageSize` ∈ [1, 100]. `pageSize > 100` → 400 `VALIDATION_ERROR`.
- Response `meta`: `{ page, pageSize, totalItems, totalPages }`.
- `totalPages = Math.ceil(totalItems / pageSize)`. Khi `totalItems = 0` → `totalPages = 0`.
- Cursor pagination defer v1.1 (Architecture §8 R12).

**Implementation hint:** common DTO `PaginationQueryDto` chưa tồn tại trong code. Impl Module 4 tạo `server/src/common/dto/pagination.dto.ts` với `@Type(() => Number)`, `@IsInt`, `@Min(1)`, `@Max(100)` decorators.

## 8. Sort

- Query: `?sort=field:direction`. Direction ∈ {`asc`, `desc`}.
- Multiple sort: `?sort=created_at:desc&sort=name:asc`.
- Mỗi resource có default sort (xem module spec). Omit `sort` → áp default.
- Whitelist sort fields per resource. Field ngoài whitelist → 400 `VALIDATION_ERROR`.

## 9. Filter

- Query string flat, name-based per resource: `?status=active&trainerId=123`.
- Validate qua DTO + class-validator (`@IsOptional`, `@IsEnum`, ...).
- Datetime filter: `?from=2026-01-01&to=2026-12-31` (ISO date hoặc datetime).

## 10. Datetime

- Wire format: ISO 8601 UTC với millisecond, suffix `Z`. Ví dụ `2026-05-17T10:30:00.000Z`.
- Date-only fields (vd `start_date`, `date_of_birth`, `work_date`): `YYYY-MM-DD`.
- Client convert sang `Asia/Ho_Chi_Minh` (UTC+7) để display. Không gửi local time ở wire.
- Server-side business date dùng `today_vn` helper (Architecture §4.5.2):
  - SQL: `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`.
  - App: `dayjs().tz('Asia/Ho_Chi_Minh').startOf('day')`.
  - KHÔNG dùng `CURRENT_DATE` trực tiếp (UTC, sai 1 ngày quanh nửa đêm VN).
- Áp dụng `today_vn`: subscription `start_date`/`end_date`, `staff_schedules.work_date`, cron expire/activate, UC05B check-in validity.

## 11. ID Serialization

Mọi PK kiểu `BIGINT` (Prisma `BigInt`) serialize sang JSON dưới dạng string. `main.ts` patch `BigInt.prototype.toJSON = () => this.toString()`.

- Wire: `"userId": "1234567890"` (string).
- Client xử lý như string, KHÔNG `Number.parseInt` (mất precision khi > 2^53).
- JWT `sub`: luôn string.

## 12. Generated Codes

Server tự sinh code theo format (Database.md §Code Generation Rules):

| Resource | Format | Ví dụ |
|---|---|---|
| `members.member_code` | `MEM-{YYYY}-{6 digits}` | `MEM-2026-000123` |
| `staff.staff_code` | `STF-{YYYY}-{6 digits}` | `STF-2026-000045` |
| `packages.package_code` | `PKG-{4 digits}` | `PKG-0012` |
| `gym_rooms.room_code` | `RM-{3 digits}` | `RM-001` |
| `equipment.equipment_code` | `EQ-{6 digits}` | `EQ-000123` |

- Random + retry pattern: sinh code, check UNIQUE, retry tối đa 5 lần nếu collision (P2002).
- Sau 5 retry collision → 500 `<RESOURCE>_CODE_GENERATION_FAILED` (vd `MEMBER_CODE_GENERATION_FAILED`).
- Client KHÔNG được gửi code trong body — server overwrite/ignore.

## 13. Idempotency

V1.0 KHÔNG enforce `Idempotency-Key` header. Defer v1.1+ với Redis store (Architecture §8 R19).

Mitigation v1.0:

- `POST /payments`: UNIQUE `transaction_reference` → duplicate → 409 `DUPLICATE_VALUE`. Khi `method='cash'` không có reference → chấp nhận double-charge risk, audit log để detect.
- `POST /devices/access-events` (UC05B — Module 7): app-level dedup `(device_id, occurred_at)` 60s window.
- Mutation khác: client disable submit button + spinner, server-side rely on UNIQUE constraint nơi áp dụng.

## 14. Rate Limit

V1.0 không có rate limit toàn cục. Endpoint-specific:

| Endpoint | Limit | Implementation |
|---|---|---|
| `POST /auth/forgot-password` | 3/giờ/email | In-memory `Map<email, timestamp[]>` trong `AuthService` (Architecture §4.1.4) |
| `POST /auth/resend-verify` | 3/giờ/email | Cùng pattern |

- Quá limit → 429 `RATE_LIMIT_EXCEEDED`. Anti-enumeration cho forgot-password: trả 200 OK silently (không expose limit hit, không phân biệt email tồn tại).
- Reset khi restart API server (per-process state — chấp nhận v1.0 single-instance).
- Redis-backed global rate limiter defer v1.1 (Architecture §8 R12).

## 15. Business Rule Format

Mọi conditional behavior (rate limit, ownership, state validation, side effects) trong module spec dùng WHEN-THEN-ELSE (mandate `docs/CLAUDE.md §1.2`):

```text
WHEN member chưa verify email
THEN POST /subscriptions trả 403 EMAIL_NOT_VERIFIED
ELSE proceed sang validation tiếp theo
```

ELSE branch có thể bỏ nếu không có alternative path; nhưng decision rẽ nhánh PHẢI cover happy path + tất cả error path.

## 16. DTO Naming

- Request body class: `<Verb><Noun>Dto`. Ví dụ `LoginDto`, `CreateMemberDto`, `UpdateMemberDto`, `CancelSubscriptionDto`.
- Response: không dùng class wrapper. Trả raw resource shape inline trong service method return type. Pattern hiện tại: `LoginResult` interface (`auth.service.ts:10-18`).
- Query DTO: `<Resource>QueryDto` (vd `MembersQueryDto` cho `GET /members?status=...`).
- OpenAPI schema name:
  - Entity: `User`, `Member`, `Subscription`, `Payment`, `Package`.
  - Request body: `<Verb><Noun>Body` (vd `CreateMemberBody`).
  - Expanded relation: `<Resource>WithRelations` (vd `MemberWithSubscriptions`).

## 17. Example Payload Policy

- Markdown spec: 1 example happy path JSON per endpoint. Error responses chỉ liệt kê table (status / code / khi nào), không example body — shape đã standardize ở §5.2.
- OpenAPI: `example` field cho request body + 200 response. Error responses `$ref` shared `ErrorEnvelope` component.

## 18. Audit Logging

Action codes inventory (Architecture §4.4.1):

| Module | Codes |
|---|---|
| Auth | `auth.login` (success + failed với `payload.reason`), `auth.password-reset`, `auth.email-verify` |
| Member | `member.create`, `member.update`, `member.delete`, `member.assign-trainer` |
| Subscription | `subscription.create`, `subscription.renew`, `subscription.cancel`, `subscription.expire` |
| Payment | `payment.success`, `payment.fail` |
| Staff | `staff.create`, `staff.update`, `staff.delete`, `staff.assign-group` |
| Equipment | `equipment.create`, `equipment.delete`, `maintenance.create`, `maintenance.resolve` |
| Permission | `group.create`, `group.update`, `group.delete`, `group.assign-permission` |
| Attendance | `attendance.realtime-checkin`, `attendance.manual-checkin` |
| Training | `training.cancel`, `training.no_show` |

Defer v1.1 (cùng R20 lockout): `auth.lockout`, `auth.unlock`, `auth.admin-unlock`.

Implementation:

- NestJS interceptor `AuditInterceptor` + decorator `@Audit('action.code')` per route.
- Lưu `before_data` (NULL với create), `after_data` (NULL với delete), `ip_address`, `user_agent`, `actor_user_id`.
- KHÔNG log GET (Architecture §4.4.2).
- `auth.login` exception: ghi cả success + failed (401). Interceptor catch exception trước propagate. `actor_user_id` NULL khi credential không match user, lưu `payload.email_attempted`. Reason enum: `invalid_credentials | email_not_verified | user_disabled`.

## 19. Anti-enumeration

Endpoint cho phép public guess identity:

- `POST /auth/login`: trả 401 `UNAUTHORIZED` với cùng message bất kể email tồn tại hay sai password ("Email hoặc mật khẩu không đúng").
- `POST /auth/forgot-password`: trả 200 OK bất kể email tồn tại ("Nếu email tồn tại trong hệ thống, mã OTP đã được gửi").
- `POST /auth/resend-verify`: cùng pattern forgot-password.

KHÔNG để response phân biệt "email không tồn tại" vs "email tồn tại nhưng password sai" — leak existence.

## 20. Soft Delete vs Hard Delete

Trong response, resource đã soft-delete (`deleted_at IS NOT NULL`) KHÔNG xuất hiện ở list endpoint mặc định. Filter optional `?includeDeleted=true` (chỉ Owner role được dùng) để liệt kê. Xem Database.md §Soft Delete Convention cho list resource soft vs hard delete.

`DELETE /:resource/:id`:

- Soft-delete resource (members, staff, subscriptions, training_sessions, member_progress, feedback, staff_schedules, groups, packages, files, users): set `deleted_at = NOW()`, return 200 OK.
- Hard-delete resource (gym_rooms, equipment, maintenance_logs, payments, attendance_logs, audit_logs, permissions, junction tables, otp_codes): DELETE row vĩnh viễn. UC mô tả riêng (vd UC08 phòng tập, UC09 thiết bị).

## 21. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft — extract conventions từ Architecture §4 + code reality. |

## 22. Glossary

| Term | Definition |
|---|---|
| API base URL | Prefix `/api/v1` chung cho mọi endpoint API (trừ `/health`). |
| Audit action | Mã `resource.verb` ghi vào `audit_logs.action` khi mutation xảy ra (Architecture §4.4). |
| Error envelope | Shape JSON `{success: false, code, message, details?}` chuẩn hoá từ `HttpExceptionFilter`. |
| JWT | JSON Web Token, HS256, TTL 7 ngày, payload `{sub, email, roles}`. |
| Ownership guard | Custom NestJS guard kiểm tra resource thuộc về user gọi API (so JWT `sub` với `resource.userId`). |
| RBAC | Role-Based Access Control. 4 role v1.0: `owner`, `staff`, `pt`, `member`. |
| Soft delete | Set `deleted_at = NOW()` thay vì DELETE row. Resource ẩn khỏi query mặc định. |
| `today_vn` | Helper named convention cho ngày hiện tại theo timezone `Asia/Ho_Chi_Minh` (Architecture §4.5.2). |

Thuật ngữ domain (member_code, subscription, package, OTP) xem [`Database.md`](../Database.md) Glossary.
