# Module 6 — Facility API

## 1. Mục đích module

Module 6 đặc tả endpoint quản lý cơ sở vật chất: phòng tập (`gym_rooms`), thiết bị (`equipment`), nhật ký bảo trì (`maintenance_logs`). Bao trùm UC08 (Quản lý thông tin phòng tập) + UC09 (Quản lý và Bảo trì thiết bị).

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/rooms/lookup` |
| 2 | `GET` | `/api/v1/rooms` |
| 3 | `GET` | `/api/v1/rooms/:id` |
| 4 | `POST` | `/api/v1/rooms` |
| 5 | `PATCH` | `/api/v1/rooms/:id` |
| 6 | `DELETE` | `/api/v1/rooms/:id` |
| 7 | `GET` | `/api/v1/equipment` |
| 8 | `GET` | `/api/v1/equipment/:id` |
| 9 | `POST` | `/api/v1/equipment` |
| 10 | `PATCH` | `/api/v1/equipment/:id` |
| 11 | `DELETE` | `/api/v1/equipment/:id` |
| 12 | `GET` | `/api/v1/equipment/:id/maintenance-logs` |
| 13 | `POST` | `/api/v1/equipment/:id/maintenance-logs` |
| 14 | `PATCH` | `/api/v1/maintenance-logs/:id` |

### 2.1 `GET /rooms/lookup`

**API method:** `GET`

**Endpoint URL:** `/api/v1/rooms/lookup`

**Mô tả:** Liệt kê phòng tập phục vụ lookup và browsing. Theo controller hiện tại, endpoint vẫn yêu cầu JWT; `pageSize` bị giới hạn tối đa 100.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100 (capped server-side). |
| `roomType` | string | — | Filter exact match (vd `Yoga`). |
| `search` | string | — | LIKE `name` hoặc `roomCode`. |
| `sort` | string | `room_code:asc` | `name:asc`, `capacity:desc` thường dùng. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "roomId": "1",
      "roomCode": "RM-001",
      "name": "Yoga Studio 1",
      "roomType": "Yoga",
      "capacity": 20,
      "description": "Tang 2, kinh chong sap"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 8, "totalPages": 1 }
}
```

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.2 `GET /rooms`

**API method:** `GET`

**Endpoint URL:** `/api/v1/rooms`

**Mô tả:** List room có pagination + filter.

Auth: JWT Quyền: room.manage

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `roomType` | string | — | Filter exact match (vd `Yoga`). |
| `search` | string | — | LIKE `name` hoặc `roomCode`. |
| `sort` | string | `room_code:asc` | `name:asc`, `capacity:desc` thường dùng. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "roomId": "1",
      "roomCode": "RM-001",
      "name": "Yoga Studio 1",
      "roomType": "Yoga",
      "capacity": 20,
      "description": "Tang 2, kinh chong sap"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 8, "totalPages": 1 }
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

`401`, `403` (thiếu `room.manage`).

### 2.3 `GET /rooms/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/rooms/:id`

**Mô tả:** Detail 1 room + statistics tóm tắt (count equipment + count training session active dùng phòng này — UI hiển thị "Có thể xóa hay không").

Auth: JWT Quyền: room.manage

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "roomId": "1",
    "roomCode": "RM-001",
    "name": "Yoga Studio 1",
    "roomType": "Yoga",
    "capacity": 20,
    "description": "...",
    "stats": {
      "equipmentCount": 12,
      "activeSessionsCount": 3
    }
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

`401`, `403`, `404`.

### 2.4 `POST /rooms`

**API method:** `POST`

**Endpoint URL:** `/api/v1/rooms`

**Mô tả:** Tạo room mới. Auto-gen `roomCode` nếu client không truyền.

