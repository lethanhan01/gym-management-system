# Feedback API

Nguồn: `server/src/feedback/feedback.controller.ts`, `server/src/feedback/dto`.

Base path: `/api/v1/feedback`

Auth mặc định: JWT + `PermissionsGuard`.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/feedback` | `feedback.read` | Danh sách feedback |
| GET | `/api/v1/feedback/:id` | `feedback.read` | Chi tiết feedback |
| POST | `/api/v1/feedback` | `feedback.create` | Tạo feedback |
| PATCH | `/api/v1/feedback/:id/assign` | `feedback.handle` | Phân công xử lý feedback |
| PATCH | `/api/v1/feedback/:id/status` | `feedback.handle` | Cập nhật trạng thái feedback |
| DELETE | `/api/v1/feedback/:id` | `feedback.create` | Xóa mềm feedback |

## API Details

### GET `/api/v1/feedback`

Query: `page`, `pageSize`, `memberId`, `feedbackType=staff|equipment|service`, `severity=low|medium|high`, `status=open|in_progress|resolved|rejected`, `handledByStaffId`, `subjectStaffId`, `subjectEquipmentId`, `overdue`, `from`, `to`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "feedbackId": "1",
      "memberId": "1",
      "feedbackType": "service",
      "content": "Dịch vụ tốt",
      "severity": "low",
      "status": "open"
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

### GET `/api/v1/feedback/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "feedbackId": "1",
    "memberId": "1",
    "feedbackType": "service",
    "content": "Dịch vụ tốt",
    "severity": "low",
    "status": "open"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/feedback`

Request body:

```json
{
  "memberId": "1",
  "feedbackType": "equipment",
  "content": "Máy chạy bộ bị kẹt nút tăng tốc",
  "severity": "high",
  "subjectStaffId": "2",
  "subjectEquipmentId": "3"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "feedbackId": "1",
    "memberId": "1",
    "feedbackType": "equipment",
    "status": "open"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### PATCH `/api/v1/feedback/:id/assign`

Params: `id` number.

Request body:

```json
{
  "handledByStaffId": "2"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "feedbackId": "1",
    "handledByStaffId": "2",
    "status": "in_progress"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### PATCH `/api/v1/feedback/:id/status`

Params: `id` number.

Request body:

```json
{
  "status": "resolved",
  "severity": "medium",
  "resolutionNote": "Đã xử lý và thông báo cho hội viên"
}
```

`resolutionNote` bắt buộc khi `status` là `resolved` hoặc `rejected`.

Response body:

```json
{
  "success": true,
  "data": {
    "feedbackId": "1",
    "status": "resolved",
    "severity": "medium",
    "resolutionNote": "Đã xử lý và thông báo cho hội viên"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### DELETE `/api/v1/feedback/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
