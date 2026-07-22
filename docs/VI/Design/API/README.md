# API Documentation

Thư mục này mô tả contract HTTP hiện đang được triển khai trong `server/src`.

Nguồn sự thật theo thứ tự:

1. Controller trong `server/src` xác định method, endpoint, HTTP status, `@Public()` và permission decorator.
2. DTO trong `server/src/**/dto` xác định request body, query parameter và validation.
3. Service xác định response data, ownership rule và lỗi nghiệp vụ.
4. Markdown trong các folder module bên dưới trình bày lại contract cho frontend, QA và backend.

## Trạng thái hiện tại

Kiểm kê từ `*.controller.ts` hiện có **144 endpoint**, gồm **142 business API endpoint** có prefix `/api/v1` và **2 health/root endpoint** không có prefix.

| Module docs | Source backend | Số endpoint | Tài liệu |
|---|---|---:|---|
| Auth | `server/src/auth` | 11 | [`auth/README.md`](./auth/README.md) |
| Health | `server/src/health` | 2 | [`health/README.md`](./health/README.md) |
| RBAC | `server/src/rbac` | 16 | [`rbac/README.md`](./rbac/README.md) |
| Membership | `server/src/membership` | 12 | [`membership/README.md`](./membership/README.md) |
| Members | `server/src/members` | 12 | [`members/README.md`](./members/README.md) |
| Payments | `server/src/payments` | 6 | [`payments/README.md`](./payments/README.md) |
| Training | `server/src/training` | 13 | [`training/README.md`](./training/README.md) |
| Feedback | `server/src/feedback` | 6 | [`feedback/README.md`](./feedback/README.md) |
| Workout | `server/src/workout` | 25 | [`workout/README.md`](./workout/README.md) |
| Staff | `server/src/staff` | 14 | [`staff/README.md`](./staff/README.md) |
| Facility | `server/src/facility` | 14 | [`facility/README.md`](./facility/README.md) |
| Reports | `server/src/reports` | 7 | [`reports/README.md`](./reports/README.md) |
| Notifications | `server/src/notifications` | 5 | [`notifications/README.md`](./notifications/README.md) |
| Line Messaging | `server/src/line-messaging` | 1 | [`line-messaging/README.md`](./line-messaging/README.md) |
| **Tổng** |  | **144** |  |

## Quy ước đọc tài liệu

- Mọi business API dùng prefix `/api/v1`.
- `/` và `/health` không dùng `/api/v1`.
- API không có body luôn ghi rõ `Request body: Không có`.
- API có body luôn có JSON đầy đủ các field DTO cho phép, bao gồm optional field quan trọng.
- Query parameter được liệt kê bằng tên field và enum/range khi DTO thể hiện rõ.
- Response body trong module docs là shape đại diện theo controller/service hiện tại; khi cần contract response tuyệt đối chi tiết, kiểm tra service tương ứng.

## Tài liệu chưa đồng bộ

Các file sau được giữ để tránh link gãy nhưng **không còn là nguồn sự thật đầy đủ**:

- [`openapi.yaml`](./openapi.yaml): hiện chưa bao phủ đủ 144 endpoint.
- [`Postman-Testing-All-APIs.md`](./Postman-Testing-All-APIs.md): legacy checklist.
- [`Postman-Testing-Module5-6.md`](./Postman-Testing-Module5-6.md): legacy checklist.
- `Module-*.md`: legacy docs theo cách chia module cũ, đã được thay thế bởi folder module ở trên.

## Kiểm tra sau khi cập nhật API

Chạy kiểm kê route:

```bash
rg -n -g "*.controller.ts" "@(Get|Post|Put|Patch|Delete)\(" server/src
```

Chạy kiểm kê DTO:

```bash
rg -n -g "*.dto.ts" "export class|@Is|@Type|@ValidateNested" server/src
```

Kiểm tra whitespace:

```bash
git diff --check
```
