# API Specification

| Trường | Giá trị |
|---|---|
| Document ID | `GMS-API-README-001` |
| Version | `1.1.0` |
| Trạng thái | Đồng bộ với controller hiện tại |
| Cập nhật lần cuối | 2026-06-19 |
| Base URL | `/api/v1` |
| Tài liệu liên quan | [`Architecture.md`](../Architecture.md), [`Database.md`](../Database.md), [`SRS_VI.md`](../../VI/SRS_VI.md) |

## 1. Mục đích

Thư mục này mô tả contract HTTP đang được triển khai trong `server/src`. Tài liệu phục vụ backend, frontend và QA khi tích hợp hoặc kiểm thử API.

Nguồn sự thật được ưu tiên theo thứ tự:

1. Controller trong `server/src` xác định method, endpoint, guard và HTTP status.
2. DTO xác định request body, query parameter và validation.
3. Service xác định response data, business rule và lỗi nghiệp vụ.
4. Các file `Module-*.md` trình bày lại contract theo từng nhóm chức năng.

Mỗi file module hiện chỉ có hai phần chính:

1. Mục đích module.
2. Danh sách API của module.

Mỗi API đều ghi rõ API method, endpoint URL, mô tả, request body, response body và các status lỗi cùng điều kiện xảy ra.

## 2. Trạng thái module

10 module hiện mô tả đủ **134 endpoint** được đăng ký trong backend.

| Module | Phạm vi source | Số API | Tài liệu |
|---|---|---:|---|
| 1. Auth | `server/src/auth` | 9 | [`Module-1-Auth.md`](./Module-1-Auth.md) |
| 2. RBAC và User Admin | `server/src/rbac` | 16 | [`Module-2-RBAC.md`](./Module-2-RBAC.md) |
| 3. Package | `server/src/membership/packages` | 6 | [`Module-3-Package.md`](./Module-3-Package.md) |
| 4. Member, Subscription và Payment | `server/src/members`, `server/src/membership/subscriptions`, `server/src/payments` | 24 | [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md) |
| 5. Staff | `server/src/staff` | 14 | [`Module-5-Staff.md`](./Module-5-Staff.md) |
| 6. Facility | `server/src/facility` | 14 | [`Module-6-Facility.md`](./Module-6-Facility.md) |
| 7. Training | `server/src/training` | 13 | [`Module-7-Training.md`](./Module-7-Training.md) |
| 8. Feedback | `server/src/feedback` | 6 | [`Module-8-Feedback.md`](./Module-8-Feedback.md) |
| 9. Report | `server/src/reports` | 7 | [`Module-9-Report.md`](./Module-9-Report.md) |
| 10. Workout | `server/src/workout` | 25 | [`Module-10-Workout.md`](./Module-10-Workout.md) |
| **Tổng** |  | **134** |  |

Endpoint `/health` thuộc `HealthModule`, không phải API nghiệp vụ và không được tính vào 134 endpoint trên.

## 3. Phạm vi từng module

### Module 1 — Auth

Đăng nhập, đăng xuất, lấy user hiện tại, khôi phục mật khẩu bằng OTP, xác thực email, LINE login và đổi mật khẩu.

### Module 2 — RBAC và User Admin

Permission, group, gán permission cho group, quản trị user và quan hệ user-group. Permission catalog hiện nằm tại `server/prisma/seed/rbac.ts` với 49 permission code và 4 group hệ thống.

### Module 3 — Package

Danh sách, chi tiết, tạo, cập nhật, đổi trạng thái và xóa gói tập.

### Module 4 — Member, Subscription và Payment

Hồ sơ hội viên, tự đăng ký, tự chọn PT, chỉ số cá nhân, subscription, gia hạn/hủy gói, payment và payment account.

### Module 5 — Staff

Hồ sơ nhân viên, danh sách PT, lịch làm việc và chấm công cá nhân.

### Module 6 — Facility

Phòng tập, thiết bị và quy trình báo hỏng/bảo trì thiết bị.

### Module 7 — Training

Training session, attendance, device access event và tiến độ hội viên. Training session có thể liên kết workout-plan assignment và plan day.

### Module 8 — Feedback

Tạo, xem, phân công, cập nhật trạng thái và xóa feedback.

