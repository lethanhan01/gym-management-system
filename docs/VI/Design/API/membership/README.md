# Membership API

Nguồn: `server/src/membership/packages`, `server/src/membership/subscriptions`.

Base paths: `/api/v1/packages`, `/api/v1/subscriptions`

Auth mặc định: JWT + `PermissionsGuard`.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| GET | `/api/v1/packages` | `package.read` | Danh sách gói tập |
| GET | `/api/v1/packages/:id` | `package.read` | Chi tiết gói tập |
| POST | `/api/v1/packages` | `package.manage` | Tạo gói tập |
| PATCH | `/api/v1/packages/:id` | `package.manage` | Cập nhật gói tập |
| PATCH | `/api/v1/packages/:id/status` | `package.manage` | Đổi trạng thái gói tập |
| DELETE | `/api/v1/packages/:id` | `package.manage` | Xóa gói tập |
| POST | `/api/v1/subscriptions` | `subscription.create` | Tạo subscription |
| GET | `/api/v1/subscriptions` | `subscription.read` | Danh sách subscription |
| GET | `/api/v1/subscriptions/member/:memberId` | `subscription.read` | Subscription theo hội viên |
| PATCH | `/api/v1/subscriptions/:id/cancel` | `subscription.cancel` | Hủy subscription |
| POST | `/api/v1/subscriptions/:id/renew` | `subscription.create` | Gia hạn subscription |
| GET | `/api/v1/subscriptions/:id` | `subscription.read` | Chi tiết subscription |

## API Details

### GET `/api/v1/packages`

Query: `page`, `pageSize`, `status=active|inactive|deleted`, `minDuration`, `maxDuration`, `minPrice`, `maxPrice`, `search`, `includeDeleted`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "packageId": "1",
      "packageCode": "PKG-A1B2",
      "name": "Gói tháng",
      "durationDays": 30,
      "price": "500000.00",
      "benefits": "Tập không giới hạn",
      "status": "active",
      "includesPt": false
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

### GET `/api/v1/packages/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "packageId": "1",
    "packageCode": "PKG-A1B2",
    "name": "Gói tháng",
    "durationDays": 30,
    "price": "500000.00",
    "benefits": "Tập không giới hạn",
    "status": "active",
    "includesPt": false
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/packages`

Request body:

```json
{
  "packageCode": "PKG-A1B2",
  "name": "Gói tháng",
  "durationDays": 30,
  "price": 500000,
  "benefits": "Tập không giới hạn",
  "status": "active",
  "includesPt": false
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "packageId": "1",
    "packageCode": "PKG-A1B2",
    "name": "Gói tháng"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 DUPLICATE_VALUE`.

### PATCH `/api/v1/packages/:id`

Params: `id` number.

Request body:

```json
{
  "packageCode": "PKG-A1B2",
  "name": "Gói tháng nâng cấp",
  "durationDays": 45,
  "price": 650000,
  "benefits": "Tập không giới hạn và 1 buổi PT",
  "includesPt": true
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "packageId": "1",
    "packageCode": "PKG-A1B2",
    "name": "Gói tháng nâng cấp"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### PATCH `/api/v1/packages/:id/status`

Params: `id` number.

Request body:

```json
{
  "status": "inactive"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "packageId": "1",
    "status": "inactive"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### DELETE `/api/v1/packages/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/subscriptions`

Request body:

```json
{
  "memberId": 1,
  "packageId": 1,
  "trainerId": 2
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "1",
    "memberId": "1",
    "packageId": "1",
    "trainerId": "2",
    "status": "active"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### GET `/api/v1/subscriptions`

Query: `page`, `pageSize`, `memberId`, `packageId`, `status=pending|active|expired|cancelled`, `from`, `to`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "subscriptionId": "1",
      "memberId": "1",
      "packageId": "1",
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

### GET `/api/v1/subscriptions/member/:memberId`

Params: `memberId` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "subscriptionId": "1",
      "memberId": "1",
      "status": "active"
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### PATCH `/api/v1/subscriptions/:id/cancel`

Params: `id` number.

Request body:

```json
{}
```

Response body:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "1",
    "status": "cancelled"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### POST `/api/v1/subscriptions/:id/renew`

Params: `id` number.

Request body:

```json
{
  "method": "cash",
  "transactionReference": "PAY-20260718-0001"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "2",
    "renewedFromSubscriptionId": "1",
    "status": "active"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### GET `/api/v1/subscriptions/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "1",
    "memberId": "1",
    "packageId": "1",
    "status": "active"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