Auth: JWT Quyền: room.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `roomCode` | string | no | UNIQUE, `^RM-[0-9]{3}$`. Server auto-gen nếu omit. |
| `name` | string | yes | 1-100 ký tự. |
| `roomType` | string | no | ≤ 50 ký tự. |
| `capacity` | int | yes | Range 1-1000. |
| `description` | string | no | ≤ 255 ký tự. |

```json
{
  "name": "Yoga Studio 1",
  "roomType": "Yoga",
  "capacity": 20,
  "description": "Tang 2"
}
```

**Response body:**

HTTP 201.

Room detail (không có `stats`).

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
| 400 | `VALIDATION_ERROR` | Field format invalid, capacity ≤ 0, roomCode format sai. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `room.manage`. |
| 409 | `DUPLICATE_VALUE` | `roomCode` đã tồn tại (P2002). |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Server retry auto-gen `roomCode` 10 lần đều conflict (cực hiếm — 999 max RM codes phải đầy mới). |

### 2.5 `PATCH /rooms/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/rooms/:id`

**Mô tả:** Update room metadata. Cho phép thay đổi mọi field. Lưu ý: thay đổi `capacity` không validate so với số người đang đặt session — staff chịu trách nhiệm.

Auth: JWT Quyền: room.manage

**Request body:**

Tất cả field optional, ít nhất 1 field phải có.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `roomCode` | string | no | UNIQUE format `^RM-[0-9]{3}$`. |
| `name` | string | no | 1-100. |
| `roomType` | string | no | ≤ 50. |
| `capacity` | int | no | Range 1-1000. |
| `description` | string | no | ≤ 255. |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Room detail.

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
| 400 | `VALIDATION_ERROR` | Format invalid. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Room không tồn tại. |
| 409 | `DUPLICATE_VALUE` | `roomCode` collision. |

### 2.6 `DELETE /rooms/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/rooms/:id`

**Mô tả:** **Hard delete** room. KHÔNG khôi phục được.

Auth: JWT Quyền: room.manage

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
| 409 | `CONFLICT` | Trạng thái resource hoặc ràng buộc nghiệp vụ xung đột; mã cụ thể ghi bên dưới. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

| HTTP | Code | Trigger |
|---|---|---|
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Room không tồn tại. |
| 409 | `ROOM_HAS_EQUIPMENT` | Còn `equipment.room_id` tham chiếu room này. |
| 409 | `ROOM_HAS_ACTIVE_SESSIONS` | Còn `training_sessions` với `room_id=:id` AND `end_time > NOW()` AND `deleted_at IS NULL`. |

### 2.7 `GET /equipment`

**API method:** `GET`

**Endpoint URL:** `/api/v1/equipment`

**Mô tả:** List equipment có pagination + filter theo room/status.

Auth: JWT Quyền: equipment.manage

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | — |
| `pageSize` | int | 20 | Max 100. |
| `roomId` | string | — | Filter equipment trong room cụ thể. |
| `status` | enum | — | `active` / `broken` / `repairing` / `retired`. |
| `search` | string | — | LIKE `name` hoặc `equipmentCode`. |
| `warrantyExpiring` | boolean | false | true → filter `warranty_until <= today_vn + 30 days` (dashboard cảnh báo hết bảo hành). |
| `sort` | string | `equipment_code:asc` | `import_date:desc`, `warranty_until:asc` thường dùng. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "equipmentId": "1",
      "equipmentCode": "EQP-000001",
      "roomId": "1",
      "name": "Treadmill X3 Pro",
      "importDate": "2025-06-15",
      "warrantyUntil": "2027-06-15",
      "status": "active"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 47, "totalPages": 3 }
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

`401`, `403`.

### 2.8 `GET /equipment/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/equipment/:id`

**Mô tả:** Detail 1 equipment + stats maintenance (latest open log nếu có).

