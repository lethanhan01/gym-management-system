# Module 1 — Auth API

| Field | Value |
|---|---|
| Document ID | GMS-API-M1-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD |
| Last Updated | 2026-05-17 |
| Related docs | [`conventions.md`](./conventions.md), [`Architecture.md §4.1`](../Architecture.md), [`SRS_VI.md UC00-UC02`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 1 đặc tả endpoint authentication: login, logout, profile fetch, password reset (OTP), email verification (OTP). Mọi endpoint dùng response/error envelope chung tại [`conventions.md §5`](./conventions.md#5-response-envelope).

In-scope: 7 endpoint (5 đã implement, 2 cần build cho UC13 email verify).

Out-of-scope:

- Refresh token, token blacklist (defer v1.1 — Architecture ADR-008, R1).
- Login lockout, MFA (defer v1.1 — R20, R23).
- Permission-code-based authorization (defer Module 2 RBAC spec).
- SMTP integration (endpoint shape không phụ thuộc — Architecture §8 R8).

## 2. Endpoint Inventory

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | UC00 | Public | — | Implemented |
| 2 | POST | `/auth/logout` | UC01 | JWT | All roles | Implemented |
| 3 | GET | `/auth/me` | UC00 | JWT | All roles | Implemented |
| 4 | POST | `/auth/forgot-password` | UC02 | Public | — | Implemented |
| 5 | POST | `/auth/reset-password` | UC02 | Public | — | Implemented |
| 6 | POST | `/auth/verify-email` | UC13 (Architecture §4.1.3) | Public | — | **NEW** |
| 7 | POST | `/auth/resend-verify` | UC13 | Public | — | **NEW** |

---

## 3. Endpoints

### 3.1 POST /auth/login

**UC:** UC00 — Đăng nhập
**Auth:** Public
**RBAC:** —

**Description:** Xác thực email + password, trả JWT 7-day TTL kèm thông tin user. Audit `auth.login` ghi cả thành công lẫn thất bại.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |
| `password` | string | yes | `@MinLength(8)` |

```json
{ "email": "owner@gym.local", "password": "Password123!" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "1",
      "email": "owner@gym.local",
      "fullName": "Lê Thanh An",
      "roles": ["owner"]
    }
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / thiếu field |
| 401 | `UNAUTHORIZED` | Email không tồn tại / sai password / `status='locked'` / `status='pending_verification'` |

**Business rules:**

```text
WHEN email không khớp user nào
THEN 401 "Email hoặc mật khẩu không đúng" (anti-enumeration, conventions §19)
ELSE check password

WHEN bcrypt compare fail
THEN 401 cùng message anti-enumeration
ELSE check status

WHEN user.status = 'locked'
THEN 401 "Tài khoản đã bị khoá"
ELSE issue JWT

WHEN user.status = 'pending_verification'
THEN 401 "Tài khoản chưa xác thực email" (reason='email_not_verified')
ELSE issue JWT với payload {sub, email, roles}
```

**Audit:** `auth.login`. Payload `{success: boolean, reason?: 'invalid_credentials'|'email_not_verified'|'user_disabled'}`. Ghi cả thành công lẫn 401 (interceptor catch trước propagate). `actor_user_id` NULL nếu email không match user, lưu `payload.email_attempted`.

**Rate limit:** Không v1.0. Brute-force mitigation: bcrypt cost 10 + global WAF khi pre-production. Login lockout defer v1.1 R20.

---

### 3.2 POST /auth/logout

**UC:** UC01 — Đăng xuất
**Auth:** JWT required
**RBAC:** All roles

**Description:** JWT stateless v1.0 — server không invalidate token. Endpoint chỉ log action; client chịu trách nhiệm xoá token khỏi storage. Token blacklist defer v1.1 (ADR-008, R1).

**Request body:** Không.

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Đã đăng xuất khỏi tài khoản owner@gym.local"
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu / sai / expired |

**Audit:** Không (v1.0 chỉ log application-level, không vào `audit_logs` vì không có state change).

**Rate limit:** Không.

**Notes:** Sau v1.1 token blacklist implement, endpoint sẽ INSERT `revoked_tokens (jti, exp)`. JWT issue phải có claim `jti` từ trước — schema migration kèm.

---

### 3.3 GET /auth/me

**UC:** UC00 — Đăng nhập (post-login profile fetch)
**Auth:** JWT required
**RBAC:** All roles

**Description:** Trả thông tin user hiện tại theo JWT `sub`. Dùng cho client refresh state sau page reload.

**Request:** Không có body / query param.

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "userId": "1",
    "email": "owner@gym.local",
    "phone": "+84901234567",
    "fullName": "Lê Thanh An",
    "status": "active",
    "roles": ["owner"]
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu / sai / expired |
| 404 | `NOT_FOUND` | User trong JWT đã bị xoá / deactivate (`deleted_at IS NOT NULL`) |

**Audit:** Không (GET request, conventions §18).

**Rate limit:** Không.

**Notes:**

- `roles` resolve mỗi request qua `UsersService.findByIdWithRoles()` (join `user_groups → groups`). Không cache.
- `phone` có thể NULL — phone UNIQUE nhưng nullable (Database.md §USER).
- Nếu admin đổi group user (Module 2), thay đổi chỉ hiển thị sau khi user gọi `/auth/me` hoặc re-login. JWT payload `roles` đã stale (xem `.claude/rules/security.md`).

---

### 3.4 POST /auth/forgot-password

**UC:** UC02 — Quên mật khẩu (yêu cầu OTP)
**Auth:** Public
**RBAC:** —

**Description:** Sinh OTP 6 chữ số cho `purpose='password_reset'`, hash bcrypt, lưu `otp_codes` với TTL 10 phút. Gửi OTP qua email (v1.0 log stdout, chờ SMTP integration). Response anti-enumeration: luôn 200 OK bất kể email tồn tại.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |

```json
{ "email": "owner@gym.local" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi"
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Email sai format |
| 429 | `RATE_LIMIT_EXCEEDED` | Quá 3 request/giờ/email — note: silently trả 200 OK anti-enumeration (xem business rules) |

**Business rules:**

```text
WHEN email không match user
THEN 200 OK silently (anti-enumeration, conventions §19)
ELSE proceed

WHEN > 3 request/giờ trên cùng email
THEN 200 OK silently, KHÔNG sinh OTP, KHÔNG gửi mail
ELSE proceed

WHEN proceed
THEN $transaction(DELETE old otp_codes WHERE user_id=? AND purpose='password_reset'; INSERT new) — single-active OTP invariant (Architecture §4.1.4)
AND log OTP stdout v1.0 (TODO: gửi email khi SMTP ready)
```

**Audit:** `auth.password-reset` payload `{step: 'request', email_attempted}`. Ghi cả khi không sinh OTP (anti-enumeration không leak qua audit vì Owner mới xem được).

**Rate limit:** 3 request/giờ/email (conventions §14). In-memory `Map<email, timestamp[]>` trong `AuthService`.

**Notes:**

- OTP 6 chữ số từ `crypto.randomInt(100000, 1000000)` (`auth.service.ts:67`).
- Hash bcrypt cost 10 (`auth.service.ts:68`).
- `otp_codes.purpose = 'password_reset'` (Database.md `otp_codes` convention).
- SMTP integration pending (Architecture §8 R8). V1.0 `console.log(otp)`.

---

### 3.5 POST /auth/reset-password

**UC:** UC02 — Đặt lại mật khẩu bằng OTP
**Auth:** Public
**RBAC:** —

**Description:** Verify OTP, cập nhật `password_hash` mới, xoá tất cả OTP của user trong cùng `$transaction`. Anti-replay: OTP xoá sau khi dùng.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |
| `otp` | string | yes | `@Length(6, 10)` (v1.0 OTP 6 chữ số, schema chấp nhận rộng hơn để chuyển đổi) |
| `newPassword` | string | yes | `@MinLength(8)` |

```json
{ "email": "owner@gym.local", "otp": "123456", "newPassword": "NewPass123!" }
```

**Response 200 OK:**

```json
{ "success": true, "message": "Đặt lại mật khẩu thành công" }
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | Email không match user / OTP không tồn tại / OTP sai / OTP hết hạn (cùng message anti-replay) |

**Business rules:**

```text
WHEN email không match user
THEN 401 "OTP không hợp lệ hoặc đã hết hạn"
ELSE proceed

WHEN không tồn tại otp_codes WHERE user_id=? AND purpose='password_reset' AND expires_at > NOW()
THEN 401 cùng message
ELSE proceed

WHEN bcrypt.compare(otp, codeHash) fail
THEN 401 cùng message
ELSE $transaction(UPDATE users.password_hash = bcrypt(newPassword, 12); DELETE otp_codes WHERE user_id=?)
```

**Audit:** `auth.password-reset` payload `{step: 'complete', success: boolean}`.

**Rate limit:** Không direct. OTP TTL 10 phút + delete-on-use đã ngăn brute-force chính.

**Notes:**

- Bcrypt cost 12 cho password (cost 10 cho OTP — `auth.service.ts:97` vs `:68`).
- DELETE all OTP của user (không chỉ row vừa verify) — tránh OTP cũ khác purpose lingering. Lưu ý cho v1.1 khi có multi-purpose OTP đồng thời.
- `attempt_count >= 5` defer (Architecture §4.1.3 mention nhưng code v1.0 chưa enforce — implement khi UC13 verify-email build).

---

### 3.6 POST /auth/verify-email

**UC:** UC13 — Xác thực email (Architecture §4.1.3)
**Auth:** Public
**RBAC:** —
**Status:** NEW (chưa implement code)

**Description:** Verify OTP `purpose='email_verify'` để chuyển user `status='pending_verification'` → `active`. Trigger từ UC03A (staff tạo member tại quầy) hoặc UC03B (member tự đăng ký online) hoặc UC11 (Owner tạo staff).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |
| `otp` | string | yes | `@Length(6, 6)` (strict 6 chữ số) |

```json
{ "email": "newmember@gym.local", "otp": "654321" }
```

**Response 200 OK:**

```json
{ "success": true, "message": "Xác thực email thành công" }
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `OTP_INVALID` | OTP sai (không khớp hash) |
| 404 | `NOT_FOUND` | Email không tồn tại hoặc không có OTP active cho `purpose='email_verify'` |
| 410 | `OTP_EXPIRED` | OTP còn record nhưng `expires_at <= NOW()` |
| 409 | `EMAIL_ALREADY_VERIFIED` | `users.email_verified_at IS NOT NULL` |

**Business rules:**

```text
WHEN users.email_verified_at IS NOT NULL
THEN 409 EMAIL_ALREADY_VERIFIED
ELSE proceed

WHEN không tồn tại otp_codes WHERE user_id=? AND purpose='email_verify'
THEN 404 NOT_FOUND
ELSE proceed

WHEN otp_codes.expires_at <= NOW()
THEN 410 OTP_EXPIRED
ELSE proceed

WHEN otp_codes.attempt_count >= 5
THEN DELETE otp_codes row, trả 410 OTP_EXPIRED (force resend)
ELSE proceed

WHEN bcrypt.compare(otp, codeHash) fail
THEN UPDATE otp_codes.attempt_count += 1, trả 400 OTP_INVALID
ELSE $transaction(UPDATE users SET email_verified_at=NOW(), status='active'; DELETE otp_codes WHERE user_id=? AND purpose='email_verify'; INSERT audit_logs)
```

**Audit:** `auth.email-verify` payload `{success: boolean}`. Ghi cả thành công + 400 OTP_INVALID (xem attempt_count counter).

**Rate limit:** Không direct (attempt_count counter trên OTP record đủ).

**Notes:**

- OTP TTL 10 phút (Architecture §4.1.3).
- `attempt_count` lưu trên `otp_codes` row (Database.md), tăng mỗi lần verify fail. ≥ 5 → invalidate OTP, user phải request lại qua `/auth/resend-verify`.
- `status='active'` set cùng `email_verified_at` để client `/auth/login` ngay sau verify thành công không bị 401 `email_not_verified`.
- Sequence diagram đầy đủ: Architecture §4.1.3.

---

### 3.7 POST /auth/resend-verify

**UC:** UC13 — Gửi lại email verify
**Auth:** Public
**RBAC:** —
**Status:** NEW (chưa implement code)

**Description:** Sinh OTP mới cho `purpose='email_verify'`, invalidate OTP cũ. Response anti-enumeration: 200 OK bất kể email tồn tại / đã verify.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |

```json
{ "email": "newmember@gym.local" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Nếu email tồn tại và chưa xác thực, mã OTP mới đã được gửi"
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Email sai format |
| 429 | `RATE_LIMIT_EXCEEDED` | Quá limit — silently trả 200 OK anti-enumeration |

**Business rules:**

```text
WHEN email không match user
THEN 200 OK silently
ELSE proceed

WHEN users.email_verified_at IS NOT NULL
THEN 200 OK silently, KHÔNG sinh OTP
ELSE proceed

WHEN > 3 request/giờ trên cùng email
THEN 200 OK silently, KHÔNG sinh OTP
ELSE $transaction(DELETE old otp_codes WHERE user_id=? AND purpose='email_verify'; INSERT new với expires_at=NOW()+10min, attempt_count=0)
AND log OTP stdout v1.0 (TODO: gửi email khi SMTP ready)
```

**Audit:** `auth.email-verify` payload `{step: 'resend', email_attempted}`.

**Rate limit:** 3 request/giờ/email (cùng pattern forgot-password, conventions §14).

**Notes:**

- Single-active OTP invariant: DELETE-before-INSERT trong cùng `$transaction` (Architecture §4.1.3 phase 7 fix). KHÔNG add UNIQUE constraint DB — application enforce.
- Architecture §4.1.3 ghi rate limit 1 request/60s/email. Spec này dùng 3/giờ thống nhất với `/forgot-password` (Architecture §4.1.4). Khi impl pick một — đề xuất 3/giờ vì user có thể typo email lần đầu cần resend nhanh trong 60s.
- SMTP integration pending (Architecture §8 R8).

---

## 4. Domain Error Codes

Codes specific cho Module 1 (ngoài standard codes ở `conventions.md §6`):

| Code | HTTP | Trigger |
|---|---|---|
| `OTP_INVALID` | 400 | OTP không khớp bcrypt hash (verify-email) |
| `OTP_EXPIRED` | 410 | OTP record tồn tại nhưng `expires_at <= NOW()` hoặc `attempt_count >= 5` |
| `EMAIL_ALREADY_VERIFIED` | 409 | Gọi `verify-email` khi `users.email_verified_at IS NOT NULL` |

`UNAUTHORIZED` cho login/reset-password dùng cùng message anti-enumeration, không phân biệt cause.

## 5. Implementation Status

| Endpoint | Code state | Gap so với spec |
|---|---|---|
| POST /auth/login | Implemented | Audit `auth.login` failed login chưa interceptor catch — implement khi build Module 1 audit. `status='pending_verification'` 401 chưa enforce (code chỉ check `locked`). |
| POST /auth/logout | Implemented | OK. Token blacklist defer v1.1. |
| GET /auth/me | Implemented | OK. `404 NOT_FOUND` khi user `deleted_at` chưa filter — verify khi soft-delete user (UC10 / Module 2). |
| POST /auth/forgot-password | Implemented | Rate limit 3/h chưa implement. OTP gửi qua `console.log`, chờ SMTP. `audit_logs` ghi pending. |
| POST /auth/reset-password | Implemented | `@Length(6,10)` lỏng — siết `@Length(6,6)` khi UC13 verify-email build. Audit pending. |
| POST /auth/verify-email | NEW | Endpoint + service + audit + email send. |
| POST /auth/resend-verify | NEW | Endpoint + service + rate limit + audit. |

## 6. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft — 7 endpoint (5 implemented + 2 NEW UC13). |