### Module 9 — Report

Báo cáo doanh thu, hội viên, gia hạn, hiệu suất nhân viên/PT và gói tập bán chạy.

### Module 10 — Workout

Thư viện bài tập, workout plan, ngày tập, bài tập trong plan, assignment cho hội viên và workout log.

## 4. Quy ước runtime quan trọng

- Mọi API nghiệp vụ dùng prefix `/api/v1`.
- `/health` không có prefix và không yêu cầu JWT.
- `JwtAuthGuard` là global guard; endpoint chỉ public khi có `@Public()`.
- Các endpoint public hiện gồm login, quên/đặt lại mật khẩu, xác thực/gửi lại OTP, LINE login và member self-register.
- `GET /api/v1/rooms/lookup` vẫn yêu cầu JWT vì controller không có `@Public()`.
- `POST /api/v1/devices/access-events` hiện cần cả JWT và header `X-Device-API-Key` do global JWT guard vẫn chạy trước local device guard.
- `ValidationPipe` bật `whitelist`, `forbidNonWhitelisted`, `transform` và implicit conversion.
- ID từ cột `BIGINT` được serialize thành JSON string.
- Lỗi được chuẩn hóa bởi `HttpExceptionFilter` theo shape:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Mô tả lỗi",
  "details": null
}
```

- Lỗi kết nối database trả HTTP 503 với code `DATABASE_AUTH_FAILED` hoặc `DATABASE_UNAVAILABLE`.

## 5. Traceability theo use case

| Use case | Module | API chính |
|---|---|---|
| Đăng nhập/đăng xuất | 1 | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Quên mật khẩu và xác thực email | 1 | `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `POST /auth/resend-verify` |
| Quản trị user và quyền | 2 | `/permissions`, `/groups`, `/users` |
| Quản lý gói tập | 3 | `/packages` |
| Đăng ký và quản lý hội viên | 4 | `/members`, `/subscriptions`, `/payments` |
| Gia hạn/hủy subscription | 4 | `POST /subscriptions/:id/renew`, `PATCH /subscriptions/:id/cancel` |
| Quản lý nhân viên | 5 | `/staff`, `/staff/:id/schedules`, `/staff/me/attendance` |
| Quản lý phòng và thiết bị | 6 | `/rooms`, `/equipment`, `/maintenance-logs` |
| Lập lịch tập | 7 | `/training-sessions` |
| Check-in/check-out | 7 | `/attendance-logs`, `/attendance/manual-checkin`, `/devices/access-events` |
| Theo dõi tiến độ | 4 và 7 | `POST /members/me/progress`, `/members/:id/progress`, `/member-progress/:id` |
| Gửi và xử lý feedback | 8 | `/feedback`, `/feedback/:id/assign`, `/feedback/:id/status` |
| Xem báo cáo | 9 | `/reports/*` |
| Lập và giao workout plan | 10 | `/workout-plans`, `/workout-plans/members/:memberId/assign` |
| Ghi nhận buổi tập | 10 | `/workout-logs` |

## 6. OpenAPI

[`openapi.yaml`](./openapi.yaml) hiện có version `1.0.2`, gồm 35 path và 56 operation. File này chưa bao phủ đủ 134 endpoint, vì vậy chưa được xem là nguồn sự thật đầy đủ.

Khi contract giữa Markdown và OpenAPI khác nhau, ưu tiên controller/DTO/service và file module tương ứng. OpenAPI cần một đợt đồng bộ riêng trước khi dùng để code generation hoặc kiểm thử toàn hệ thống.

## 7. Kiểm tra tài liệu

Các kiểm tra tối thiểu sau mỗi lần thay đổi API:

1. So sánh toàn bộ decorator `@Get`, `@Post`, `@Patch`, `@Put`, `@Delete` với bảng API trong module tương ứng.
2. Kiểm tra request body và query parameter với DTO thực tế.
3. Kiểm tra response và domain error với service.
4. Chạy kiểm tra whitespace:

```bash
git diff --check
```

5. Khi cập nhật `openapi.yaml`, chạy OpenAPI lint:

```bash
npx -y @redocly/cli@latest lint docs/Design/API/openapi.yaml
```

