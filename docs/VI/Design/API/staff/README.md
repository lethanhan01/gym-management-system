# Staff API

Nguồn: `server/src/staff/staff.controller.ts`, `server/src/staff/dto`, `server/src/staff/staff.service.ts`.

Base path: `/api/v1/staff`

Auth mặc định: JWT + `PermissionsGuard`.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/staff/me` | Không có | Nhân viên lấy hồ sơ của chính mình |
| GET | `/api/v1/staff` | `staff.read` | Danh sách nhân viên |
| POST | `/api/v1/staff` | `staff.create` | Tạo nhân viên |
| GET | `/api/v1/staff/trainers` | Không có | Danh sách huấn luyện viên |
| GET | `/api/v1/staff/schedules/range` | `schedule.read` | Lịch làm việc theo khoảng ngày |
| POST | `/api/v1/staff/me/attendance/check-in` | Không có | Nhân viên chấm công vào |
| POST | `/api/v1/staff/me/attendance/check-out` | Không có | Nhân viên chấm công ra |
| GET | `/api/v1/staff/me/attendance` | Không có | Lịch sử chấm công cá nhân |
| GET | `/api/v1/staff/:id` | `staff.read` | Chi tiết nhân viên |
| PATCH | `/api/v1/staff/:id` | `staff.update` | Cập nhật nhân viên |
| DELETE | `/api/v1/staff/:id` | `staff.delete` | Xóa nhân viên |
| GET | `/api/v1/staff/:id/schedules` | `schedule.read` | Lịch của một nhân viên |
| POST | `/api/v1/staff/:id/schedules` | `schedule.manage` | Tạo lịch cho nhân viên |
| DELETE | `/api/v1/staff/:id/schedules/:scheduleId` | `schedule.manage` | Xóa lịch của nhân viên |

## API Details

### Nhân viên lấy hồ sơ của chính mình - GET `/api/v1/staff/me`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "staffCode": "STF-2026-000001",
    "fullName": "Tran Staff",
    "position": "staff"
  }
}
```

Errors: `400 STAFF_PROFILE_MISSING`, `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### Danh sách nhân viên - GET `/api/v1/staff`

Query: `page` number default `1`, `pageSize` number default `20`, `position` string optional, `status` string optional (`deleted` chỉ owner được xem), `search` string optional, `sort` string default `staff_code:asc`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1",
      "staffCode": "STF-2026-000001",
      "fullName": "Tran Staff",
      "position": "staff"
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

### Tạo nhân viên - POST `/api/v1/staff`

Request body:

```json
{
  "email": "staff@example.com",
  "phone": "0900000001",
  "fullName": "Tran Staff",
  "position": "staff",
  "groupIds": ["2", "3"]
}
```

`position` enum trong DTO: `owner|staff|trainer|member`.

Response body:

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "staffCode": "STF-2026-000001",
    "userId": "2",
    "fullName": "Tran Staff",
    "position": "staff"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 DUPLICATE_VALUE`.

### Danh sách huấn luyện viên - GET `/api/v1/staff/trainers`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "staffId": "2",
      "staffCode": "STF-2026-000002",
      "fullName": "Tran Trainer",
      "position": "trainer"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`.

### Lịch làm việc theo khoảng ngày - GET `/api/v1/staff/schedules/range`

Query: `from` string required, `to` string required.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "scheduleId": "1",
      "staffId": "1",
      "workDate": "2026-07-18",
      "shift": "morning"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Nhân viên chấm công vào - POST `/api/v1/staff/me/attendance/check-in`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "logId": "1",
    "staffId": "1",
    "checkIn": "2026-07-18T01:00:00.000Z",
    "checkOut": null
  }
}
```

Errors: `400 STAFF_PROFILE_MISSING`, `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`.

### Nhân viên chấm công ra - POST `/api/v1/staff/me/attendance/check-out`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "logId": "1",
    "staffId": "1",
    "checkIn": "2026-07-18T01:00:00.000Z",
    "checkOut": "2026-07-18T10:00:00.000Z"
  }
}
```

Errors: `400 STAFF_PROFILE_MISSING`, `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`.

### Lịch sử chấm công cá nhân - GET `/api/v1/staff/me/attendance`

Query: `from` ISO date optional, `to` ISO date optional, `pageSize` number optional.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "logId": "1",
      "staffId": "1",
      "checkIn": "2026-07-18T01:00:00.000Z",
      "checkOut": "2026-07-18T10:00:00.000Z"
    }
  ]
}
```

Errors: `400 STAFF_PROFILE_MISSING`, `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`.

### Chi tiết nhân viên - GET `/api/v1/staff/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "staffCode": "STF-2026-000001",
    "fullName": "Tran Staff",
    "position": "staff"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Cập nhật nhân viên - PATCH `/api/v1/staff/:id`

Params: `id` number.

Request body:

```json
{
  "fullName": "Tran Staff",
  "phone": "0900000001",
  "position": "staff"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "fullName": "Tran Staff",
    "phone": "0900000001",
    "position": "staff"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Xóa nhân viên - DELETE `/api/v1/staff/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "deleted": true
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Lịch của một nhân viên - GET `/api/v1/staff/:id/schedules`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "scheduleId": "1",
      "staffId": "1",
      "workDate": "2026-07-18",
      "shift": "morning"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Tạo lịch cho nhân viên - POST `/api/v1/staff/:id/schedules`

Params: `id` number.

Request body:

```json
{
  "schedules": [
    {
      "shift": "morning",
      "workDate": "2026-07-18"
    },
    {
      "shift": "afternoon",
      "workDate": "2026-07-19"
    }
  ]
}
```

`shift` enum: `morning|afternoon|evening`.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "scheduleId": "1",
      "staffId": "1",
      "workDate": "2026-07-18",
      "shift": "morning"
    }
  ]
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### Xóa lịch của nhân viên - DELETE `/api/v1/staff/:id/schedules/:scheduleId`

Params: `id` number, `scheduleId` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "scheduleId": "1",
    "deleted": true
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
