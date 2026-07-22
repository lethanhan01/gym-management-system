# Notifications API

Nguồn: `server/src/notifications/notifications.controller.ts`, `server/src/notifications/dto`.

Base path: `/api/v1/notifications`

Auth mặc định: JWT + `PermissionsGuard`, class-level permission `notification.read`.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/notifications` | `notification.read` | Danh sách thông báo |
| GET | `/api/v1/notifications/new` | `notification.read` | Thông báo mới sau một ID |
| GET | `/api/v1/notifications/unread-count` | `notification.read` | Đếm thông báo chưa đọc |
| PATCH | `/api/v1/notifications/:id/read` | `notification.read` | Đánh dấu một thông báo là đã đọc |
| PATCH | `/api/v1/notifications/read-all` | `notification.read` | Đánh dấu tất cả đã đọc |

## API Details

### Danh sách thông báo - GET `/api/v1/notifications`

Query: `page` number default `1`, `pageSize` number default `20` max `50`, `status=all|unread` default `all`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "notificationId": "1",
      "userId": "1",
      "title": "Thông báo",
      "content": "Nội dung thông báo",
      "readAt": null,
      "createdAt": "2026-07-18T00:00:00.000Z"
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

### Thông báo mới sau một ID - GET `/api/v1/notifications/new`

Query: `afterId` number required min `0`, `limit` number optional default `20` max `50`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "notificationId": "2",
      "userId": "1",
      "title": "Thông báo mới",
      "content": "Nội dung mới"
    }
  ]
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Đếm thông báo chưa đọc - GET `/api/v1/notifications/unread-count`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "count": 3
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### Đánh dấu một thông báo là đã đọc - PATCH `/api/v1/notifications/:id/read`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "notificationId": "1",
    "readAt": "2026-07-18T00:00:00.000Z"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### Đánh dấu tất cả đã đọc - PATCH `/api/v1/notifications/read-all`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "updatedCount": 3
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`.
