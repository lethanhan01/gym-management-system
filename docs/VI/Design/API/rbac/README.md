# RBAC API

Nguồn: `server/src/rbac/*.controller.ts`, `server/src/rbac/dto`.

Base paths: `/api/v1/permissions`, `/api/v1/groups`, `/api/v1/users`

Auth mặc định: JWT. Các controller dùng `PermissionsGuard`; phần lớn endpoint yêu cầu permission rõ ràng.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/permissions` | `rbac.manage` | Danh sách quyền |
| GET | `/api/v1/permissions/:id` | `rbac.manage` | Chi tiết quyền |
| GET | `/api/v1/groups` | `rbac.manage` | Danh sách nhóm |
| GET | `/api/v1/groups/:id` | `rbac.manage` | Chi tiết nhóm |
| POST | `/api/v1/groups` | `rbac.manage` | Tạo nhóm |
| PATCH | `/api/v1/groups/:id` | `rbac.manage` | Cập nhật nhóm |
| DELETE | `/api/v1/groups/:id` | `rbac.manage` | Xóa nhóm |
| POST | `/api/v1/groups/:id/permissions` | `rbac.manage` | Gán quyền vào nhóm |
| DELETE | `/api/v1/groups/:id/permissions/:permissionId` | `rbac.manage` | Gỡ quyền khỏi nhóm |
| GET | `/api/v1/users` | `user.read` | Danh sách người dùng |
| GET | `/api/v1/users/:id` | Self hoặc `user.read` | Chi tiết người dùng |
| GET | `/api/v1/users/:id/groups` | Self hoặc `user.read` | Danh sách nhóm của người dùng |
| POST | `/api/v1/users/:id/groups` | `rbac.manage` | Gán nhóm cho người dùng |
| DELETE | `/api/v1/users/:id/groups/:groupId` | `rbac.manage` | Gỡ nhóm khỏi người dùng |
| PATCH | `/api/v1/users/:id` | Self hoặc `user.update` | Cập nhật người dùng |
| DELETE | `/api/v1/users/:id` | `user.delete` | Xóa người dùng |

## API Details

### Danh sách quyền - GET `/api/v1/permissions`

Query: `page` number default `1`, `pageSize` number default `20`, `resource` string optional.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "permissionId": "1",
      "code": "member.read",
      "resource": "member",
      "action": "read"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Chi tiết quyền - GET `/api/v1/permissions/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "permissionId": "1",
    "code": "member.read",
    "resource": "member",
    "action": "read"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách nhóm - GET `/api/v1/groups`

Query: `page` number default `1`, `pageSize` number default `20`, `search` string optional, `includeDeleted` string optional (`"true"` để lấy cả group đã xóa).

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "groupId": "1",
      "name": "owner",
      "description": "Group quản trị hệ thống",
      "permissions": ["rbac.manage"]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Chi tiết nhóm - GET `/api/v1/groups/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "groupId": "1",
    "name": "owner",
    "description": "Group quản trị hệ thống",
    "permissions": ["rbac.manage"]
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Tạo nhóm - POST `/api/v1/groups`

Request body:

```json
{
  "name": "front_desk",
  "description": "Nhân viên lễ tân xử lý hội viên và thanh toán",
  "permissions": ["member.read", "payment.create"]
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "groupId": "10",
    "name": "front_desk",
    "description": "Nhân viên lễ tân xử lý hội viên và thanh toán",
    "permissions": ["member.read", "payment.create"]
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 DUPLICATE_VALUE`.

### Cập nhật nhóm - PATCH `/api/v1/groups/:id`

Params: `id` number.

Request body:

```json
{
  "name": "front_desk",
  "description": "Nhân viên lễ tân xử lý hội viên, subscription và thanh toán"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "groupId": "10",
    "name": "front_desk",
    "description": "Nhân viên lễ tân xử lý hội viên, subscription và thanh toán"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### Xóa nhóm - DELETE `/api/v1/groups/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Gán quyền vào nhóm - POST `/api/v1/groups/:id/permissions`

Params: `id` number.

Request body:

```json
{
  "permissions": ["member.read", "member.update"]
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "groupId": "10",
    "permissions": ["member.read", "member.update"]
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Gỡ quyền khỏi nhóm - DELETE `/api/v1/groups/:id/permissions/:permissionId`

Params: `id` number, `permissionId` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách người dùng - GET `/api/v1/users`

Query: `page` number default `1`, `pageSize` number default `20`, `search` string optional, `groupId` string optional, `role` string optional, `status` enum `pending_verification|active|locked` optional, `includeDeleted` boolean optional, `sort` string default `created_at:desc`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "userId": "1",
      "email": "member@example.com",
      "fullName": "Nguyen Van A",
      "phone": "0900000000",
      "status": "active",
      "groups": ["member"]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Chi tiết người dùng - GET `/api/v1/users/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "userId": "1",
    "email": "member@example.com",
    "fullName": "Nguyen Van A",
    "phone": "0900000000",
    "status": "active",
    "groups": ["member"]
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách nhóm của người dùng - GET `/api/v1/users/:id/groups`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "groupId": "1",
      "name": "member"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Gán nhóm cho người dùng - POST `/api/v1/users/:id/groups`

Params: `id` number.

Request body:

```json
{
  "groupId": "2"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "userId": "1",
    "groupId": "2"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### Gỡ nhóm khỏi người dùng - DELETE `/api/v1/users/:id/groups/:groupId`

Params: `id` number, `groupId` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Cập nhật người dùng - PATCH `/api/v1/users/:id`

Params: `id` number.

Request body:

```json
{
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "status": "active",
  "avatarFileId": "15"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "userId": "1",
    "fullName": "Nguyen Van A",
    "phone": "0900000000",
    "status": "active",
    "avatarFileId": "15"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Xóa người dùng - DELETE `/api/v1/users/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
