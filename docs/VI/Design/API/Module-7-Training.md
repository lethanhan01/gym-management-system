# Module 7 — Training API

## 1. Mục đích module

Module 7 vận hành lịch tập với PT (`training_sessions`), check-in/check-out (`attendance_logs`) và chỉ số tiến độ hội viên (`member_progress`).

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/training-sessions` |
| 2 | `GET` | `/api/v1/training-sessions/:id` |
| 3 | `POST` | `/api/v1/training-sessions` |
| 4 | `PATCH` | `/api/v1/training-sessions/:id` |
| 5 | `POST` | `/api/v1/training-sessions/:id/cancel` |
| 6 | `POST` | `/api/v1/training-sessions/:id/status` |
| 7 | `GET` | `/api/v1/attendance-logs` |
| 8 | `POST` | `/api/v1/attendance/manual-checkin` |
| 9 | `PATCH` | `/api/v1/attendance-logs/:id/checkout` |
| 10 | `POST` | `/api/v1/devices/access-events` |
| 11 | `GET` | `/api/v1/members/:id/progress` |
| 12 | `POST` | `/api/v1/members/:id/progress` |
| 13 | `DELETE` | `/api/v1/member-progress/:id` |

### 2.1 `GET /training-sessions`

**API method:** `GET`

**Endpoint URL:** `/api/v1/training-sessions`

**Mô tả:** Liệt kê buổi tập theo bộ lọc và phạm vi truy cập của người gọi.

Auth: JWT Quyền: session.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mo ta |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `memberId` | string | - | Filter member. Self bat buoc `memberId=self`. |
| `trainerStaffId` | string | - | Filter PT. PT mac dinh chi thay lich cua minh. |
| `roomId` | string | - | Filter phong. |
| `status` | enum | - | `scheduled`/`in_progress`/`completed`/`cancelled`. |
| `from` | datetime/date | - | `startTime >= from`. |
| `to` | datetime/date | - | `startTime <= to`. |
| `sort` | string | `start_time:asc` | Whitelist `start_time`, `end_time`, `status`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {

      "sessionId": "10",
      "memberId": "5",
      "memberName": "Nguyen Van A",
      "trainerStaffId": "3",
      "trainerName": "Tran Quang Minh",
      "roomId": "1",
      "roomName": "Yoga Studio 1",
      "startTime": "2026-06-01T10:00:00.000Z",
      "endTime": "2026-06-01T11:00:00.000Z",
      "status": "scheduled"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
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

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.2 `GET /training-sessions/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/training-sessions/:id`

**Mô tả:** Lấy chi tiết một buổi tập cùng dữ liệu điểm danh và workout plan liên kết.

Auth: JWT Quyền: session.read

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

training session object + `attendanceLogs: []`.

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

`401`, `403`, `404`.

### 2.3 `POST /training-sessions`

**API method:** `POST`

**Endpoint URL:** `/api/v1/training-sessions`

**Mô tả:** Tạo buổi tập; buổi do PT tạo phải liên kết assignment và ngày tập hợp lệ.

Auth: JWT Quyền: session.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|

| `memberId` | string | yes | Member active, not deleted. |
| `trainerStaffId` | string | conditional | Owner/Staff co the truyen; PT mac dinh self. |
| `roomId` | string | yes | FK `gym_rooms`. |
| `assignmentId` | string | required for PT-created linked sessions | Active assignment thuoc member. |
| `planDayId` | string | required for PT-created linked sessions | WorkoutPlanDay thuoc plan cua assignment. |
| `startTime` | ISO datetime UTC | yes | Phai trong tuong lai hoac hien tai + grace 5 phut. |
| `endTime` | ISO datetime UTC | yes | > `startTime`. |

```json
{
  "memberId": "5",
  "roomId": "1",
  "assignmentId": "15",
  "planDayId": "42",
  "startTime": "2026-06-01T10:00:00.000Z",
  "endTime": "2026-06-01T11:00:00.000Z"
}
```

**Response body:**

HTTP 201.

session detail.

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

| HTTP | Code | Trigger |
|---|---|---|

| 400 | `VALIDATION_ERROR` | Time invalid, field format sai. |
| 400 | `FK_CONSTRAINT` | `memberId`, `trainerStaffId`, hoac `roomId` khong ton tai. |
| 403 | `TRAINER_NOT_ASSIGNED` | PT tao lich cho member khong phai primary. |
| 409 | `MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION` | Khong co subscription active tai ngay `startTime` theo `today_vn`. |
| 409 | `ROOM_TIME_OVERLAP` | Phong da co session khac overlap va status != `cancelled`. |
| 409 | `TRAINER_TIME_OVERLAP` | PT da co session khac overlap va status != `cancelled`. |

### 2.4 `PATCH /training-sessions/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/training-sessions/:id`

**Mô tả:** Cập nhật lịch, PT hoặc phòng của buổi tập chưa bắt đầu.

Auth: JWT Quyền: session.manage

**Request body:**

partial `trainerStaffId`, `roomId`, `startTime`, `endTime`.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Trả session object sau khi cập nhật.

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

`401`, `403`, `404`, `409 SESSION_ALREADY_STARTED`, `409 ROOM_TIME_OVERLAP`, `409 TRAINER_TIME_OVERLAP`.

### 2.5 `POST /training-sessions/:id/cancel`

**API method:** `POST`

**Endpoint URL:** `/api/v1/training-sessions/:id/cancel`

**Mô tả:** Hủy một buổi tập còn trong thời hạn cho phép.

Auth: JWT Quyền: session.manage

**Request body:**

| Field | Type | Required | Note |
|---|---|---|---|
| `reason` | string | no | Ly do huy; ghi vao audit log. |

```json
{ "reason": "Member xin doi lich" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

`{ "success": true }`.

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

`401`, `403`, `404`, `409 SESSION_CANCEL_WINDOW_CLOSED`, `409 SESSION_NOT_CANCELLABLE`.

### 2.6 `POST /training-sessions/:id/status`

**API method:** `POST`

**Endpoint URL:** `/api/v1/training-sessions/:id/status`

**Mô tả:** Chuyển trạng thái buổi tập theo state transition hợp lệ.

Auth: JWT Quyền: session.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `status` | enum | yes | Chi chap nhan `in_progress` hoac `completed`. |

```json
{ "status": "in_progress" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

session object voi `status` moi.

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

`400 VALIDATION_ERROR` neu `status` ngoai enum; `401`, `403`, `404`.

### 2.7 `GET /attendance-logs`

**API method:** `GET`

**Endpoint URL:** `/api/v1/attendance-logs`

**Mô tả:** Liệt kê lịch sử check-in/check-out theo bộ lọc và phạm vi truy cập.

Auth: JWT Quyền: attendance.read

**Request body:**

Không có request body.

**Response body:**

HTTP 200.

Trả danh sách attendance log và metadata phân trang.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.8 `POST /attendance/manual-checkin`

**API method:** `POST`

**Endpoint URL:** `/api/v1/attendance/manual-checkin`

**Mô tả:** Staff check-in thủ công cho hội viên có gói tập active.

Auth: JWT Quyền: attendance.checkin

**Request body:**

```json
{
  "memberCode": "MEM-2026-000123",
  "occurredAt": "2026-06-01T10:05:00.000Z"
}
```

**Response body:**

HTTP 201.

attendance log + member + subscription summary.

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

`404 MEMBER_NOT_FOUND`, `403 MEMBER_NO_ACTIVE_SUBSCRIPTION`, `409 ATTENDANCE_ALREADY_OPEN`.

### 2.9 `PATCH /attendance-logs/:id/checkout`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/attendance-logs/:id/checkout`

**Mô tả:** Đóng một attendance log đang mở.

Auth: JWT Quyền: attendance.checkin

**Request body:**

```json
{ "endedAt": "2026-06-01T11:05:00.000Z" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Trả attendance log sau khi đóng.

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

`404`, `409 ATTENDANCE_ALREADY_CLOSED`, `400 VALIDATION_ERROR` neu `endedAt <= startTime`.

### 2.10 `POST /devices/access-events`

**API method:** `POST`

**Endpoint URL:** `/api/v1/devices/access-events`

**Mô tả:** Nhận sự kiện check-in thời gian thực từ thiết bị bằng API key.

Auth: JWT và `X-Device-API-Key` Quyền: Device API key hợp lệ

**Request body:**

| Field | Type | Required | Note |
|---|---|---|---|
| `memberIdentifier` | string | yes | V1.0 bat buoc la `member_code`. |
| `occurredAt` | ISO datetime UTC | yes | Thoi diem device ghi nhan. |
| `deviceId` | string | yes | Dung debug + dedupe. |

```json
{
  "memberIdentifier": "MEM-2026-000123",
  "occurredAt": "2026-06-01T10:05:00.000Z",
  "deviceId": "DEV-FRONT-01"
}
```

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {

    "attendanceLogId": "99",
    "deduped": false,
    "member": {
      "memberId": "5",
      "memberCode": "MEM-2026-000123",
      "fullName": "Nguyen Van A",
      "photoUrl": null
    },
    "subscription": {
      "subscriptionId": "12",
      "endDate": "2026-08-30"
    },
    "sessionId": "10"

  }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai JWT hoặc thiếu/sai device API key. |
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

| 401 | `UNAUTHORIZED` | API key thieu/sai. |
| 404 | `MEMBER_NOT_FOUND` | Khong tim thay `member_code` hoac member soft-deleted. |
| 403 | `MEMBER_NO_ACTIVE_SUBSCRIPTION` | Khong co active subscription tai `today_vn`. |
| 409 | `ATTENDANCE_ALREADY_OPEN` | Da co attendance open trong ngay cho member nay. |

### 2.11 `GET /members/:id/progress`

**API method:** `GET`

**Endpoint URL:** `/api/v1/members/:id/progress`

**Mô tả:** Liệt kê các bản ghi tiến độ của hội viên trong phạm vi được phép.

Auth: JWT Quyền: progress.read

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Query parameters:**

| Param | Type | Default | Mo ta |
|---|---|---|---|
| `from` | datetime/date | - | `recordedAt >= from`. |
| `to` | datetime/date | - | `recordedAt <= to`. |
| `limit` | int | - | Gioi han so ban ghi tra ve. |

**Response body:**

HTTP 200.

array progress records theo `recordedAt` giam dan.

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

`401`, `403`, `404`.

### 2.12 `POST /members/:id/progress`

**API method:** `POST`

**Endpoint URL:** `/api/v1/members/:id/progress`

**Mô tả:** Ghi nhận chỉ số tiến độ cho hội viên.

Auth: JWT Quyền: progress.record

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|

| `weight` | decimal | no | > 0 va <= 500. |
| `bmi` | decimal | no | 10-50. |
| `goal` | string | no | <= 255. |
| `notes` | string | no | <= 2000. |
| `recordedAt` | ISO datetime UTC | no | Default NOW; khong duoc tuong lai > 5 phut. |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

progress object.

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

`401`, `403`, `404`, `400 VALIDATION_ERROR`.

### 2.13 `DELETE /member-progress/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/member-progress/:id`

**Mô tả:** Xóa bản ghi tiến độ khi người gọi có quyền trên bản ghi.

Auth: JWT Quyền: progress.record

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
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.
