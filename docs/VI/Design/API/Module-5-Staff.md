# Module 5 — Staff API

## 1. Mục đích module

Module 5 đặc tả endpoint quản lý nhân viên: thông tin staff (`staff`, `users`), lịch làm việc (`staff_schedules`), và chấm công (`staff_attendance_logs`). Bao trùm UC11 (Quản lý nhân viên và lịch làm việc).

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/staff/me` |
| 2 | `GET` | `/api/v1/staff` |
| 3 | `POST` | `/api/v1/staff` |
| 4 | `GET` | `/api/v1/staff/trainers` |
| 5 | `GET` | `/api/v1/staff/:id` |
| 6 | `PATCH` | `/api/v1/staff/:id` |
| 7 | `DELETE` | `/api/v1/staff/:id` |
| 8 | `GET` | `/api/v1/staff/schedules/range` |
| 9 | `GET` | `/api/v1/staff/:id/schedules` |
| 10 | `POST` | `/api/v1/staff/:id/schedules` |
| 11 | `DELETE` | `/api/v1/staff/:id/schedules/:scheduleId` |
| 12 | `POST` | `/api/v1/staff/me/attendance/check-in` |
| 13 | `POST` | `/api/v1/staff/me/attendance/check-out` |
| 14 | `GET` | `/api/v1/staff/me/attendance` |

### 2.1 `GET /staff/me`

**API method:** `GET`

**Endpoint URL:** `/api/v1/staff/me`

**Mô tả:** Trả thông tin staff của user hiện tại. Dùng `user.staffId` từ JWT; không nhận path param. Nếu user không có staff profile (không phải staff account) → 400 `STAFF_PROFILE_MISSING`.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "staff",
    "fullName": "Nguyen Van A",
    "email": "nva@gym.local",
    "phone": "0901234567",
    "status": "active",
    "deletedAt": null
  }
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

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId` (không phải staff account). |
| 401 | `UNAUTHORIZED` | — |

### 2.2 `GET /staff`

**API method:** `GET`

**Endpoint URL:** `/api/v1/staff`

**Mô tả:** List staff có pagination + filter. Mặc định chỉ trả active records (`deletedAt IS NULL`). Caller có `staff.read` (owner + staff) đều thấy toàn bộ danh sách — không có ownership filter.

Auth: JWT Quyền: staff.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `sort` | string | `staff_code:asc` | Whitelist: `staffCode:asc`, `staffCode:desc`, `fullName:asc`, `fullName:desc`. |
| `position` | string | — | Filter theo vị trí: `owner` / `staff` / `trainer` / `member`. |
| `status` | string | `active` | `active` = chỉ `deletedAt IS NULL`; `deleted` = chỉ `deletedAt IS NOT NULL`. Chỉ owner mới được dùng `status=deleted`. |
| `search` | string | — | Tìm kiếm theo `staffCode`, `fullName`, hoặc `email` (case-insensitive contains). |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1",
      "userId": "5",
      "staffCode": "STF-2026-000001",
      "position": "staff",
      "fullName": "Nguyen Van A",
      "email": "nva@gym.local",
      "phone": "0901234567",
      "status": "active",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 12, "totalPages": 1 }
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

`401`, `403` (thiếu `staff.read`).

### 2.3 `POST /staff`

**API method:** `POST`

**Endpoint URL:** `/api/v1/staff`

**Mô tả:** Tạo nhân viên mới. Server tạo `users` (status=`pending_verification`) + `staff` trong 1 transaction (BR-S01). `staffCode` tự gen server-side — client không được truyền. Email invite gửi placeholder (v1.0: `console.log`).

Auth: JWT Quyền: staff.create

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | Format email, UNIQUE. |
| `phone` | string | no | ≤ 20 ký tự. |
| `fullName` | string | yes | 2-200 ký tự. |
| `position` | string | yes | Enum: `owner` / `staff` / `trainer` / `member`. |
| `groupIds` | string[] | no | Mảng `groupId` (BigInt string). Gán vào group ngay khi tạo. Mỗi groupId phải tồn tại trong `groups`. |

