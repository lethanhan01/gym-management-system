# Module 3 — Package API

## 1. Mục đích module

Module 3 đặc tả endpoint quản lý danh mục gói tập (`packages` table). Gói tập là **time-based v1.0** — chỉ `duration_days`, không có `session_limit` (xem Database.md §Packages note, SRS UC03 ghi chú).

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/packages` |
| 2 | `GET` | `/api/v1/packages/:id` |
| 3 | `POST` | `/api/v1/packages` |
| 4 | `PATCH` | `/api/v1/packages/:id` |
| 5 | `PATCH` | `/api/v1/packages/:id/status` |
| 6 | `DELETE` | `/api/v1/packages/:id` |

### 2.1 `GET /packages`

**API method:** `GET`

**Endpoint URL:** `/api/v1/packages`

**Mô tả:** List package. Filter, pagination, sort. Auto-filter `status='active'` khi caller có role `member` (không hiển thị inactive cho member).

Auth: JWT Quyền: package.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `status` | enum | (auto-filter cho member) | `active` / `inactive`. Ignore nếu role member. |
| `minDuration` | int | — | Filter `durationDays >= minDuration`. |
| `maxDuration` | int | — | Filter `durationDays <= maxDuration`. |
| `minPrice` | string | — | Filter `price >= minPrice`. Gửi dưới dạng string để tránh floating-point loss. |
| `maxPrice` | string | — | Filter `price <= maxPrice`. Gửi dưới dạng string để tránh floating-point loss. |
| `search` | string | — | LIKE `name` hoặc `packageCode`. |
| `includeDeleted` | boolean | false | Bao gồm `deleted_at IS NOT NULL`. Chỉ owner/staff với `package.manage`. |
| `sort` | string | `created_at:desc` | `price:asc`/`duration_days:asc` thường dùng. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "packageId": "1",
      "packageCode": "PKG-0001",
      "name": "Standard 1 thang",
      "durationDays": 30,
      "price": "500000.00",
      "benefits": "Truy cap phong tap, locker, voucher do uong",
      "status": "active",
      "includesPt": false,
      "createdAt": "2026-01-01T08:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 5, "totalPages": 1 }
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

`401`, `403` (thiếu `package.read`).

### 2.2 `GET /packages/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/packages/:id`

**Mô tả:** Detail 1 package + statistics tóm tắt (count subscription active dùng gói này — dùng cho UI admin khi xem có thể xóa hay không).

Auth: JWT Quyền: package.read

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "packageId": "1",
    "packageCode": "PKG-0001",
    "name": "Standard 1 thang",
    "durationDays": 30,
    "price": "500000.00",
    "benefits": "...",
    "status": "active",
    "includesPt": false,
    "stats": {
      "activeSubscriptions": 12,
      "pendingSubscriptions": 3,
      "totalSubscriptions": 87
    },
    "createdAt": "2026-01-01T08:00:00.000Z",
    "deletedAt": null
  }
}
```

`stats` chỉ trả khi caller có `package.manage` (owner/staff). Role member nhận `stats: null`.

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

### 2.3 `POST /packages`

**API method:** `POST`

**Endpoint URL:** `/api/v1/packages`

**Mô tả:** Tạo package mới. Auto-gen `packageCode` nếu client không truyền.

Auth: JWT Quyền: package.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `packageCode` | string | no | UNIQUE, `^PKG-[A-Z0-9]{4}$`. Server auto-gen nếu omit. |
| `name` | string | yes | 1-100 ký tự. |
| `durationDays` | int | yes | Range 1-3650 (1 ngày - 10 năm). |
| `price` | decimal | yes | > 0, ≤ 99,999,999.99. |
| `benefits` | string | no | ≤ 255 ký tự. |
| `includesPt` | boolean | no | Default `false`. Gói bao gồm PT hay không. |
| `status` | enum | no | Default `active`. Có thể set `inactive` lúc tạo. |

```json
{
  "name": "Standard 3 thang",
  "durationDays": 90,
  "price": "1350000.00",
  "benefits": "Tat ca quyen Standard 1 thang + 2 buoi PT free",
  "includesPt": true
}
```

**Response body:**

HTTP 201.

Package detail (giống §4.2 không có `stats`).

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
| 400 | `VALIDATION_ERROR` | name length, durationDays out-of-range, price ≤ 0, packageCode format invalid. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `package.manage`. |
| 409 | `DUPLICATE_VALUE` | `packageCode` đã tồn tại (P2002). |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Server retry auto-gen `packageCode` 10 lần đều conflict (cực hiếm). Tên code reuse pattern Module 4. |

### 2.4 `PATCH /packages/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/packages/:id`

**Mô tả:** Update package metadata. **Block `durationDays` và `price` change nếu có subscription active hoặc pending** referencing — tránh inconsistency với gói member đã purchase.

Auth: JWT Quyền: package.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `packageCode` | string | no | UNIQUE, `^PKG-[A-Z0-9]{4}$`. |
| `name` | string | no | 1-100. |
| `durationDays` | int | no | Range 1-3650. **Block nếu có sub active/pending.** |
| `price` | decimal | no | > 0. **Block nếu có sub active/pending.** |
| `benefits` | string | no | ≤ 255. |
| `includesPt` | boolean | no | Gói bao gồm PT hay không. |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Package detail.

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
| 404 | `NOT_FOUND` | Package không tồn tại / soft-deleted. |
| 409 | `DUPLICATE_VALUE` | `packageCode` collision. |
| 409 | `PACKAGE_HAS_ACTIVE_SUBSCRIPTION` | Cố thay `durationDays` hoặc `price` khi có sub `active`/`pending`. |

### 2.5 `PATCH /packages/:id/status`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/packages/:id/status`

**Mô tả:** Toggle `status` giữa `active` ↔ `inactive`. `inactive` package ẩn khỏi list của member (UI mua gói) nhưng sub existing không bị ảnh hưởng — chạy tới hết `end_date` bình thường.

Auth: JWT Quyền: package.manage

**Request body:**

```json
{ "status": "inactive" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Package detail.

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

`401`, `403`, `404`, `400 VALIDATION_ERROR` (status không phải enum value).

### 2.6 `DELETE /packages/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/packages/:id`

**Mô tả:** Soft delete package (`deleted_at = NOW()`). **Block nếu có subscription active/pending.**

Auth: JWT Quyền: package.manage

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
| 404 | `NOT_FOUND` | Package không tồn tại / đã soft-deleted. |
| 409 | `PACKAGE_HAS_ACTIVE_SUBSCRIPTION` | Có sub `active`/`pending`. |
