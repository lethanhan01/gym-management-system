# Facility API

Nguồn: `server/src/facility/facility.controller.ts`, `server/src/facility/dto`.

Base paths: `/api/v1/rooms`, `/api/v1/equipment`, `/api/v1/maintenance-logs`

Auth mặc định: JWT + `PermissionsGuard`. `GET /api/v1/rooms/lookup` vẫn cần JWT vì không có `@Public()`.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/rooms/lookup` | Không có | Lookup phòng, pageSize tối đa 100 |
| GET | `/api/v1/rooms` | `room.manage` | Danh sách phòng |
| GET | `/api/v1/rooms/:id` | `room.manage` | Chi tiết phòng |
| POST | `/api/v1/rooms` | `room.manage` | Tạo phòng |
| PATCH | `/api/v1/rooms/:id` | `room.manage` | Cập nhật phòng |
| DELETE | `/api/v1/rooms/:id` | `room.manage` | Xóa phòng |
| GET | `/api/v1/equipment` | `equipment.manage` | Danh sách thiết bị |
| GET | `/api/v1/equipment/:id` | `equipment.manage` | Chi tiết thiết bị |
| POST | `/api/v1/equipment` | `equipment.manage` | Tạo thiết bị |
| PATCH | `/api/v1/equipment/:id` | `equipment.manage` | Cập nhật thiết bị |
| DELETE | `/api/v1/equipment/:id` | `equipment.manage` | Xóa thiết bị |
| GET | `/api/v1/equipment/:id/maintenance-logs` | `maintenance.read` | Lịch sử bảo trì thiết bị |
| POST | `/api/v1/equipment/:id/maintenance-logs` | `maintenance.report` | Báo hỏng/bảo trì thiết bị |
| PATCH | `/api/v1/maintenance-logs/:id` | `maintenance.resolve` | Cập nhật trạng thái bảo trì |

## API Details

### GET `/api/v1/rooms/lookup`

Query: `page`, `pageSize`, `roomType`, `search`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "roomId": "1",
      "roomCode": "RM-001",
      "name": "Yoga 1",
      "roomType": "yoga",
      "capacity": 30
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 100,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`.

### GET `/api/v1/rooms`

Query: `page`, `pageSize`, `roomType`, `search`, `sort`.

Request body: Không có.

Response body giống `GET /rooms/lookup` nhưng yêu cầu `room.manage`.

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### GET `/api/v1/rooms/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "roomId": "1",
    "roomCode": "RM-001",
    "name": "Yoga 1",
    "roomType": "yoga",
    "capacity": 30,
    "description": "Phòng yoga tầng 2"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/rooms`

Request body:

```json
{
  "roomCode": "RM-001",
  "name": "Yoga 1",
  "roomType": "yoga",
  "capacity": 30,
  "description": "Phòng yoga tầng 2"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "roomId": "1",
    "roomCode": "RM-001",
    "name": "Yoga 1"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 DUPLICATE_VALUE`.

### PATCH `/api/v1/rooms/:id`

Params: `id` number.

Request body:

```json
{
  "roomCode": "RM-001",
  "name": "Yoga 1",
  "roomType": "yoga",
  "capacity": 35,
  "description": "Phòng yoga tầng 2"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "roomId": "1",
    "roomCode": "RM-001",
    "capacity": 35
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### DELETE `/api/v1/rooms/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### GET `/api/v1/equipment`

Query: `page`, `pageSize`, `roomId`, `status=active|broken|repairing|retired`, `search`, `warrantyExpiring`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "equipmentId": "1",
      "equipmentCode": "EQP-000001",
      "roomId": "1",
      "name": "Máy chạy bộ",
      "status": "active"
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

### GET `/api/v1/equipment/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "equipmentId": "1",
    "equipmentCode": "EQP-000001",
    "roomId": "1",
    "name": "Máy chạy bộ",
    "importDate": "2026-01-01",
    "warrantyUntil": "2027-01-01",
    "status": "active"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/equipment`

Request body:

```json
{
  "equipmentCode": "EQP-000001",
  "roomId": 1,
  "name": "Máy chạy bộ",
  "importDate": "2026-01-01",
  "warrantyUntil": "2027-01-01"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "equipmentId": "1",
    "equipmentCode": "EQP-000001",
    "name": "Máy chạy bộ"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### PATCH `/api/v1/equipment/:id`

Params: `id` number.

Request body:

```json
{
  "roomId": 1,
  "name": "Máy chạy bộ",
  "importDate": "2026-01-01",
  "warrantyUntil": "2027-01-01",
  "status": "repairing"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "equipmentId": "1",
    "roomId": "1",
    "name": "Máy chạy bộ",
    "status": "repairing"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### DELETE `/api/v1/equipment/:id`

Params: `id` number.

Query: `force` string optional; `force=true` yêu cầu quyền/role phù hợp trong service.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### GET `/api/v1/equipment/:id/maintenance-logs`

Params: `id` number.

Query: `page`, `pageSize`, `status=reported|repairing|resolved|failed`, `from`, `to`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "maintenanceId": "1",
      "equipmentId": "1",
      "description": "Máy phát tiếng ồn lớn",
      "status": "reported"
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

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/equipment/:id/maintenance-logs`

Params: `id` number.

Request body:

```json
{
  "description": "Máy phát tiếng ồn lớn khi chạy tốc độ cao"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "maintenanceId": "1",
    "equipmentId": "1",
    "description": "Máy phát tiếng ồn lớn khi chạy tốc độ cao",
    "status": "reported"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### PATCH `/api/v1/maintenance-logs/:id`

Params: `id` number.

Request body:

```json
{
  "status": "resolved"
}
```

`status` chỉ nhận: `repairing|resolved|failed`.

Response body:

```json
{
  "success": true,
  "data": {
    "maintenanceId": "1",
    "status": "resolved"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
