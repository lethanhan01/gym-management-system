# Module 2 — RBAC + User Admin API

## 1. Mục đích module

Module 2 quản lý permission, group, quan hệ user-group và các thao tác quản trị user. Catalog hiện được khai báo tại `server/prisma/seed/rbac.ts` với 49 permission code và 4 group hệ thống: `owner`, `staff`, `trainer`, `member`.

## 2. Danh sách các API của module

| STT | Method | Endpoint |
|---:|---|---|
| 1 | `GET` | `/api/v1/permissions` |
| 2 | `GET` | `/api/v1/permissions/:id` |
| 3 | `GET` | `/api/v1/groups` |
| 4 | `GET` | `/api/v1/groups/:id` |
| 5 | `POST` | `/api/v1/groups` |
| 6 | `PATCH` | `/api/v1/groups/:id` |
| 7 | `DELETE` | `/api/v1/groups/:id` |
| 8 | `POST` | `/api/v1/groups/:id/permissions` |
| 9 | `DELETE` | `/api/v1/groups/:id/permissions/:permissionId` |
| 10 | `GET` | `/api/v1/users` |
| 11 | `GET` | `/api/v1/users/:id` |
| 12 | `GET` | `/api/v1/users/:id/groups` |
| 13 | `POST` | `/api/v1/users/:id/groups` |
| 14 | `DELETE` | `/api/v1/users/:id/groups/:groupId` |
| 15 | `PATCH` | `/api/v1/users/:id` |
| 16 | `DELETE` | `/api/v1/users/:id` |

### 2.1 `GET /permissions`

**API method:** `GET`

**Endpoint URL:** `/api/v1/permissions`

**Mô tả:** Liệt kê permission catalog hiện có. Permission được seed từ `server/prisma/seed/rbac.ts` và không có API tạo, sửa hoặc xóa.

Auth: JWT Quyền: rbac.manage

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `resource` | string | — | Filter `code` LIKE `<resource>.%` (vd `member`, `subscription`). |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    { "permissionId": "1", "code": "user.read", "name": "Xem tai khoan", "description": "..." },
    { "permissionId": "2", "code": "user.create", "name": "Tao tai khoan", "description": "..." }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 38, "totalPages": 2 }
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

`401 UNAUTHORIZED`, `403 FORBIDDEN` (thiếu `rbac.manage`).

### 2.2 `GET /permissions/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/permissions/:id`

**Mô tả:** Detail 1 permission. Dùng cho UI hiển thị tooltip / mô tả trong group permission picker.

Auth: JWT Quyền: rbac.manage

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Single permission object.

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

`401`, `403`, `404 NOT_FOUND`.

### 2.3 `GET /groups`

**API method:** `GET`

**Endpoint URL:** `/api/v1/groups`

**Mô tả:** List group (default 4 system group + custom group nếu có). Pagination + filter.

Auth: JWT Quyền: rbac.manage

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page`/`pageSize` | int | 1/20 | Pagination. |
| `search` | string | — | LIKE `name` hoặc `description`. |
| `includeDeleted` | boolean | false | Bao gồm `deleted_at IS NOT NULL`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "groupId": "1",
      "name": "owner",
      "description": "Chu phong tap...",
      "memberCount": 1,
      "permissionCount": 38,
      "createdAt": "2026-01-01T08:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 4, "totalPages": 1 }
}
```

`memberCount` = count user assigned vào group qua `user_groups`. `permissionCount` = count permission qua `group_permissions`.

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

### 2.4 `GET /groups/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/groups/:id`

**Mô tả:** Detail group kèm danh sách permission gán + danh sách user assigned (paginated user list nested không có; trả `memberCount` + endpoint `GET /users?groupId=:id` cho list user).

Auth: JWT Quyền: rbac.manage

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": {
    "groupId": "2",
    "name": "staff",
    "description": "Nhan vien quan ly...",
    "memberCount": 1,
    "permissions": [
      { "permissionId": "1", "code": "user.read", "name": "Xem tai khoan" },
      { "permissionId": "6", "code": "member.read", "name": "Xem hoi vien" }
    ],
    "createdAt": "2026-01-01T08:00:00.000Z",
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

`401`, `403`, `404`.

### 2.5 `POST /groups`

**API method:** `POST`

**Endpoint URL:** `/api/v1/groups`

**Mô tả:** Tạo custom group. System group (`owner`/`staff`/`trainer`/`member`) không cần tạo qua API — đã seed.

Auth: JWT Quyền: rbac.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | UNIQUE, `^[a-z][a-z0-9_]{1,49}$`, không trùng system group name. |
| `description` | string | yes | 10-500 ký tự. |
| `permissions` | string[] | no | Mảng permission codes; rỗng = group không có permission. |

