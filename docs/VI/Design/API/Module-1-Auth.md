# Module 1 — Auth API

## 1. Mục đích module

Module 1 đặc tả endpoint authentication: login, logout, profile fetch, password reset (OTP), email verification (OTP), change password. Mọi endpoint dùng response/error envelope chung tại [`conventions.md §5`](./conventions.md#5-response-envelope).

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `POST` | `/api/v1/auth/login` |
| 2 | `POST` | `/api/v1/auth/logout` |
| 3 | `GET` | `/api/v1/auth/me` |
| 4 | `POST` | `/api/v1/auth/forgot-password` |
| 5 | `POST` | `/api/v1/auth/reset-password` |
| 6 | `POST` | `/api/v1/auth/verify-email` |
| 7 | `POST` | `/api/v1/auth/resend-verify` |
| 8 | `POST` | `/api/v1/auth/line-login` |
| 9 | `POST` | `/api/v1/auth/change-password` |

### 2.1 `POST /auth/login`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/login`

**Mô tả:** Xác thực email + password, trả JWT 7-day TTL kèm thông tin user. Audit `auth.login` ghi cả thành công lẫn thất bại.

Auth: Public Quyền: Public

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |
| `password` | string | yes | `@MinLength(8)` |

```json
{ "email": "owner@gym.local", "password": "Password123!" }
```

**Response body:**

HTTP 200.

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

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 401 | `UNAUTHORIZED` | Thông tin xác thực hoặc credential không hợp lệ; điều kiện cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / thiếu field |
| 401 | `UNAUTHORIZED` | Email không tồn tại / sai password / `status='locked'` / `status='pending_verification'` |

### 2.2 `POST /auth/logout`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/logout`

**Mô tả:** JWT stateless v1.0 — server không invalidate token. Endpoint chỉ log action; client chịu trách nhiệm xoá token khỏi storage. Token blacklist defer v1.1 (ADR-008, R1).

Auth: JWT Quyền: Authenticated

**Request body:**

Không.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "message": "Đã đăng xuất khỏi tài khoản owner@gym.local"
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu / sai / expired |

### 2.3 `GET /auth/me`

**API method:** `GET`

**Endpoint URL:** `/api/v1/auth/me`

**Mô tả:** Trả thông tin user hiện tại theo JWT `sub`. Dùng cho client refresh state sau page reload.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có body / query param.

**Response body:**

HTTP 200.

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

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu / sai / expired |
| 404 | `NOT_FOUND` | User trong JWT đã bị xoá / deactivate (`deleted_at IS NOT NULL`) |

### 2.4 `POST /auth/forgot-password`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/forgot-password`

**Mô tả:** Sinh OTP 6 chữ số cho `purpose='password_reset'`, hash bcrypt, lưu `otp_codes` với TTL 10 phút. Gửi OTP qua email (v1.0 log stdout, chờ SMTP integration). Response anti-enumeration: luôn 200 OK bất kể email tồn tại.

Auth: Public Quyền: Public

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |

```json
{ "email": "owner@gym.local" }
```

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "message": "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi"
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 429 | `RATE_LIMIT_EXCEEDED` | Vượt giới hạn số request của endpoint. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Email sai format |
| 429 | `RATE_LIMIT_EXCEEDED` | Quá 3 request/giờ/email — note: silently trả 200 OK anti-enumeration (xem business rules) |

### 2.5 `POST /auth/reset-password`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/reset-password`

**Mô tả:** Verify OTP, cập nhật `password_hash` mới, xoá tất cả OTP `purpose='password_reset'` của user trong cùng `$transaction`. Anti-replay: OTP xoá sau khi dùng.

Auth: Public Quyền: Public

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |
| `otp` | string | yes | `@Length(6, 10)` (v1.0 OTP 6 chữ số, schema chấp nhận rộng hơn để chuyển đổi) |
| `newPassword` | string | yes | `@MinLength(8)` |

```json
{ "email": "owner@gym.local", "otp": "123456", "newPassword": "NewPass123!" }
```

**Response body:**

HTTP 200.

```json
{ "success": true, "message": "Đặt lại mật khẩu thành công" }
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 401 | `UNAUTHORIZED` | Thông tin xác thực hoặc credential không hợp lệ; điều kiện cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | Email không match user / OTP không tồn tại / OTP sai / OTP hết hạn (cùng message anti-replay) |

### 2.6 `POST /auth/verify-email`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/verify-email`

**Mô tả:** Verify OTP `purpose='email_verify'` để chuyển user `status='pending_verification'` → `active`. Trigger từ UC03A (staff tạo member tại quầy) hoặc UC03B (member tự đăng ký online) hoặc UC11 (Owner tạo staff).

Auth: Public Quyền: Public

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |
| `otp` | string | yes | `@Length(6, 6)` (strict 6 chữ số) |

```json
{ "email": "newmember@gym.local", "otp": "654321" }
```

**Response body:**

HTTP 200.

```json
{ "success": true, "message": "Xác thực email thành công" }
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `OTP_INVALID` | OTP sai (không khớp hash) |
| 404 | `NOT_FOUND` | Email không tồn tại hoặc không có OTP active cho `purpose='email_verify'` |
| 410 | `OTP_EXPIRED` | OTP còn record nhưng `expires_at <= NOW()` |
| 409 | `EMAIL_ALREADY_VERIFIED` | `users.email_verified_at IS NOT NULL` |

### 2.7 `POST /auth/resend-verify`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/resend-verify`

**Mô tả:** Sinh OTP mới cho `purpose='email_verify'`, invalidate OTP cũ. Response anti-enumeration: 200 OK bất kể email tồn tại / đã verify.

Auth: Public Quyền: Public

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` |

```json
{ "email": "newmember@gym.local" }
```

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "message": "Nếu email tồn tại và chưa xác thực, mã OTP mới đã được gửi"
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 429 | `RATE_LIMIT_EXCEEDED` | Vượt giới hạn số request của endpoint. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Email sai format |
| 429 | `RATE_LIMIT_EXCEEDED` | Quá limit — silently trả 200 OK anti-enumeration |

### 2.8 `POST /auth/line-login`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/line-login`

**Mô tả:** Xác thực bằng LINE LIFF ID token. Chỉ dành cho role `member`. Non-member bị reject 403. Nếu LINE user chưa có tài khoản, tự động tạo User + Member.

Auth: Public Quyền: Public

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `idToken` | string | Có | ID token từ LIFF SDK (`liff.getIDToken()`) |

```json
{ "idToken": "eyJhbGci..." }
```

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "userId": "42",
      "email": "taro@example.com",
      "fullName": "Taro Line",
      "roles": ["member"]
    }
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 401 | `UNAUTHORIZED` | Thông tin xác thực hoặc credential không hợp lệ; điều kiện cụ thể ghi bên dưới. |
| 403 | `FORBIDDEN` | Thiếu quyền hoặc vi phạm ownership/business access; điều kiện cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `idToken` rỗng hoặc thiếu |
| 401 | `LINE_AUTH_FAILED` | LINE từ chối token hoặc `LINE_CHANNEL_ID` chưa cấu hình |
| 401 | `ACCOUNT_LOCKED` | Tài khoản bị khóa |
| 403 | `LINE_LOGIN_MEMBER_ONLY` | User có role staff/trainer/owner |

### 2.9 `POST /auth/change-password`

**API method:** `POST`

**Endpoint URL:** `/api/v1/auth/change-password`

**Mô tả:** Thay đổi mật khẩu của user hiện tại. Yêu cầu mật khẩu hiện tại để xác nhận danh tính.

Auth: JWT Quyền: Authenticated

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `currentPassword` | string | yes | hiện tại phải đúng |
| `newPassword` | string | yes | `@MinLength(8)` |

```json
{ "currentPassword": "OldPass123!", "newPassword": "NewPass123!" }
```

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công"
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body thiếu field / `currentPassword` không đúng / `newPassword < 8 ký tự` |
| 401 | `UNAUTHORIZED` | JWT thiếu / sai / expired |
