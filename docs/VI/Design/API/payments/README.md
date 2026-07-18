# Payments API

Nguồn: `server/src/payments/payments.controller.ts`, `server/src/payments/dto`.

Base paths: `/api/v1/payments`, `/api/v1/members/:memberId/payment-accounts`

Auth mặc định: JWT + `PermissionsGuard`. Payment account endpoints dùng self-or-staff access trong controller, không có `@RequirePermission` riêng.

## Endpoint Summary

| Method | URL | Permission | Mô tả |
|---|---|---|---|
| POST | `/api/v1/payments` | `payment.create` | Tạo payment |
| GET | `/api/v1/payments` | `payment.read` | Danh sách payment |
| GET | `/api/v1/members/:memberId/payment-accounts` | Self hoặc staff/owner | Danh sách tài khoản thanh toán |
| POST | `/api/v1/members/:memberId/payment-accounts` | Self hoặc staff/owner | Tạo tài khoản thanh toán |
| PATCH | `/api/v1/members/:memberId/payment-accounts/:accountId` | Self hoặc staff/owner | Đặt tài khoản mặc định |
| DELETE | `/api/v1/members/:memberId/payment-accounts/:accountId` | Self hoặc staff/owner | Xóa tài khoản thanh toán |

## API Details

### POST `/api/v1/payments`

Request body:

```json
{
  "memberId": 1,
  "subscriptionId": 1,
  "amount": 500000,
  "method": "cash",
  "transactionReference": "PAY-20260718-0001",
  "status": "success"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "paymentId": "1",
    "memberId": "1",
    "subscriptionId": "1",
    "amount": "500000.00",
    "method": "cash",
    "status": "success"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### GET `/api/v1/payments`

Query: `page`, `pageSize`, `memberId`, `subscriptionId`, `status=success|failed`, `method=cash|bank_card|ewallet`, `from`, `to`, `dateFrom`, `dateTo`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "paymentId": "1",
      "memberId": "1",
      "subscriptionId": "1",
      "amount": "500000.00",
      "method": "cash",
      "status": "success"
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

### GET `/api/v1/members/:memberId/payment-accounts`

Params: `memberId` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "accountId": 1,
      "memberId": "1",
      "type": "bank_card",
      "provider": "VCB",
      "accountRef": "****1234",
      "label": "Thẻ chính",
      "isDefault": true
    }
  ]
}
```

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### POST `/api/v1/members/:memberId/payment-accounts`

Params: `memberId` number.

Request body:

```json
{
  "type": "bank_card",
  "provider": "VCB",
  "accountRef": "****1234",
  "label": "Thẻ chính",
  "isDefault": true
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "accountId": 1,
    "memberId": "1",
    "type": "bank_card",
    "provider": "VCB",
    "accountRef": "****1234",
    "label": "Thẻ chính",
    "isDefault": true
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### PATCH `/api/v1/members/:memberId/payment-accounts/:accountId`

Params: `memberId` number, `accountId` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "accountId": 1,
    "memberId": "1",
    "isDefault": true
  }
}
```

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### DELETE `/api/v1/members/:memberId/payment-accounts/:accountId`

Params: `memberId` number, `accountId` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`.
