# API Conventions

Quy ước này áp dụng cho toàn bộ Markdown API docs trong `docs/VI/Design/API/*/README.md`.

Source runtime chính: `server/src/main.ts`, `server/src/auth/auth.module.ts`, `server/src/common/filters/http-exception.filter.ts`.

## Base URL

- Business API: `/api/v1`.
- Excluded khỏi prefix: `/` và `/health`.
- `POST /api/v1/line/webhook` dùng raw JSON body riêng qua `express.raw({ type: 'application/json' })`.
- Body parser mặc định cho route còn lại: JSON và URL encoded.

## Authentication

- Header JWT: `Authorization: Bearer <JWT>`.
- `JwtAuthGuard` và `RolesGuard` được đăng ký global trong `AuthModule`.
- Endpoint chỉ public khi có `@Public()`.
- Endpoint public hiện tại:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/forgot-password`
  - `POST /api/v1/auth/reset-password`
  - `POST /api/v1/auth/verify-email`
  - `POST /api/v1/auth/resend-verify`
  - `POST /api/v1/auth/line-login`
  - `POST /api/v1/members/self-register`
  - `POST /api/v1/line/webhook`
  - `GET /`
  - `GET /health`
- `GET /api/v1/rooms/lookup` không public.
- `POST /api/v1/devices/access-events` không có `@Public()`, nên cần JWT và còn phải pass `DeviceApiKeyGuard`.

## Authorization

- Các controller nghiệp vụ thường dùng `@UseGuards(PermissionsGuard)`.
- Permission code lấy từ `@RequirePermission('<code>')` ở class hoặc method.
- Một số endpoint không có decorator permission riêng nhưng service/controller kiểm tra caller:
  - Members self/me endpoints.
  - Payment account endpoints theo self hoặc staff/owner.
  - Workout assignment endpoints theo service ownership.
  - RBAC users `GET/PATCH /users/:id` cho phép self bypass trong controller.

## Validation

`ValidationPipe` global đang bật:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`
- `transformOptions.enableImplicitConversion: true`

Vì vậy field ngoài DTO sẽ trả `400 VALIDATION_ERROR` với các endpoint dùng DTO class.

## Request Body Policy

- API có `@Body()` DTO phải có JSON body trong module docs.
- JSON body phải dùng đúng field name camelCase như DTO.
- Với PATCH DTO toàn optional, ví dụ JSON vẫn liệt kê toàn bộ field có thể gửi.
- API không nhận body ghi chính xác: `Request body: Không có`.
- API nhận `Record<string, unknown>` nhưng service không dùng field cụ thể có thể ghi `{}`.
- ID trong request body là number nếu DTO dùng `@Type(() => Number)`/number, là string nếu DTO khai báo `string`.

## Query Parameter Policy

- Query parameter viết riêng ở dòng `Query`.
- Với DTO có default, ghi default khi đọc được từ DTO.
- Với enum, ghi toàn bộ giá trị hợp lệ.
- Query string vẫn truyền qua URL; validation có thể transform về number/boolean theo DTO.

## Response Envelope

Success dạng resource đơn:

```json
{
  "success": true,
  "data": {}
}
```

Success dạng list:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

Success dạng action:

```json
{
  "success": true,
  "message": "Thao tác thành công"
}
```

Một số endpoint `204 NO_CONTENT` không trả body.

## Error Envelope

Shape lỗi chuẩn từ `HttpExceptionFilter`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "details": null
}
```

Các code phổ biến:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO validation hoặc Prisma validation |
| 400 | `FK_CONSTRAINT` | Prisma P2003 |
| 401 | `UNAUTHORIZED` | Thiếu/sai/expired JWT |
| 403 | `FORBIDDEN` | Không đủ role/permission/API key |
| 404 | `NOT_FOUND` | Resource không tồn tại hoặc caller không được thấy resource |
| 409 | `DUPLICATE_VALUE` | Prisma P2002 |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit endpoint auth |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi chưa map |
| 503 | `DATABASE_AUTH_FAILED` hoặc `DATABASE_UNAVAILABLE` | Lỗi kết nối database |

## Serialization

- Prisma `BigInt` được serialize thành JSON string bằng patch trong `main.ts`.
- Client nên xử lý ID response dạng string.
- Decimal từ Prisma thường xuất hiện dạng string trong response.

## Deprecated API Docs

`openapi.yaml`, `Postman-Testing-*.md` và `Module-*.md` đang là legacy docs. Khi khác với folder module mới, ưu tiên controller/DTO/service và folder module mới.
