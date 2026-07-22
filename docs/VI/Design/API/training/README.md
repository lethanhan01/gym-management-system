# Training API

Nguồn: `server/src/training/training.controller.ts`, `server/src/training/dto`.

Base paths: `/api/v1/training-sessions`, `/api/v1/attendance-logs`, `/api/v1/attendance`, `/api/v1/members/:id/progress`, `/api/v1/member-progress`, `/api/v1/devices`

Auth mặc định: JWT. `TrainingController` dùng `PermissionsGuard`. `DeviceController` dùng `DeviceApiKeyGuard`; vì route không có `@Public()`, global JWT vẫn áp dụng, nên caller cần JWT và header device API key.

## Endpoint Summary

| Method | URL | Permission/Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/training-sessions` | `session.read` | Danh sách buổi tập |
| GET | `/api/v1/training-sessions/:id` | `session.read` | Chi tiết buổi tập |
| POST | `/api/v1/training-sessions` | `session.manage` | Tạo buổi tập |
| PATCH | `/api/v1/training-sessions/:id` | `session.manage` | Cập nhật buổi tập |
| POST | `/api/v1/training-sessions/:id/cancel` | `session.manage` | Hủy buổi tập |
| POST | `/api/v1/training-sessions/:id/status` | `session.manage` | Đổi trạng thái buổi tập |
| GET | `/api/v1/attendance-logs` | `attendance.read` | Danh sách bản ghi điểm danh |
| POST | `/api/v1/attendance/manual-checkin` | `attendance.checkin` | Điểm danh thủ công |
| PATCH | `/api/v1/attendance-logs/:id/checkout` | `attendance.checkin` | Ghi nhận rời buổi tập |
| GET | `/api/v1/members/:id/progress` | `progress.read` | Danh sách tiến độ hội viên |
| POST | `/api/v1/members/:id/progress` | `progress.record` | Ghi tiến độ hội viên |
| DELETE | `/api/v1/member-progress/:id` | `progress.record` | Xóa tiến độ hội viên |
| POST | `/api/v1/devices/access-events` | JWT + `X-Device-API-Key` | Nhận sự kiện từ thiết bị |

## API Details

### Danh sách buổi tập - GET `/api/v1/training-sessions`

Query: `page`, `pageSize`, `memberId`, `trainerStaffId`, `roomId`, `status=scheduled|in_progress|completed|cancelled`, `from`, `to`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "sessionId": "1",
      "memberId": "1",
      "trainerStaffId": "2",
      "roomId": "1",
      "status": "scheduled",
      "startTime": "2026-07-18T08:00:00.000Z",
      "endTime": "2026-07-18T09:00:00.000Z"
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

### Chi tiết buổi tập - GET `/api/v1/training-sessions/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "sessionId": "1",
    "memberId": "1",
    "trainerStaffId": "2",
    "roomId": "1",
    "status": "scheduled",
    "startTime": "2026-07-18T08:00:00.000Z",
    "endTime": "2026-07-18T09:00:00.000Z"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Tạo buổi tập - POST `/api/v1/training-sessions`

Request body:

```json
{
  "memberId": "1",
  "trainerStaffId": "2",
  "roomId": "1",
  "assignmentId": "1",
  "planDayId": "1",
  "startTime": "2026-07-18T08:00:00.000Z",
  "endTime": "2026-07-18T09:00:00.000Z"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "sessionId": "1",
    "memberId": "1",
    "trainerStaffId": "2",
    "roomId": "1",
    "status": "scheduled"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### Cập nhật buổi tập - PATCH `/api/v1/training-sessions/:id`

Params: `id` number.

Request body:

```json
{
  "trainerStaffId": "2",
  "roomId": "1",
  "startTime": "2026-07-18T08:00:00.000Z",
  "endTime": "2026-07-18T09:00:00.000Z"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "sessionId": "1",
    "trainerStaffId": "2",
    "roomId": "1",
    "startTime": "2026-07-18T08:00:00.000Z",
    "endTime": "2026-07-18T09:00:00.000Z"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Hủy buổi tập - POST `/api/v1/training-sessions/:id/cancel`

Params: `id` number.

Request body:

```json
{
  "reason": "Member báo bận"
}
```

Response body:

```json
{
  "success": true
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Đổi trạng thái buổi tập - POST `/api/v1/training-sessions/:id/status`

Params: `id` number.

Request body:

```json
{
  "status": "in_progress"
}
```

`status` chỉ nhận: `in_progress|completed`.

Response body:

```json
{
  "success": true,
  "data": {
    "sessionId": "1",
    "status": "in_progress"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách bản ghi điểm danh - GET `/api/v1/attendance-logs`

Query: `page`, `pageSize`, `memberId`, `subscriptionId`, `sessionId`, `method=realtime|manual|qr`, `from`, `to`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "attendanceId": "1",
      "memberId": "1",
      "sessionId": "1",
      "method": "manual",
      "checkIn": "2026-07-18T08:00:00.000Z",
      "checkOut": null
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

### Điểm danh thủ công - POST `/api/v1/attendance/manual-checkin`

Request body:

```json
{
  "memberCode": "MEM-2026-000001",
  "occurredAt": "2026-07-18T08:00:00.000Z"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "attendanceId": "1",
    "memberId": "1",
    "method": "manual",
    "checkIn": "2026-07-18T08:00:00.000Z"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Ghi nhận rời buổi tập - PATCH `/api/v1/attendance-logs/:id/checkout`

Params: `id` number.

Request body:

```json
{
  "endedAt": "2026-07-18T09:00:00.000Z"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "attendanceId": "1",
    "checkOut": "2026-07-18T09:00:00.000Z"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Danh sách tiến độ hội viên - GET `/api/v1/members/:id/progress`

Params: `id` number.

Query: `from` string optional, `to` string optional, `limit` string optional.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "progressId": "1",
      "memberId": "1",
      "weight": "70.50",
      "bmi": "23.80",
      "recordedAt": "2026-07-18T00:00:00.000Z"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Ghi tiến độ hội viên - POST `/api/v1/members/:id/progress`

Params: `id` number.

Request body:

```json
{
  "weight": 70.5,
  "bmi": 23.8,
  "goal": "Giảm mỡ",
  "notes": "Tăng cardio",
  "recordedAt": "2026-07-18T00:00:00.000Z"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "progressId": "1",
    "memberId": "1",
    "weight": "70.50",
    "bmi": "23.80"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Xóa tiến độ hội viên - DELETE `/api/v1/member-progress/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Nhận sự kiện từ thiết bị - POST `/api/v1/devices/access-events`

Headers: `Authorization: Bearer <JWT>`, `X-Device-API-Key: <key>`.

Request body:

```json
{
  "memberIdentifier": "MEM-2026-000001",
  "occurredAt": "2026-07-18T08:00:00.000Z",
  "deviceId": "gate-01"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "attendanceId": "1",
    "memberId": "1",
    "method": "realtime"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
