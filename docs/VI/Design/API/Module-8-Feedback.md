# Module 8 - Feedback API

## 1. Mục đích module

Module 8 tiếp nhận, phân công và xử lý phản hồi của hội viên đối với dịch vụ, nhân viên hoặc thiết bị.

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/feedback` |
| 2 | `GET` | `/api/v1/feedback/:id` |
| 3 | `POST` | `/api/v1/feedback` |
| 4 | `PATCH` | `/api/v1/feedback/:id/assign` |
| 5 | `PATCH` | `/api/v1/feedback/:id/status` |
| 6 | `DELETE` | `/api/v1/feedback/:id` |

### 2.1 `GET /feedback`

**API method:** `GET`

**Endpoint URL:** `/api/v1/feedback`

**Mô tả:** Liệt kê feedback theo bộ lọc và phạm vi truy cập của người gọi.

Auth: JWT Quyền: feedback.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mo ta |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `memberId` | string | - | Self bat buoc bang `self.member_id`. |
| `feedbackType` | enum | - | `staff`/`equipment`/`service`. |
| `severity` | enum | - | `low`/`medium`/`high`. |
| `status` | enum | - | `open`/`in_progress`/`resolved`/`rejected`. |
| `handledByStaffId` | string | - | Filter nguoi xu ly. |
| `subjectStaffId` | string | - | Filter feedback ve nhan su. |
| `subjectEquipmentId` | string | - | Filter feedback ve thiet bi. |
| `overdue` | boolean | false | Filter derived theo SLA. |
| `from` | date/datetime | - | `createdAt >= from`. |
| `to` | date/datetime | - | `createdAt <= to`. |
| `sort` | string | `created_at:desc` | Whitelist `created_at`, `severity`, `status`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {

      "feedbackId": "20",
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "feedbackType": "equipment",
      "content": "May chay bo so 2 bi giat khi tang toc",
      "severity": "high",

      "status": "open",
      "handledByStaffId": null,
      "handledAt": null,
      "subjectStaffId": null,

      "subjectEquipmentId": "7",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "sla": {
        "dueAt": "2026-06-02T10:00:00.000Z",
        "overdue": false
      }
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

### 2.2 `GET /feedback/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/feedback/:id`

**Mô tả:** Lấy chi tiết một feedback nếu người gọi có quyền truy cập.

Auth: JWT Quyền: feedback.read

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

feedback object + `member`, `subjectStaff`, `subjectEquipment`, `handledByStaff`, `sla`.

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

### 2.3 `POST /feedback`

**API method:** `POST`

**Endpoint URL:** `/api/v1/feedback`

**Mô tả:** Tạo feedback mới cho dịch vụ, nhân viên hoặc thiết bị.

Auth: JWT Quyền: feedback.create

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|

| `memberId` | string | conditional | Staff/Owner gui ho. Member self khong can truyen. |
| `feedbackType` | enum | yes | `staff`/`equipment`/`service`. |
| `content` | string | yes | Noi dung phan hoi, khong duoc trong. |
| `severity` | enum | no | Default `low`. |
| `subjectStaffId` | string | conditional | Required khi `feedbackType='staff'`. |
| `subjectEquipmentId` | string | conditional | Required khi `feedbackType='equipment'`. |

```json
{
  "feedbackType": "equipment",

  "content": "May chay bo so 2 bi giat khi tang toc",
  "severity": "high",
  "subjectEquipmentId": "7"
}
```

**Response body:**

HTTP 201.

feedback object status `open`.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Request body bị `ValidationPipe` từ chối. Service có thể trả `VALIDATION_ERROR` cho business validation. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Content rong, enum invalid. |
| 400 | `FEEDBACK_SUBJECT_MISMATCH` | Type va subject khong khop rule. |
| 400 | `FK_CONSTRAINT` | `memberId`, `subjectStaffId`, hoac `subjectEquipmentId` khong ton tai. |
| 403 | `FORBIDDEN` | Member co gang tao feedback cho member khac. |

### 2.4 `PATCH /feedback/:id/assign`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/feedback/:id/assign`

**Mô tả:** Gán feedback đang mở cho nhân viên xử lý.

Auth: JWT Quyền: feedback.handle

**Request body:**

```json
{ "handledByStaffId": "4" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

feedback object da update.

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

`401`, `403`, `404`, `409 FEEDBACK_ALREADY_CLOSED`, `409 FEEDBACK_ALREADY_ASSIGNED`.

### 2.5 `PATCH /feedback/:id/status`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/feedback/:id/status`

**Mô tả:** Chuyển trạng thái xử lý feedback và lưu ghi chú kết quả khi cần.

Auth: JWT Quyền: feedback.handle

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `status` | enum | yes | `in_progress`, `resolved`, `rejected`. |
| `severity` | enum | no | Cho phep staff reclassify. |
| `resolutionNote` | string | conditional | String. Required (must be a string) when `status` is `resolved` or `rejected`; luu trong audit payload v1.0. |

```json
{
  "status": "resolved",
  "resolutionNote": "Da khoa may va tao phieu bao tri cho thiet bi."
}
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

feedback object da update.

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Người gọi thiếu permission hoặc không thỏa điều kiện ownership ghi trong mô tả. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Status invalid hoac thieu `resolutionNote`. |
| 409 | `FEEDBACK_ALREADY_CLOSED` | Feedback da `resolved`/`rejected`. |
| 409 | `FEEDBACK_INVALID_STATE_TRANSITION` | Chuyen trang thai nguoc/sai state machine. |

### 2.6 `DELETE /feedback/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/feedback/:id`

**Mô tả:** Soft-delete feedback theo quyền sở hữu hoặc quyền quản lý.

Auth: JWT Quyền: feedback.create

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true
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

`401`, `403`, `404`.
