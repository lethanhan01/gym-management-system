# Module 4 — Member / Subscription / Payment API

## 1. Mục đích module

Module 4 đặc tả endpoint quản lý hội viên + lượt đăng ký gói tập + thanh toán. Bao trùm 5 UC: đăng ký tại quầy (UC03A), đăng ký online (UC03B), gia hạn gói (UC04A), hủy gói (UC04B), theo dõi tiến độ (UC06). Subset UC11 (quản lý hội viên: list/update/delete) cũng nằm ở đây để giữ resource group nhất quán; quản lý nhân sự thuộc Module 5 Staff.

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/members/me` |
| 2 | `PATCH` | `/api/v1/members/me` |
| 3 | `GET` | `/api/v1/members/me/trainers` |
| 4 | `PATCH` | `/api/v1/members/me/trainer` |
| 5 | `POST` | `/api/v1/members/me/progress` |
| 6 | `GET` | `/api/v1/members` |
| 7 | `GET` | `/api/v1/members/:id` |
| 8 | `POST` | `/api/v1/members` |
| 9 | `POST` | `/api/v1/members/self-register` |
| 10 | `PATCH` | `/api/v1/members/:id` |
| 11 | `DELETE` | `/api/v1/members/:id` |
| 12 | `PATCH` | `/api/v1/members/:id/assign-trainer` |
| 13 | `GET` | `/api/v1/subscriptions` |
| 14 | `GET` | `/api/v1/subscriptions/member/:memberId` |
| 15 | `POST` | `/api/v1/subscriptions` |
| 16 | `PATCH` | `/api/v1/subscriptions/:id/cancel` |
| 17 | `POST` | `/api/v1/subscriptions/:id/renew` |
| 18 | `GET` | `/api/v1/subscriptions/:id` |
| 19 | `POST` | `/api/v1/payments` |
| 20 | `GET` | `/api/v1/payments` |
| 21 | `GET` | `/api/v1/members/:memberId/payment-accounts` |
| 22 | `POST` | `/api/v1/members/:memberId/payment-accounts` |
| 23 | `PATCH` | `/api/v1/members/:memberId/payment-accounts/:accountId` |
| 24 | `DELETE` | `/api/v1/members/:memberId/payment-accounts/:accountId` |

### 2.1 `GET /members/me`

**API method:** `GET`

**Endpoint URL:** `/api/v1/members/me`

**Mô tả:** Member lấy profile của chính mình. Không cần permission đặc biệt — chỉ cần JWT hợp lệ có `memberId`.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Response body:**

HTTP 200.

Cùng shape với GET /members/:id.

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
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | JWT hợp lệ nhưng user không gắn với hội viên nào (`memberId` null) |

### 2.2 `PATCH /members/me`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/members/me`

**Mô tả:** Member cập nhật profile của chính mình. Giới hạn field giống `PATCH /members/:id` khi Self caller (§3.5).

Auth: JWT Quyền: Authenticated

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `fullName` | string | no | `@Length(2, 100)` |
| `phone` | string | no | — |
| `dateOfBirth` | string (YYYY-MM-DD) | no | `@IsDateString` |
| `address` | string | no | `@Length(0, 200)` |

**Response body:**

HTTP 200.

Trả member object đầy đủ.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
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
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | JWT không gắn với hội viên |
| 409 | `DUPLICATE_VALUE` | Phone đã tồn tại ở user khác |

### 2.3 `GET /members/me/trainers`

**API method:** `GET`

**Endpoint URL:** `/api/v1/members/me/trainers`

**Mô tả:** Lấy danh sách PT khả dụng mà member có thể tự chọn (tự gán). Không cần permission đặc biệt.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "staffId": "3",
      "fullName": "Phạm PT C",
      "specialization": "Strength & Conditioning"
    }
  ]
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |

### 2.4 `PATCH /members/me/trainer`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/members/me/trainer`

**Mô tả:** Member tự gán hoặc hủy PT của mình. Khác với `PATCH /members/:id/assign-trainer` (yêu cầu `member.update` permission — Staff/Owner only), endpoint này cho phép member tự chọn.

Auth: JWT Quyền: Authenticated

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `trainerId` | integer \| null | no | FK `staff.staff_id`; `null` để hủy gán |