Auth: JWT Quyền: equipment.manage

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "equipmentId": "1",
    "equipmentCode": "EQP-000001",
    "roomId": "1",
    "room": { "roomCode": "RM-001", "name": "Cardio Zone" },
    "name": "Treadmill X3 Pro",
    "importDate": "2025-06-15",
    "warrantyUntil": "2027-06-15",
    "status": "active",
    "openMaintenance": null,
    "stats": {
      "totalMaintenanceLogs": 3,
      "lastResolvedAt": "2026-03-10T14:00:00.000Z"
    }
  }
}
```

`openMaintenance` chứa maintenance log gần nhất với `status IN ('reported', 'repairing')` nếu có, NULL nếu không. Dùng cho UI hiển thị "Đang sửa".

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

### 2.9 `POST /equipment`

**API method:** `POST`

**Endpoint URL:** `/api/v1/equipment`

**Mô tả:** Tạo equipment mới. Auto-gen `equipmentCode`. Default `status='active'`.

Auth: JWT Quyền: equipment.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `equipmentCode` | string | no | UNIQUE, `^EQP-[0-9]{6}$`. Auto-gen nếu omit. |
| `roomId` | string | yes | FK → `gym_rooms`. Phải tồn tại. |
| `name` | string | yes | 1-100. |
| `importDate` | date | yes | Format `YYYY-MM-DD`. Không được tương lai > today_vn. |
| `warrantyUntil` | date | no | Format `YYYY-MM-DD`. Phải >= `importDate` nếu có. |

```json
{
  "roomId": "1",
  "name": "Treadmill X3 Pro",
  "importDate": "2025-06-15",
  "warrantyUntil": "2027-06-15"
}
```

**Response body:**

HTTP 201.

Equipment detail (không có `stats`).

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
| 400 | `VALIDATION_ERROR` | Format invalid, `warrantyUntil < importDate`, `importDate > today_vn`. |
| 400 | `FK_CONSTRAINT` | `roomId` không tồn tại. |
| 401/403 | — | — |
| 409 | `DUPLICATE_VALUE` | `equipmentCode` đã tồn tại. |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry auto-gen thất bại. |

### 2.10 `PATCH /equipment/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/equipment/:id`

**Mô tả:** Update equipment metadata + manual status change. Status change auto-trigger qua maintenance flow trong hầu hết trường hợp — endpoint này dùng cho rare case (vd staff manually retire equipment không qua maintenance).

Auth: JWT Quyền: equipment.manage

**Request body:**

Tất cả field optional, ít nhất 1 field.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `roomId` | string | no | FK. |
| `name` | string | no | 1-100. |
| `importDate` | date | no | — |
| `warrantyUntil` | date | no | >= `importDate`. |
| `status` | enum | no | `active`/`broken`/`repairing`/`retired`. **Restrictions:** xem WHEN-THEN-ELSE. |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Equipment detail.

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
| 400 | `VALIDATION_ERROR` | — |
| 400 | `FK_CONSTRAINT` | `roomId` không tồn tại. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Equipment không tồn tại. |
| 409 | `EQUIPMENT_HAS_OPEN_MAINTENANCE` | Body có `status` change AND có `maintenance_logs` với `status IN ('reported','repairing')`. |
| 409 | `EQUIPMENT_INVALID_STATE_TRANSITION` | Status transition không hợp lệ (vd `retired → active`). |
| 409 | `USE_MAINTENANCE_LOG_ENDPOINT` | Body có `status='broken'` — dùng POST `/equipment/:id/maintenance-logs` thay thế. |

### 2.11 `DELETE /equipment/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/equipment/:id`

**Mô tả:** **Hard delete** equipment. SRS UC09 step 4a khuyến nghị dùng `status='retired'` thay vì delete — giữ history cho audit. Delete chỉ dùng khi import nhầm.

Auth: JWT Quyền: equipment.manage

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Query parameters:**

| Param | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `force` | boolean | no | false | Cho phép delete kèm cascade xóa `maintenance_logs` đã resolved/failed (history sẽ mất vĩnh viễn). Chỉ role `owner`. Non-owner gửi `?force=true` → 403 `FORCE_DELETE_REQUIRES_OWNER`. |

**Response body:**

HTTP 204 No Content. Không có response body.

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
| 401/403 | — | — |
| 403 | `FORCE_DELETE_REQUIRES_OWNER` | `?force=true` nhưng `jwt.role != 'owner'`. |
| 404 | `NOT_FOUND` | Equipment không tồn tại. |
| 409 | `EQUIPMENT_HAS_OPEN_MAINTENANCE` | Có `maintenance_logs` với `status IN ('reported','repairing')`. |
| 409 | `EQUIPMENT_HAS_RESOLVED_MAINTENANCE` | Có `maintenance_logs` đã `resolved`/`failed` (history sẽ mất nếu delete). Khuyến nghị dùng `status='retired'`. |

### 2.12 `GET /equipment/:id/maintenance-logs`

**API method:** `GET`

**Endpoint URL:** `/api/v1/equipment/:id/maintenance-logs`

**Mô tả:** List maintenance log của 1 equipment cụ thể, sắp xếp `reportedAt:desc`.

Auth: JWT Quyền: maintenance.read

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | — |
| `pageSize` | int | 20 | — |
| `status` | enum | — | `reported`/`repairing`/`resolved`/`failed`. |
| `from` | date | — | Filter `reportedAt >= from`. |
| `to` | date | — | Filter `reportedAt <= to + 1 day`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "maintenanceId": "1",
      "equipmentId": "1",
      "reportedByStaff": {
        "staffId": "5",
        "staffCode": "STF-2026-000005",
        "fullName": "Nguyen Van A"
      },
      "description": "Day cap loose, can siet lai",
      "status": "resolved",
      "reportedAt": "2026-03-10T09:00:00.000Z",
      "resolvedAt": "2026-03-10T14:00:00.000Z"
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
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 404 | `NOT_FOUND` | Resource được tham chiếu không tồn tại hoặc đã bị xóa. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Lỗi nghiệp vụ/điều kiện bổ sung từ service:

`401`, `403`, `404` (equipment không tồn tại).

### 2.13 `POST /equipment/:id/maintenance-logs`

**API method:** `POST`

**Endpoint URL:** `/api/v1/equipment/:id/maintenance-logs`

**Mô tả:** Tạo maintenance log mới + chuyển `equipment.status='broken'`. 2 operation trong cùng `$transaction`.

Auth: JWT Quyền: maintenance.report

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `description` | string | yes | 10-1000 ký tự. |

```json
{ "description": "Day cap loose, may dao nguoc luc dung" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

Maintenance log object + reference equipment với status mới.

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
| 400 | `VALIDATION_ERROR` | Description < 10 ký tự. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Equipment không tồn tại. |
| 409 | `EQUIPMENT_HAS_OPEN_MAINTENANCE` | Đã có log `status IN ('reported','repairing')` cho equipment này. Không cho phép 2 log open cùng lúc. |
| 409 | `EQUIPMENT_RETIRED` | Equipment đã `status='retired'` — không báo hỏng được. |

### 2.14 `PATCH /maintenance-logs/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/maintenance-logs/:id`

**Mô tả:** Cập nhật state maintenance log + transition equipment.status tương ứng. State machine xem §3.4.

Auth: JWT Quyền: maintenance.resolve

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `status` | enum | yes | `repairing`/`resolved`/`failed`. KHÔNG cho phép set lại `reported`. |

```json
{ "status": "resolved" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Maintenance log object (đã update) + equipment ref với status mới.

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
| 400 | `VALIDATION_ERROR` | Status không phải enum value. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Maintenance log không tồn tại. |
| 409 | `MAINTENANCE_ALREADY_CLOSED` | Log đã ở `status='resolved'` hoặc `'failed'` — không cho update tiếp. |
| 409 | `MAINTENANCE_INVALID_STATE_TRANSITION` | Skip state (vd `reported → resolved` không qua `repairing`). |
