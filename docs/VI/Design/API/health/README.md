# Health API

Nguồn: `server/src/health/health.controller.ts`, `server/src/main.ts`.

Base path: không dùng `/api/v1` vì `main.ts` exclude `/` và `/health` khỏi global prefix.

## Endpoint Summary

| Method | URL | Auth | Permission | Mô tả |
|---|---|---|---|---|
| GET | `/` | Public | Không có | Kiểm tra ứng dụng đang hoạt động |
| GET | `/health` | Public | Không có | Kiểm tra sức khỏe hệ thống kèm cơ sở dữ liệu |

## API Details

### Kiểm tra ứng dụng đang hoạt động - GET `/`

Request body: Không có.

Response body:

```json
{
  "status": "ok"
}
```

Errors: không có lỗi nghiệp vụ riêng.

### Kiểm tra sức khỏe hệ thống kèm cơ sở dữ liệu - GET `/health`

Request body: Không có.

Response body:

```json
{
  "status": "ok",
  "timestamp": "2026-07-18T00:00:00.000Z",
  "db": "ok"
}
```

Khi database không truy cập được, `status` là `"degraded"` và `db` là `"down"`.

Errors: không có lỗi nghiệp vụ riêng.