```json
{ "trainerId": 3 }
```

Gửi `{ "trainerId": null }` hoặc omit field để hủy gán PT.

**Response body:**

HTTP 200.

Trả member object sau khi update.

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
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 400 | `FK_CONSTRAINT` | `trainerId` không tồn tại hoặc không phải PT |

### 2.5 `POST /members/me/progress`

**API method:** `POST`

**Endpoint URL:** `/api/v1/members/me/progress`

**Mô tả:** Member tự ghi cân nặng và chiều cao. Không cần permission đặc biệt. Khác với POST progress do Staff/Trainer ghi (Module 7).

Auth: JWT Quyền: Authenticated

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `weight` | number | yes | `@Min(1)` `@Max(500)` — kg |
| `height` | number | no | `@Min(50)` `@Max(300)` — cm |

```json
{ "weight": 68.5, "height": 172 }
```

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "progressId": "45",
    "memberId": "5",
    "weight": 68.5,
    "height": 172,
    "recordedAt": "2026-06-19T08:00:00.000Z"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / weight out of range |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | JWT không gắn với hội viên |

### 2.6 `GET /members`

**API method:** `GET`

**Endpoint URL:** `/api/v1/members`

**Mô tả:** List hội viên với pagination + filter. Mặc định ẩn `deleted_at IS NOT NULL`.

Auth: JWT Quyền: member.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `page` | integer | no | 1 | `@Min(1)` |
| `pageSize` | integer | no | 20 | `@Min(1)` `@Max(100)` |
| `sort` | string | no | `created_at:desc` | whitelist: `created_at`, `member_code`, `full_name` |
| `status` | enum | no | — | `pending_verification`, `active`, `locked` (filter theo `users.status`) |
| `trainerId` | string | no | — | filter `primary_trainer_id` |
| `search` | string | no | — | match `member_code` ILIKE / `full_name` ILIKE |
| `includeDeleted` | boolean | no | false | chỉ Owner — bao gồm soft-deleted |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "userId": "7",
      "email": "a@gym.local",
      "fullName": "Nguyễn Văn A",
      "phone": "+84901234567",
      "status": "active",
      "dateOfBirth": "1995-06-15",
      "address": "12 Lê Lợi, Q1",
      "primaryTrainerId": "3",
      "createdAt": "2026-04-12T08:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 137, "totalPages": 7 }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Query param sai format / out-of-range / sort field ngoài whitelist |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner/Staff / `includeDeleted=true` mà role không phải Owner |

### 2.7 `GET /members/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/members/:id`

**Mô tả:** Lấy chi tiết 1 hội viên. PT chỉ thấy nếu là `primary_trainer_id`. Member chỉ thấy chính mình.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "userId": "7",
    "email": "a@gym.local",
    "fullName": "Nguyễn Văn A",
    "phone": "+84901234567",
    "status": "active",
    "emailVerifiedAt": "2026-04-12T08:30:00.000Z",
    "dateOfBirth": "1995-06-15",
    "address": "12 Lê Lợi, Q1",
    "primaryTrainerId": "3",
    "avatarFileId": "42",
    "createdAt": "2026-04-12T08:00:00.000Z"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 403 | `FORBIDDEN` | Thiếu quyền hoặc vi phạm ownership/business access; điều kiện cụ thể ghi bên dưới. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject (PT không phải primary, hoặc Member khác Self) |
| 404 | `NOT_FOUND` | `member_id` không tồn tại hoặc `deleted_at IS NOT NULL` (trừ Owner có `?includeDeleted=true`) |

### 2.8 `POST /members`

**API method:** `POST`

**Endpoint URL:** `/api/v1/members`

**Mô tả:** Staff tạo tài khoản hội viên mới tại quầy. Sinh `member_code` tự động (`MEM-YYYY-XXXXXX`). User tạo với `status='pending_verification'`; gửi OTP email verify (UC13). Subscription + Payment KHÔNG tạo cùng request — Staff gọi `POST /subscriptions` + `POST /payments` riêng sau khi member verify email (Architecture decision: tách atomic per-resource).