```json
{
  "email": "nva@gym.local",
  "phone": "0901234567",
  "fullName": "Nguyen Van A",
  "position": "staff",
  "groupIds": ["3"]
}
```

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "staff",
    "fullName": "Nguyen Van A",
    "email": "nva@gym.local",
    "phone": "0901234567",
    "status": "pending_verification"
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid (email sai format, position không đúng enum, fullName rỗng). |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.create`. |
| 409 | `DUPLICATE_VALUE` | `email` đã tồn tại trong `users` (Prisma P2002). |
| 404 | `NOT_FOUND` | Một hoặc nhiều `groupIds` không tồn tại. |
| 500 | `STAFF_CODE_GENERATION_FAILED` | Server retry auto-gen `staffCode` 5 lần đều conflict (cực hiếm). |

### 2.4 `GET /staff/trainers`

**API method:** `GET`

**Endpoint URL:** `/api/v1/staff/trainers`

**Mô tả:** Trả danh sách staff active có `position` là `trainer` hoặc `pt`. Dùng để member/staff chọn trainer khi setup subscription. Không có pagination — trả toàn bộ danh sách, sắp xếp `staffCode ASC`.

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
      "staffId": "2",
      "fullName": "Tran Thi B",
      "position": "trainer"
    },
    {
      "staffId": "3",
      "fullName": "Le Van C",
      "position": "trainer"
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

`401` (JWT bắt buộc — controller có `@UseGuards(PermissionsGuard)` toàn bộ).

### 2.5 `GET /staff/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/staff/:id`

**Mô tả:** Detail 1 staff bao gồm join `users` (fullName, email, phone, status). Trả cả staff đã deleted (owner cần xem history) — `deletedAt` field phân biệt.

Auth: JWT Quyền: staff.read

**Request body:**

Không có request body.

**Path parameters:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "staff",
    "fullName": "Nguyen Van A",
    "email": "nva@gym.local",
    "phone": "0901234567",
    "status": "active",
    "deletedAt": null
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

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.read`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |

### 2.6 `PATCH /staff/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/staff/:id`

**Mô tả:** Update thông tin staff. Cho phép thay đổi `fullName`, `phone`, `position`. `staffCode` và `userId` không được phép update — nếu client gửi, server ignore (không trả error). Chỉ áp dụng cho active staff (`deletedAt IS NULL`).

Auth: JWT Quyền: staff.update

**Request body:**

Tất cả field optional, ít nhất 1 field phải có.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `fullName` | string | no | 2-200 ký tự. |
| `phone` | string | no | ≤ 20 ký tự. Gửi `null` để xóa. |
| `position` | string | no | Enum: `owner` / `staff` / `trainer` / `member`. |

```json
{
  "position": "trainer",
  "phone": "0909876543"
}
```

**Path parameters:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "trainer",
    "fullName": "Nguyen Van A",
    "email": "nva@gym.local",
    "phone": "0909876543",
    "status": "active",
    "deletedAt": null
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
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid (position không đúng enum, fullName rỗng, body rỗng). |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.update`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |
| 409 | `STAFF_ALREADY_DELETED` | Staff đã soft-deleted — không update. |

### 2.7 `DELETE /staff/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/staff/:id`

**Mô tả:** Xóa vĩnh viễn staff và user liên kết cùng các dữ liệu phụ thuộc được service xử lý trong transaction; controller trả 200.

Auth: JWT Quyền: staff.delete

**Request body:**

Không có request body.

**Path parameters:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Response body:**

HTTP 200.

```json
{ "success": true, "data": { "success": true } }
```

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

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.delete`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |
| 409 | `STAFF_ALREADY_DELETED` | Staff đã soft-deleted — idempotent delete không áp dụng v1.0; trả 409 để client biết state. |