```json
{
  "name": "manager",
  "description": "Quan ly chi nhanh — sub-role staff voi extra permissions",
  "permissions": ["user.read", "member.read", "report.view"]
}
```

**Response body:**

HTTP 201.

Group detail (giống §4.4).

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
| 400 | `VALIDATION_ERROR` | name/description format invalid; permission code không tồn tại trong catalog. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `rbac.manage`. |
| 409 | `DUPLICATE_VALUE` | Group `name` đã tồn tại (P2002). |

### 2.6 `PATCH /groups/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/groups/:id`

**Mô tả:** Update `name`/`description` của group. Permission assignment qua endpoint riêng (§4.8/4.9).

Auth: JWT Quyền: rbac.manage

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | no | UNIQUE, format như §4.5. |
| `description` | string | no | 10-500 ký tự. |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

Group detail updated.

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

`401`, `403`, `404`, `409 DUPLICATE_VALUE`.

### 2.7 `DELETE /groups/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/groups/:id`

**Mô tả:** Soft delete group (`deleted_at = NOW()`).

Auth: JWT Quyền: rbac.manage

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
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | — |
| 404 | `NOT_FOUND` | Group không tồn tại hoặc đã soft-deleted. |
| 409 | `GROUP_HAS_USERS` | Group còn user assigned (`user_groups.count > 0`). |
| 409 | `GROUP_IS_SYSTEM` | Group là system group (4 default). |

### 2.8 `POST /groups/:id/permissions`

**API method:** `POST`

**Endpoint URL:** `/api/v1/groups/:id/permissions`

**Mô tả:** Bulk assign permission to group. Idempotent: existing assignment được skip qua `skipDuplicates: true`.

Auth: JWT Quyền: rbac.manage

**Request body:**

```json
{ "permissions": ["report.view", "schedule.manage"] }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "groupId": "2",
    "added": ["report.view", "schedule.manage"],
    "skipped": []
  }
}
```

`skipped` = permission codes đã assigned (no-op).

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
| 400 | `VALIDATION_ERROR` | permission code không tồn tại; mảng rỗng. |
| 404 | `NOT_FOUND` | Group không tồn tại. |

### 2.9 `DELETE /groups/:id/permissions/:permissionId`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/groups/:id/permissions/:permissionId`

**Mô tả:** Revoke permission khỏi group.

Auth: JWT Quyền: rbac.manage

**Request body:**

Không có request body.

**Path parameters:** `id`, `permissionId` — số nguyên dương; sai định dạng trả 400.

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

`401`, `403`, `404 NOT_FOUND` (group hoặc permission không tồn tại hoặc chưa assigned).

### 2.10 `GET /users`

**API method:** `GET`

**Endpoint URL:** `/api/v1/users`

**Mô tả:** List user hệ thống (admin view). Khác với `GET /members` (Module 4) — endpoint này show TẤT CẢ user bất kể role (Owner/Staff/PT/Member), join với staff/member profile nếu có.

Auth: JWT Quyền: user.read

**Request body:**

Không có request body.

**Query parameters:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page`/`pageSize` | int | 1/20 | |
| `search` | string | — | LIKE `email`, `fullName`, `phone`. |
| `groupId` | string | — | Filter user thuộc group cụ thể. |
| `role` | string | — | Convenience: filter bằng group name (`owner`/`staff`/`trainer`/`member`). |
| `status` | enum | — | `pending_verification`/`active`/`locked`. |
| `includeDeleted` | boolean | false | `deleted_at IS NOT NULL`. |
| `sort` | string | `created_at:desc` | `field:asc\|desc`. |

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "userId": "1",
      "email": "owner@gym.local",
      "fullName": "Pham Quoc Hung",
      "phone": "0900000001",
      "status": "active",
      "emailVerifiedAt": "2026-01-01T08:00:00.000Z",
      "roles": ["owner"],
      "createdAt": "2026-01-01T08:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 10, "totalPages": 1 }
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

### 2.11 `GET /users/:id`

**API method:** `GET`

**Endpoint URL:** `/api/v1/users/:id`

**Mô tả:** Detail 1 user kèm groups + profile (staff/member nested nếu có).

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
    "userId": "5",
    "email": "nguyen.van.a@email.com",
    "fullName": "Nguyen Van A",
    "phone": "0911000001",
    "status": "active",
    "emailVerifiedAt": "2026-02-01T09:30:00.000Z",
    "avatarFileId": null,
    "roles": ["member"],
    "groups": [{ "groupId": "4", "name": "member" }],
    "member": {
      "memberId": "1",
      "memberCode": "MB-2026-0001",
      "dateOfBirth": "1995-04-12",
      "primaryTrainerId": null
    },
    "staff": null,
    "createdAt": "2026-02-01T09:30:00.000Z",
    "deletedAt": null
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

`401`, `403`, `404`.

### 2.12 `GET /users/:id/groups`

**API method:** `GET`

**Endpoint URL:** `/api/v1/users/:id/groups`

**Mô tả:** List group của 1 user (chi tiết kèm permission count). Lighter version của `GET /users/:id` khi UI chỉ cần group context.

Auth: JWT Quyền: Authenticated

**Request body:**

Không có request body.

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "groupId": "4",
      "name": "member",
      "description": "Hoi vien...",
      "assignedAt": "2026-02-01T09:30:00.000Z",
      "permissionCount": 8
    }
  ]
}
```