Auth: JWT Quyền: member.create

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` UNIQUE |
| `password` | string | yes | `@Length(8, 100)` |
| `fullName` | string | yes | `@Length(2, 100)` |
| `phone` | string | no | optional |
| `dateOfBirth` | string (YYYY-MM-DD) | yes | `@IsDateString` |
| `address` | string | no | `@Length(0, 200)` |
| `packageId` | integer | yes | FK `packages.package_id` |
| `paymentMethod` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `transactionReference` | string | no | — |

```json
{
  "email": "newmember@gym.local",
  "password": "InitPass123!",
  "fullName": "Nguyễn Văn A",
  "phone": "+84901234567",
  "dateOfBirth": "1995-06-15",
  "address": "12 Lê Lợi, Q1",
  "packageId": 3,
  "paymentMethod": "cash"
}
```

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "userId": "7",
    "email": "newmember@gym.local",
    "fullName": "Nguyễn Văn A",
    "status": "pending_verification",
    "createdAt": "2026-05-17T10:30:00.000Z"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Staff/Owner |
| 409 | `DUPLICATE_VALUE` | Email hoặc phone đã tồn tại (P2002) |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry 5 lần sinh `member_code` đều collision |

### 2.9 `POST /members/self-register`

**API method:** `POST`

**Endpoint URL:** `/api/v1/members/self-register`

**Mô tả:** Member tự đăng ký không cần Staff. Tạo user + member + OTP verify email. Optional: tạo subscription `pending` với `packageId` chọn từ landing page; subscription chuyển `active` sau khi member pay (cron daily 00:10 `subscription:activate-pending`) hoặc cancel sau 24-48h nếu chưa pay (cron `subscription:cancel-unpaid-pending`).

Auth: Public Quyền: Public

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` UNIQUE |
| `password` | string | yes | `@Length(8, 100)` |
| `fullName` | string | yes | `@Length(2, 100)` |
| `phone` | string | no | optional |
| `dateOfBirth` | string (YYYY-MM-DD) | no | `@IsDateString` |
| `address` | string | no | `@Length(0, 200)` |
| `packageId` | integer | no | FK `packages.package_id`, status='active', `deleted_at IS NULL` |