### 2.8 `GET /staff/schedules/range`

**API method:** `GET`

**Endpoint URL:** `/api/v1/staff/schedules/range`

**Mô tả:** Trả lịch làm việc của toàn bộ staff (active, `position='staff'`) trong khoảng `from`–`to`. Query params `from` và `to` là bắt buộc. Kết quả sắp xếp `workDate ASC`, sau đó `shift ASC`. Mỗi entry có thêm `staffCode` và `fullName` để dễ hiển thị.

Auth: JWT Quyền: schedule.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Required | Mô tả |
|---|---|---|---|
| `from` | date | yes | `workDate >= from`. Format `YYYY-MM-DD`. |
| `to` | date | yes | `workDate <= to`. Format `YYYY-MM-DD`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "scheduleId": "10",
      "staffId": "1",
      "staffCode": "STF-2026-000001",
      "fullName": "Nguyen Van A",
      "shift": "morning",
      "workDate": "2026-06-01"
    },
    {
      "scheduleId": "11",
      "staffId": "2",
      "staffCode": "STF-2026-000002",
      "fullName": "Tran Thi B",
      "shift": "afternoon",
      "workDate": "2026-06-01"
    }
  ]
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

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `from` hoặc `to` sai format hoặc thiếu. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.read`. |

### 2.9 `GET /staff/:id/schedules`

**API method:** `GET`

**Endpoint URL:** `/api/v1/staff/:id/schedules`

**Mô tả:** List lịch làm việc của 1 staff cụ thể. Mặc định chỉ trả active rows (`deletedAt IS NULL`). Kết quả sắp xếp `workDate ASC`, sau đó `shift ASC`.

Auth: JWT Quyền: schedule.read

**Request body:**

Không có request body.

**Path parameters:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `workDateFrom` | date | — | Filter `workDate >= workDateFrom`. Format `YYYY-MM-DD`. |
| `workDateTo` | date | — | Filter `workDate <= workDateTo`. Format `YYYY-MM-DD`. |
| `shift` | string | — | Filter theo ca: `morning` / `afternoon` / `evening`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "scheduleId": "10",
      "staffId": "1",
      "shift": "morning",
      "workDate": "2026-06-01",
      "deletedAt": null
    },
    {
      "scheduleId": "11",
      "staffId": "1",
      "shift": "afternoon",
      "workDate": "2026-06-01",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 2, "totalPages": 1 }
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

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `workDateFrom` / `workDateTo` sai format, `shift` không đúng enum. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.read`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |

### 2.10 `POST /staff/:id/schedules`

**API method:** `POST`

**Endpoint URL:** `/api/v1/staff/:id/schedules`

**Mô tả:** Bulk insert lịch làm việc cho 1 staff. Nhận mảng `{shift, workDate}[]`. All-or-nothing: nếu 1 record conflict thì rollback toàn bộ batch (BR-S03). Guard: không tạo schedule cho staff đã soft-deleted (BR-S04).

Auth: JWT Quyền: schedule.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `schedules` | array | yes | Mảng ≥ 1 phần tử, tối đa 100 phần tử mỗi request. |
| `schedules[].shift` | StaffShift | yes | Enum: `morning` / `afternoon` / `evening`. |
| `schedules[].workDate` | date | yes | Format `YYYY-MM-DD`. Không được là ngày trong quá khứ (< today_vn). |

```json
{
  "schedules": [
    { "shift": "morning", "workDate": "2026-06-01" },
    { "shift": "afternoon", "workDate": "2026-06-01" },
    { "shift": "morning", "workDate": "2026-06-02" }
  ]
}
```

**Path parameters:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "created": 3
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
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `schedules` rỗng, vượt 100 phần tử, shift không đúng enum, workDate sai format hoặc trong quá khứ. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.manage`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại hoặc đã soft-deleted (BR-S04). |
| 409 | `SCHEDULE_CONFLICT` | Tồn tại record active với cùng `(staffId, shift, workDate)`. Response body kèm `details: { conflicts: [{shift, workDate}] }`. |

### 2.11 `DELETE /staff/:id/schedules/:scheduleId`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/staff/:id/schedules/:scheduleId`