`assignedAt` = `user_groups.created_at` (nếu schema track; verify trong implementation phase).

**Error:**

| HTTP status | Mã lỗi | Điều kiện xảy ra |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Thiếu JWT, JWT sai hoặc hết hạn. |
| 400 | `BAD_REQUEST` | Path parameter hoặc dữ liệu do `ValidationPipe`/`ParseIntPipe` từ chối. |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không được ánh xạ sang lỗi nghiệp vụ cụ thể. |
| 500 | `PRISMA_<code>` | Lỗi Prisma chưa có mapping riêng. |
| 503 | `DATABASE_AUTH_FAILED` / `DATABASE_UNAVAILABLE` | Database sai thông tin xác thực hoặc tạm thời không kết nối được. |

Không có lỗi nghiệp vụ bổ sung được khai báo ngoài các lỗi chuẩn trên.

### 2.13 `POST /users/:id/groups`

**API method:** `POST`

**Endpoint URL:** `/api/v1/users/:id/groups`

**Mô tả:** Assign group cho user. Idempotent qua composite UNIQUE `(userId, groupId)`.

Auth: JWT Quyền: rbac.manage

**Request body:**

```json
{ "groupId": "2" }
```

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 201.

```json
{
  "success": true,
  "data": {
    "userId": "3",
    "groupId": "2",
    "groupName": "staff",
    "wasAlreadyAssigned": false
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
| 400 | `VALIDATION_ERROR` | groupId không tồn tại. |
| 404 | `NOT_FOUND` | User không tồn tại. |

### 2.14 `DELETE /users/:id/groups/:groupId`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/users/:id/groups/:groupId`

**Mô tả:** Remove group assignment khỏi user.

Auth: JWT Quyền: rbac.manage

**Request body:**

Không có request body.

**Path parameters:** `id`, `groupId` — số nguyên dương; sai định dạng trả 400.

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
| 404 | `NOT_FOUND` | Assignment không tồn tại. |
| 409 | `USER_NEEDS_AT_LEAST_ONE_GROUP` | Sau khi remove sẽ còn 0 group. |

### 2.15 `PATCH /users/:id`

**API method:** `PATCH`

**Endpoint URL:** `/api/v1/users/:id`

**Mô tả:** Update user profile + status. Self chỉ update được `fullName`, `phone`, `avatarFileId`. Admin có `user.update` có thêm `status`.

Auth: JWT Quyền: Authenticated

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `fullName` | string | no | 1-255 ký tự. |
| `phone` | string | no | UNIQUE, `^0\d{9,10}$`. |
| `status` | enum | no | `active` hoặc `pending_verification`. `locked` MUST NOT set v1.0 (SRS UC00 Ghi chú lockout). |
| `avatarFileId` | string | no | FK `files.file_id`. |

**Path parameters:** `id` — số nguyên dương; sai định dạng trả 400.

**Response body:**

HTTP 200.

User detail (giống §4.11).

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

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | phone format / fullName length / status enum invalid. |
| 400 | `STATUS_LOCKED_FORBIDDEN` | client set `status='locked'`. |
| 403 | `FORBIDDEN` | Self update `status` field. |
| 404 | `NOT_FOUND` | User không tồn tại. |
| 409 | `DUPLICATE_VALUE` | Phone đã dùng (P2002). |

### 2.16 `DELETE /users/:id`

**API method:** `DELETE`

**Endpoint URL:** `/api/v1/users/:id`

**Mô tả:** Soft delete user (`deleted_at = NOW()`). Cascade theo Database.md §Cascade Soft Delete Convention: member/staff/subscriptions tương ứng cũng `deleted_at = NOW()` trong cùng `$transaction`.

Auth: JWT Quyền: user.delete

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
| 404 | `NOT_FOUND` | User không tồn tại hoặc đã soft-deleted. |
| 409 | `USER_IS_SELF` | Client xóa chính mình (`:id === JWT.sub`). |
| 409 | `USER_IS_LAST_OWNER` | User là Owner duy nhất còn `deleted_at IS NULL`. |