```json
{
  "email": "selfreg@gym.local",
  "password": "MyPass123!",
  "fullName": "Trần Thị B",
  "phone": "+84909999999",
  "dateOfBirth": "1998-03-22",
  "packageId": 3
}
```

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "memberId": "6",
    "memberCode": "MEM-2026-000006",
    "userId": "8",
    "email": "selfreg@gym.local",
    "status": "pending_verification",
    "subscription": {
      "subscriptionId": "12",
      "packageId": "3",
      "status": "pending"
    }
  }
}
```

`subscription` null nếu không truyền `packageId`.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `FK_CONSTRAINT` | `packageId` không tồn tại / `status='inactive'` / soft-deleted |
| 409 | `DUPLICATE_VALUE` | Email hoặc phone đã tồn tại |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry sinh code thất bại |

### 2.10 `PATCH /members/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/members/:id`

**Mô tả:** Cập nhật profile hội viên. Self chỉ được update subset field (`phone`, `address`, `dateOfBirth`, `fullName`); Staff/Owner update mọi field trừ system-managed (`memberId`, `memberCode`, `userId`, `status`).

Auth: JWT Quyền: Authenticated

**Request body:**

| Field | Type | Constraint | Self allowed |
|---|---|---|---|
| `fullName` | string | `@Length(2, 200)` | yes |
| `phone` | string | `@IsPhoneNumber('VN')` UNIQUE | yes |
| `dateOfBirth` | string (YYYY-MM-DD) | — | yes |
| `address` | string | `@MaxLength(200)` | yes |
| `primaryTrainerId` | string | FK `staff.staff_id` | no (Staff/Owner only — note: dùng `/assign-trainer` endpoint dưới đây thay vì PATCH chung) |

```json
{ "phone": "+84901234568", "address": "34 Trần Hưng Đạo, Q1" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Trả member object đầy đủ (giống GET /members/:id).

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 403 | `FORBIDDEN` | Thiếu quyền hoặc vi phạm ownership/business access; điều kiện cụ thể ghi bên dưới. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / chứa field không cho phép với role |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject / Self gửi field ngoài allowlist |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / soft-deleted |
| 409 | `DUPLICATE_VALUE` | Phone đã tồn tại ở user khác |

### 2.11 `DELETE /members/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/members/:id`

**Mô tả:** Soft-delete hội viên (`deleted_at = NOW()`). KHÔNG cascade subscription/payment — giữ history cho audit/refund. User account `users.deleted_at` cũng set; user mất quyền login.

Auth: JWT Quyền: member.delete

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 204 No Content. Không có response body.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / đã soft-deleted |

### 2.12 `PATCH /members/:id/assign-trainer`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/members/:id/assign-trainer`

**Mô tả:** Gán hoặc bỏ gán PT chính cho hội viên. PT chính ảnh hưởng UC06 (PT chỉ thấy member mình phụ trách).

Auth: JWT Quyền: member.update

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `trainerId` | string \| null | yes | FK `staff.staff_id` với `position='pt'` và `deleted_at IS NULL`, hoặc `null` để bỏ gán |

```json
{ "trainerId": "3" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "primaryTrainerId": "3",
    "primaryTrainerName": "Phạm PT C"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `FK_CONSTRAINT` | `trainerId` không tồn tại / không phải position `pt` / đã soft-delete |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner/Staff |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / soft-deleted |

### 2.13 `GET /subscriptions`

**API method:** `GET`

**Endpoint URL:** `/api/v1/subscriptions`

**Mô tả:** List lượt đăng ký gói. Self bắt buộc filter `memberId=self`.

Auth: JWT Quyền: subscription.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `memberId` | string | Self bắt buộc | — | FK `members.member_id` |
| `status` | enum | no | — | `pending`, `active`, `expired`, `cancelled` |
| `page` | integer | no | 1 | — |
| `pageSize` | integer | no | 20 | max 100 |
| `sort` | string | no | `start_date:desc` | whitelist: `start_date`, `end_date`, `created_at` |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "subscriptionId": "12",
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "packageId": "3",
      "packageName": "Gold 3 tháng",
      "startDate": "2026-05-01",
      "endDate": "2026-07-31",
      "status": "active",
      "cancelledAt": null,
      "createdAt": "2026-04-28T09:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Self không truyền `memberId=self` / truyền `memberId` khác |
| 403 | `MEMBER_PROFILE_NOT_FOUND` | Self token nhưng `jwt.sub` không có member profile (vd: staff user gọi endpoint với Self token). |

### 2.14 `GET /subscriptions/member/:memberId`

**API method:** `GET`

**Endpoint URL:** `/api/v1/subscriptions/member/:memberId`

**Mô tả:** List tất cả subscription của 1 member cụ thể, truy vấn qua path param thay vì query param. Tiện lợi cho Staff/Owner khi xem subscription history của một member.

Auth: JWT Quyền: subscription.read

**Request body:**

Không có request body.

**Path parameters:** `memberId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Cùng shape với GET /subscriptions.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không có `subscription.read` |
| 404 | `NOT_FOUND` | `memberId` không tồn tại |

### 2.15 `POST /subscriptions`

**API method:** `POST`

**Endpoint URL:** `/api/v1/subscriptions`

**Mô tả:** Tạo subscription mới cho member. Xử lý cả purchase mới + renewal qua state member hiện tại. Subscription tạo ở `pending` (chờ payment); chuyển `active` khi `POST /payments` thành công (nếu `start_date <= today_vn`) hoặc cron daily 00:10 `subscription:activate-pending` (khi `start_date` đến).

Auth: JWT Quyền: subscription.create

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | FK `members.member_id`, `status='active'`, `deleted_at IS NULL` |
| `packageId` | string | yes | FK `packages.package_id`, `status='active'`, `deleted_at IS NULL` |

```json
{ "memberId": "5", "packageId": "3" }
```

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "subscriptionId": "15",
    "memberId": "5",
    "packageId": "3",
    "startDate": "2026-08-01",
    "endDate": "2026-10-31",
    "status": "pending",
    "createdAt": "2026-05-17T10:30:00.000Z"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `FK_CONSTRAINT` | `memberId` / `packageId` không tồn tại |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Member gọi với `memberId` không phải self (OwnershipGuard) |
| 403 | `EMAIL_NOT_VERIFIED` | Self/member caller và member chưa verify email. Staff/Owner bypass (UC03A counter registration). |
| 409 | `SUBSCRIPTION_ALREADY_PENDING` | Member đã có subscription `pending` (chưa pay) |

### 2.16 `PATCH /subscriptions/:id/cancel`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/subscriptions/:id/cancel`

**Mô tả:** Hủy subscription `active` hoặc `pending`. Nếu member có subscription `pending` đã thanh toán (prepaid renewal), activate ngay trong cùng `$transaction` (cascade — Architecture §4.3.3). Không refund v1.0.

Auth: JWT Quyền: subscription.cancel

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `reason` | string | no | `@MaxLength(500)` — lưu vào audit `before_data.reason` |

```json
{ "reason": "Member chuyển nơi ở" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "cancelledSubscription": {
      "subscriptionId": "12",
      "status": "cancelled",
      "cancelledAt": "2026-05-17T10:30:00.000Z"
    },
    "activatedSubscription": {
      "subscriptionId": "15",
      "status": "active",
      "startDate": "2026-05-17",
      "endDate": "2026-08-15"
    }
  }
}
```

`activatedSubscription` = null nếu không có pending prepaid để cascade.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại / soft-deleted / đã `cancelled`/`expired` (P2025 hoặc filter no match) |
| 409 | `SUBSCRIPTION_NOT_CANCELLABLE` | Subscription `status` không phải `active` hoặc `pending` |

### 2.17 `POST /subscriptions/:id/renew`

**API method:** `POST`

**Endpoint URL:** `/api/v1/subscriptions/:id/renew`

**Mô tả:** Gia hạn subscription hiện tại — tạo subscription mới kế tiếp cùng member. Subscription mới bắt đầu ngay sau `end_date` của subscription hiện tại. Trả về 200 OK (không phải 201) vì là action trên resource đã tồn tại.

Auth: JWT Quyền: subscription.create

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `method` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `transactionReference` | string | no | optional |

```json
{ "method": "cash" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Trả subscription mới được tạo.

```json
{
  "success": true,
  "data": {
    "subscriptionId": "16",
    "memberId": "5",
    "packageId": "3",
    "startDate": "2026-08-01",
    "endDate": "2026-10-29",
    "status": "pending",
    "createdAt": "2026-06-19T10:00:00.000Z"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không có `subscription.create` |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại |

### 2.18 `GET /subscriptions/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/subscriptions/:id`

**Mô tả:** Lấy chi tiết 1 subscription. Self check qua `subscription.member.user_id = jwt.sub`.

Auth: JWT Quyền: subscription.read

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Cùng shape item của §4.1 + thêm field `package` expanded:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "12",
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "package": {
      "packageId": "3",
      "packageCode": "PKG-0003",
      "name": "Gold 3 tháng",
      "durationDays": 90,
      "price": "3000000.00"
    },
    "startDate": "2026-05-01",
    "endDate": "2026-07-29",
    "status": "active",
    "cancelledAt": null,
    "createdAt": "2026-04-28T09:00:00.000Z"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại / soft-deleted |

### 2.19 `POST /payments`

**API method:** `POST`

**Endpoint URL:** `/api/v1/payments`

**Mô tả:** Staff ghi nhận thanh toán cho subscription `pending`. Nếu `status='success'` AND subscription `start_date <= today_vn` AND không có subscription `active` đang chiếm slot → activate ngay (cùng `$transaction`). Ngược lại giữ `pending`, cron daily 00:10 activate khi `start_date` đến.

Auth: JWT Quyền: payment.create

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | FK `members.member_id` |
| `subscriptionId` | string | yes | FK `subscriptions.subscription_id`, `status='pending'` |
| `amount` | string (decimal) | yes | `> 0`, không phần thập phân khác 0 (VND integer) |
| `method` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `transactionReference` | string | conditional | UNIQUE; required khi `method != 'cash'`; nullable khi `method='cash'` |
| `status` | enum | no | `success` (default), `failed` |

```json
{
  "memberId": "5",
  "subscriptionId": "12",
  "amount": "3000000.00",
  "method": "bank_card",
  "transactionReference": "VPB-20260517-0001",
  "status": "success"
}
```

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "paymentId": "33",
    "memberId": "5",
    "subscriptionId": "12",
    "amount": "3000000.00",
    "method": "bank_card",
    "transactionReference": "VPB-20260517-0001",
    "status": "success",
    "paidAt": "2026-05-17T10:30:00.000Z",
    "subscription": {
      "subscriptionId": "12",
      "status": "active",
      "startDate": "2026-05-17",
      "endDate": "2026-08-14"
    }
  }
}
```

`subscription.status` trả `active` nếu activate ngay, `pending` nếu chờ cron.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / amount không match `package.price` ± rounding (validate optional, defer khi cần discount logic) |
| 400 | `FK_CONSTRAINT` | `memberId` / `subscriptionId` không tồn tại |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Staff/Owner |
| 409 | `DUPLICATE_VALUE` | `transactionReference` đã tồn tại (P2002) |
| 409 | `SUBSCRIPTION_NOT_PENDING` | `subscription.status != 'pending'` |

### 2.20 `GET /payments`

**API method:** `GET`

**Endpoint URL:** `/api/v1/payments`

**Mô tả:** List payments. Self bắt buộc `memberId=self`. Filter theo subscription / status / date range.

Auth: JWT Quyền: payment.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `memberId` | string | Self bắt buộc | — | FK |
| `subscriptionId` | string | no | — | FK |
| `status` | enum | no | — | `success`, `failed` |
| `method` | enum | no | — | `cash`, `bank_card`, `ewallet` |
| `from` | string (ISO date) | no | — | filter `paid_at >= from` |
| `to` | string (ISO date) | no | — | filter `paid_at <= to` |
| `page` | integer | no | 1 | — |
| `pageSize` | integer | no | 20 | max 100 |
| `sort` | string | no | `paid_at:desc` | whitelist: `paid_at`, `amount` |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "paymentId": "33",
      "memberId": "5",
      "subscriptionId": "12",
      "amount": "3000000.00",
      "method": "bank_card",
      "transactionReference": "VPB-20260517-0001",
      "status": "success",
      "paidAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 4, "totalPages": 1 }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Self không truyền `memberId=self` / truyền `memberId` khác |

### 2.21 `GET /members/:memberId/payment-accounts`

**API method:** `GET`

**Endpoint URL:** `/api/v1/members/:memberId/payment-accounts`

**Mô tả:** Lấy danh sách tài khoản thanh toán của member.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Path parameters:** `memberId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
[
  {
    "id": 1,
    "memberId": "5",
    "type": "bank_card",
    "provider": "Vietcombank",
    "accountRef": "****1234",
    "label": "Thẻ chính",
    "isDefault": true
  }
]
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self và không phải staff/owner |

### 2.22 `POST /members/:memberId/payment-accounts`

**API method:** `POST`

**Endpoint URL:** `/api/v1/members/:memberId/payment-accounts`

**Mô tả:** Tạo tài khoản thanh toán mới cho member.

Auth: JWT Quyền: Authenticated

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `type` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `provider` | string | no | `@Length(0, 100)` |
| `accountRef` | string | no | `@Length(0, 100)` |
| `label` | string | no | `@Length(0, 100)` |
| `isDefault` | boolean | no | — |

```json
{ "type": "bank_card", "provider": "Vietcombank", "accountRef": "1234567890", "label": "Thẻ chính", "isDefault": true }
```

**Path parameters:** `memberId` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

Trả payment account object vừa tạo.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self và không phải staff/owner |

### 2.23 `PATCH /members/:memberId/payment-accounts/:accountId`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/members/:memberId/payment-accounts/:accountId`

**Mô tả:** Đặt tài khoản thanh toán làm default. Action duy nhất là set default — không update các field khác.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Path parameters:**

- `memberId` = member ID (integer)
- `accountId` = payment account ID (integer)

**Response body:**

HTTP 200.

Trả payment account object sau update.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self/staff/owner hoặc `accountId` không tồn tại |

### 2.24 `DELETE /members/:memberId/payment-accounts/:accountId`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/members/:memberId/payment-accounts/:accountId`

**Mô tả:** Xóa tài khoản thanh toán.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Path parameters:**

- `memberId` = member ID (integer)
- `accountId` = payment account ID (integer)

**Response body:**

HTTP 204 No Content. Không có response body.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self/staff/owner hoặc `accountId` không tồn tại |