**Mô tả:** Soft-delete một staff schedule; controller trả 200.

Auth: JWT Quyền: schedule.manage

**Request body:**

Không có request body.

**Path parameters:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |
| `scheduleId` | string | `scheduleId` (BigInt string). |

**Response body:**

HTTP 200.

```json
{ "success": true, "data": { "success": true } }
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

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.manage`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |
| 404 | `SCHEDULE_NOT_FOUND` | `scheduleId` không tồn tại, đã soft-deleted, hoặc không thuộc `staffId` trong path. |

### 2.12 `POST /staff/me/attendance/check-in`

**API method:** `POST`

**Endpoint URL:** `/api/v1/staff/me/attendance/check-in`

**Mô tả:** Mở phiên chấm công mới cho staff hiện tại. Mỗi staff chỉ có 1 phiên mở tại 1 thời điểm. Nếu có phiên mở từ ngày trước (quên chấm ra), phiên đó sẽ bị xóa (ngày công không hợp lệ) và phiên mới được tạo.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "logId": "42",
    "staffId": "1",
    "checkIn": "2026-06-19T08:05:00.000Z",
    "checkOut": null,
    "durationMinutes": null
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId`. |
| 401 | `UNAUTHORIZED` | — |
| 409 | `ALREADY_CHECKED_IN` | Đã có phiên mở từ hôm nay — phải check-out trước. |

### 2.13 `POST /staff/me/attendance/check-out`

**API method:** `POST`

**Endpoint URL:** `/api/v1/staff/me/attendance/check-out`

**Mô tả:** Đóng phiên chấm công đang mở của staff hiện tại. Nếu check-out xảy ra vào ngày khác với check-in (qua đêm), phiên bị xóa và trả 409 `ATTENDANCE_VOIDED_DIFFERENT_DAY`.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "logId": "42",
    "staffId": "1",
    "checkIn": "2026-06-19T08:05:00.000Z",
    "checkOut": "2026-06-19T17:10:00.000Z",
    "durationMinutes": 545
  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId`. |
| 401 | `UNAUTHORIZED` | — |
| 409 | `NOT_CHECKED_IN` | Không có phiên mở — phải check-in trước. |
| 409 | `ATTENDANCE_VOIDED_DIFFERENT_DAY` | Phiên mở từ ngày khác; phiên bị xóa, cần check-in lại hôm nay. |

### 2.14 `GET /staff/me/attendance`

**API method:** `GET`

**Endpoint URL:** `/api/v1/staff/me/attendance`

**Mô tả:** Lịch sử chấm công của staff hiện tại. Mặc định trả tháng hiện tại (từ ngày 1 đến cuối tháng). Sắp xếp `checkIn DESC`. Không soft-delete — records attendance log là immutable (trừ trường hợp xóa khi voided cross-day).

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `from` | datetime | đầu tháng hiện tại | Filter `checkIn >= from`. ISO 8601 date string. |
| `to` | datetime | cuối tháng hiện tại | Filter `checkIn <= to`. ISO 8601 date string. |
| `pageSize` | int | 100 | Max 200. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "logId": "42",
        "staffId": "1",
        "checkIn": "2026-06-19T08:05:00.000Z",
        "checkOut": "2026-06-19T17:10:00.000Z",
        "durationMinutes": 545
      },
      {
        "logId": "41",
        "staffId": "1",
        "checkIn": "2026-06-18T08:00:00.000Z",
        "checkOut": "2026-06-18T17:00:00.000Z",
        "durationMinutes": 540
      }
    ],
    "total": 19
  }
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

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId`. |
| 400 | `VALIDATION_ERROR` | `from` / `to` sai format date string. |
| 401 | `UNAUTHORIZED` | — |
