# RBAC API

Nguồn: `server/src/rbac/*.controller.ts`, `server/src/rbac/dto`.

Base paths: `/api/v1/permissions`, `/api/v1/groups`, `/api/v1/users`

Auth mặc định: JWT. Các controller dùng `PermissionsGuard`; phần lớn endpoint yêu cầu permission rõ ràng.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/permissions` | `rbac.manage` | Danh sách permission |
| GET | `/api/v1/permissions/:id` | `rbac.manage` | Chi tiết permission |
| GET | `/api/v1/groups` | `rbac.manage` | Danh sách group |
| GET | `/api/v1/groups/:id` | `rbac.manage` | Chi tiết group |
| POST | `/api/v1/groups` | `rbac.manage` | Tạo group |
| PATCH | `/api/v1/groups/:id` | `rbac.manage` | Cập nhật group |
| DELETE | `/api/v1/groups/:id` | `rbac.manage` | Xóa group |
| POST | `/api/v1/groups/:id/permissions` | `rbac.manage` | Gán permission vào group |
| DELETE | `/api/v1/groups/:id/permissions/:permissionId` | `rbac.manage` | Gỡ permission khỏi group |
| GET | `/api/v1/users` | `user.read` | Danh sách user |
| GET | `/api/v1/users/:id` | Self hoặc `user.read` | Chi tiết user |
| GET | `/api/v1/users/:id/groups` | Self hoặc `user.read` | Danh sách group của user |
| POST | `/api/v1/users/:id/groups` | `rbac.manage` | Gán group cho user |
| DELETE | `/api/v1/users/:id/groups/:groupId` | `rbac.manage` | Gỡ group khỏi user |
| PATCH | `/api/v1/users/:id` | Self hoặc `user.update` | Cập nhật user |
| DELETE | `/api/v1/users/:id` | `user.delete` | Xóa user |

## API Details

### GET `/api/v1/permissions`

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

### GET `/api/v1/permissions/:id`

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

### GET `/api/v1/groups`

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

### GET `/api/v1/groups/:id`

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

### POST `/api/v1/groups`

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

### PATCH `/api/v1/groups/:id`

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

### DELETE `/api/v1/groups/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/groups/:id/permissions`

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

### DELETE `/api/v1/groups/:id/permissions/:permissionId`

Params: `id` number, `permissionId` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### GET `/api/v1/users`

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

### GET `/api/v1/users/:id`

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

### GET `/api/v1/users/:id/groups`

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

### POST `/api/v1/users/:id/groups`

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

### DELETE `/api/v1/users/:id/groups/:groupId`

Params: `id` number, `groupId` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### PATCH `/api/v1/users/:id`

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

### DELETE `/api/v1/users/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
