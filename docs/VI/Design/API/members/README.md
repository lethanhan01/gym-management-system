# Members API

Nguồn: `server/src/members/members.controller.ts`, `server/src/members/dto`.

Base path: `/api/v1/members`

Auth mặc định: JWT + `PermissionsGuard`, trừ `POST /api/v1/members/self-register` là Public.

## Endpoint Summary

| Method | URL | Auth | Permission | Mô tả |
|---|---|---|---|---|
| GET | `/api/v1/members/me` | JWT | Không có | Member lấy hồ sơ của chính mình |
| PATCH | `/api/v1/members/me` | JWT | Không có | Member cập nhật hồ sơ |
| GET | `/api/v1/members/me/trainers` | JWT | Không có | Danh sách PT khả dụng |
| PATCH | `/api/v1/members/me/trainer` | JWT | Không có | Member tự chọn/hủy PT |
| POST | `/api/v1/members/me/progress` | JWT | Không có | Member tự ghi chỉ số |
| POST | `/api/v1/members` | JWT | `member.create` | Staff tạo hội viên |
| POST | `/api/v1/members/self-register` | Public | Không có | Hội viên tự đăng ký |
| GET | `/api/v1/members` | JWT | `member.read` | Danh sách hội viên |
| GET | `/api/v1/members/:id` | JWT | Service kiểm tra caller | Chi tiết hội viên |
| PATCH | `/api/v1/members/:id` | JWT | Service kiểm tra caller | Cập nhật hội viên |
| DELETE | `/api/v1/members/:id` | JWT | `member.delete` | Xóa hội viên |
| PATCH | `/api/v1/members/:id/assign-trainer` | JWT | `member.update` | Staff gán PT cho hội viên |

## API Details

### GET `/api/v1/members/me`

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "memberCode": "MEM-2026-000001",
    "user": {
      "userId": "1",
      "email": "member@example.com",
      "fullName": "Nguyen Van A"
    }
  }
}
```

Errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### PATCH `/api/v1/members/me`

Request body:

```json
{
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "dateOfBirth": "1998-01-01",
  "address": "Ha Noi"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "fullName": "Nguyen Van A",
    "phone": "0900000000",
    "dateOfBirth": "1998-01-01",
    "address": "Ha Noi"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### GET `/api/v1/members/me/trainers`

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

### PATCH `/api/v1/members/me/trainer`

Request body:

```json
{
  "trainerId": 2
}
```

Để hủy PT, gửi:

```json
{
  "trainerId": null
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "primaryTrainerId": "2"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### POST `/api/v1/members/me/progress`

Request body:

```json
{
  "weight": 70.5,
  "height": 172
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
    "height": "172.00"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### POST `/api/v1/members`

Request body:

```json
{
  "email": "member@example.com",
  "password": "Password123",
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "dateOfBirth": "1998-01-01",
  "address": "Ha Noi",
  "packageId": 1,
  "paymentMethod": "cash",
  "transactionReference": "PAY-20260718-0001"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "memberCode": "MEM-2026-000001",
    "userId": "1",
    "subscriptionId": "1"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### POST `/api/v1/members/self-register`

Request body:

```json
{
  "email": "member@example.com",
  "password": "Password123",
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "dateOfBirth": "1998-01-01",
  "address": "Ha Noi",
  "packageId": 1
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "memberCode": "MEM-2026-000001",
    "userId": "1"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `404 NOT_FOUND`, `409 DUPLICATE_VALUE`.

### GET `/api/v1/members`

Query: `page`, `pageSize`, `search`, `status=active|locked|pending_verification`, `subStatus=active|expired`, `trainerId`, `includeDeleted`, `sort`.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": [
    {
      "memberId": "1",
      "memberCode": "MEM-2026-000001",
      "fullName": "Nguyen Van A",
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

### GET `/api/v1/members/:id`

Params: `id` number.

Request body: Không có.

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "memberCode": "MEM-2026-000001",
    "fullName": "Nguyen Van A"
  }
}
```

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### PATCH `/api/v1/members/:id`

Params: `id` number.

Request body:

```json
{
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "dateOfBirth": "1998-01-01",
  "address": "Ha Noi"
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "fullName": "Nguyen Van A"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### DELETE `/api/v1/members/:id`

Params: `id` number.

Request body: Không có.

Response body: Không có body, HTTP `204`.

Errors: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### PATCH `/api/v1/members/:id/assign-trainer`

Params: `id` number.

Request body:

```json
{
  "trainerId": 2
}
```

Để hủy PT, gửi:

```json
{
  "trainerId": null
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "memberId": "1",
    "primaryTrainerId": "2"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
