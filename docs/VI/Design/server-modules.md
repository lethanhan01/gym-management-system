# Server Modules Overview

Tổng hợp các module NestJS trong `server/src/`, trách nhiệm và endpoints tương ứng.

## Module — Trách nhiệm

| Module | Thư mục | Trách nhiệm chính |
|--------|---------|-------------------|
| **Auth** | `auth/` | JWT auth, OTP, đặt lại mật khẩu, đổi mật khẩu, LINE login |
| **Users** | `users/` | Lookup user và roles — service-only, không có controller |
| **RBAC** | `rbac/` | Quản lý Groups, Permissions, gán user vào group |
| **Members** | `members/` | CRUD hội viên, self-register, gán trainer, theo dõi progress |
| **Staff** | `staff/` | CRUD nhân viên, lịch làm việc, chấm công (check-in/out) |
| **Packages** | `membership/packages/` | CRUD gói tập, trạng thái active/inactive |
| **Subscriptions** | `membership/subscriptions/` | Vòng đời đăng ký (tạo, gia hạn, huỷ) |
| **Payments** | `payments/` | Ghi nhận thanh toán, tài khoản thanh toán, phương thức (tiền mặt, thẻ, ví) |
| **Training** | `training/` | Lịch tập cá nhân, check-in/out, tiến độ cân nặng, API thiết bị |
| **Facility** | `facility/` | Phòng gym, thiết bị, nhật ký bảo trì |
| **Workout** | `workout/` | Thư viện bài tập, kế hoạch tập, nhật ký thực hiện |
| **Feedback** | `feedback/` | Phản hồi hội viên, phân loại, xử lý và phân công nhân viên |
| **Reports** | `reports/` | Báo cáo doanh thu, tăng trưởng, hiệu suất nhân viên, gói phổ biến |
| **Schedule** | `membership/schedule/` | Cron job tự động expire subscription |
| **Health** | `health/` | Health check endpoint (public, không cần auth) |

---

## Endpoints theo module

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/auth/login` | Public | Đăng nhập email/password → JWT |
| POST | `/auth/logout` | JWT | Đăng xuất |
| GET | `/auth/me` | JWT | Thông tin user hiện tại |
| POST | `/auth/forgot-password` | Public | Gửi OTP đặt lại mật khẩu |
| POST | `/auth/reset-password` | Public | Đặt lại mật khẩu bằng OTP |
| POST | `/auth/verify-email` | Public | Xác minh email bằng OTP |
| POST | `/auth/resend-verify` | Public | Gửi lại OTP xác minh |
| POST | `/auth/line-login` | Public | Đăng nhập bằng LINE LIFF |
| POST | `/auth/change-password` | JWT | Đổi mật khẩu (đã đăng nhập) |

### RBAC — Permissions (`/api/v1/permissions`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/permissions` | `rbac.manage` | Danh sách permissions |
| GET | `/permissions/:id` | `rbac.manage` | Chi tiết permission |

### RBAC — Groups (`/api/v1/groups`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/groups` | `rbac.manage` | Danh sách groups |
| POST | `/groups` | `rbac.manage` | Tạo group |
| GET | `/groups/:id` | `rbac.manage` | Chi tiết group |
| PATCH | `/groups/:id` | `rbac.manage` | Cập nhật group |
| DELETE | `/groups/:id` | `rbac.manage` | Xoá group |
| POST | `/groups/:id/permissions` | `rbac.manage` | Gán permissions vào group |
| DELETE | `/groups/:id/permissions/:permissionId` | `rbac.manage` | Thu hồi permission |

### RBAC — Users Admin (`/api/v1/users`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/users` | `user.read` | Danh sách users |
| GET | `/users/:id` | Self hoặc JWT | Chi tiết user |
| GET | `/users/:id/groups` | Self hoặc JWT | Groups của user |
| POST | `/users/:id/groups` | `rbac.manage` | Gán group cho user |
| DELETE | `/users/:id/groups/:groupId` | `rbac.manage` | Xoá user khỏi group |
| PATCH | `/users/:id` | Self hoặc `user.update` | Cập nhật user |
| DELETE | `/users/:id` | `user.delete` | Xoá user |

### Members (`/api/v1/members`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/members/me` | JWT | Xem profile bản thân |
| PATCH | `/members/me` | JWT | Cập nhật profile bản thân |
| GET | `/members/me/trainers` | JWT | Danh sách trainer có thể chọn |
| PATCH | `/members/me/trainer` | JWT | Tự gán/huỷ trainer |
| POST | `/members/me/progress` | JWT | Ghi nhận cân nặng/chiều cao |
| POST | `/members` | `member.create` | Tạo hội viên (nhân viên quầy) |
| POST | `/members/self-register` | Public | Tự đăng ký online |
| GET | `/members` | `member.read` | Danh sách hội viên |
| GET | `/members/:id` | `member.read` | Chi tiết hội viên |
| PATCH | `/members/:id` | Self hoặc `member.update` | Cập nhật hội viên |
| DELETE | `/members/:id` | `member.delete` | Xoá hội viên (soft) |
| PATCH | `/members/:id/assign-trainer` | `member.update` | Gán trainer cho hội viên |

### Staff (`/api/v1/staff`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/staff/me` | JWT | Profile nhân viên bản thân |
| GET | `/staff` | `staff.read` | Danh sách nhân viên |
| POST | `/staff` | `staff.create` | Tạo nhân viên |
| GET | `/staff/trainers` | JWT | Danh sách trainer (public) |
| GET | `/staff/schedules/range` | `schedule.read` | Lịch làm việc trong khoảng thời gian |
| POST | `/staff/me/attendance/check-in` | JWT | Check-in bản thân |
| POST | `/staff/me/attendance/check-out` | JWT | Check-out bản thân |
| GET | `/staff/me/attendance` | JWT | Xem chấm công bản thân |
| GET | `/staff/:id` | `staff.read` | Chi tiết nhân viên |
| PATCH | `/staff/:id` | `staff.update` | Cập nhật nhân viên |
| DELETE | `/staff/:id` | `staff.delete` | Xoá nhân viên (soft) |
| GET | `/staff/:id/schedules` | `schedule.read` | Lịch làm việc của nhân viên |
| POST | `/staff/:id/schedules` | `schedule.manage` | Tạo lịch làm việc |
| DELETE | `/staff/:id/schedules/:scheduleId` | `schedule.manage` | Xoá lịch làm việc |

### Packages (`/api/v1/packages`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/packages` | `package.read` | Danh sách gói tập |
| POST | `/packages` | `package.manage` | Tạo gói |
| GET | `/packages/:id` | `package.read` | Chi tiết gói |
| PATCH | `/packages/:id` | `package.manage` | Cập nhật gói |
| PATCH | `/packages/:id/status` | `package.manage` | Đổi trạng thái active/inactive |
| DELETE | `/packages/:id` | `package.manage` | Xoá gói |

### Subscriptions (`/api/v1/subscriptions`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| POST | `/subscriptions` | `subscription.create` | Tạo đăng ký |
| GET | `/subscriptions` | `subscription.read` | Danh sách đăng ký |
| GET | `/subscriptions/member/:memberId` | `subscription.read` | Đăng ký của hội viên |
| GET | `/subscriptions/:id` | `subscription.read` | Chi tiết đăng ký |
| PATCH | `/subscriptions/:id/cancel` | `subscription.cancel` | Huỷ đăng ký |
| POST | `/subscriptions/:id/renew` | `subscription.create` | Gia hạn đăng ký |

### Payments (`/api/v1/payments`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| POST | `/payments` | `payment.create` | Tạo thanh toán |
| GET | `/payments` | `payment.read` | Danh sách thanh toán |

### Payment Accounts (`/api/v1/members/:memberId/payment-accounts`)

Controller nằm trong `payments/payments.controller.ts`, không phải module riêng.

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/members/:memberId/payment-accounts` | JWT (self hoặc staff) | Danh sách tài khoản |
| POST | `/members/:memberId/payment-accounts` | JWT (self hoặc staff) | Thêm tài khoản |
| PATCH | `/members/:memberId/payment-accounts/:accountId` | JWT (self hoặc staff) | Đặt tài khoản mặc định |
| DELETE | `/members/:memberId/payment-accounts/:accountId` | JWT (self hoặc staff) | Xoá tài khoản |

### Facility — Rooms (`/api/v1/rooms`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/rooms/lookup` | Public | Danh sách phòng (cho lịch tập) |
| GET | `/rooms` | `room.manage` | Danh sách phòng (quản lý) |
| POST | `/rooms` | `room.manage` | Tạo phòng |
| GET | `/rooms/:id` | `room.manage` | Chi tiết phòng + thống kê |
| PATCH | `/rooms/:id` | `room.manage` | Cập nhật phòng |
| DELETE | `/rooms/:id` | `room.manage` | Xoá phòng |

### Facility — Equipment (`/api/v1/equipment`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/equipment` | `equipment.manage` | Danh sách thiết bị |
| POST | `/equipment` | `equipment.manage` | Thêm thiết bị |
| GET | `/equipment/:id` | `equipment.manage` | Chi tiết thiết bị + lịch sử bảo trì |
| PATCH | `/equipment/:id` | `equipment.manage` | Cập nhật thiết bị |
| DELETE | `/equipment/:id` | `equipment.manage` | Xoá thiết bị |
| GET | `/equipment/:id/maintenance-logs` | `maintenance.read` | Lịch sử bảo trì |
| POST | `/equipment/:id/maintenance-logs` | `maintenance.report` | Báo cáo hỏng hóc |
| PATCH | `/maintenance-logs/:id` | `maintenance.resolve` | Cập nhật trạng thái bảo trì |

### Training (`/api/v1`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/training-sessions` | `session.read` | Danh sách buổi tập |
| POST | `/training-sessions` | `session.manage` | Tạo buổi tập |
| GET | `/training-sessions/:id` | `session.read` | Chi tiết buổi tập |
| PATCH | `/training-sessions/:id` | `session.manage` | Cập nhật buổi tập |
| POST | `/training-sessions/:id/cancel` | `session.manage` | Huỷ buổi tập |
| POST | `/training-sessions/:id/status` | `session.manage` | Cập nhật trạng thái |
| GET | `/attendance-logs` | `attendance.read` | Nhật ký điểm danh |
| POST | `/attendance/manual-checkin` | `attendance.checkin` | Check-in thủ công |
| PATCH | `/attendance-logs/:id/checkout` | `attendance.checkin` | Check-out |
| GET | `/members/:id/progress` | `progress.read` | Lịch sử progress hội viên |
| POST | `/members/:id/progress` | `progress.record` | Ghi nhận progress (staff) |
| DELETE | `/member-progress/:id` | `progress.record` | Xoá progress |
| POST | `/devices/access-events` | API key | Ghi nhận sự kiện thiết bị (door) |

### Workout — Exercises (`/api/v1/exercises`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/exercises` | `exercise.read` | Thư viện bài tập |
| POST | `/exercises` | `exercise.create` | Tạo bài tập |
| GET | `/exercises/external` | `exercise.read` | Tìm kiếm DB bài tập ngoài |
| POST | `/exercises/import` | `exercise.create` | Import từ DB ngoài |
| PATCH | `/exercises/:id` | `exercise.update` | Cập nhật bài tập |
| DELETE | `/exercises/:id` | `exercise.delete` | Xoá bài tập (soft) |

### Workout — Plans (`/api/v1/workout-plans`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/workout-plans` | `workout_plan.create` | Danh sách kế hoạch |
| POST | `/workout-plans` | `workout_plan.create` | Tạo kế hoạch |
| GET | `/workout-plans/suggested` | JWT | Kế hoạch gợi ý |
| GET | `/workout-plans/:id` | `workout_plan.create` | Chi tiết kế hoạch |
| PATCH | `/workout-plans/:id` | `workout_plan.update` | Cập nhật kế hoạch |
| DELETE | `/workout-plans/:id` | `workout_plan.delete` | Xoá kế hoạch |
| POST | `/workout-plans/:id/days` | `workout_plan.update` | Thêm ngày tập |
| PATCH | `/workout-plans/:id/days/:dayId` | `workout_plan.update` | Cập nhật ngày tập |
| DELETE | `/workout-plans/:id/days/:dayId` | `workout_plan.update` | Xoá ngày tập |
| POST | `/workout-plans/:id/days/:dayId/exercises` | `workout_plan.update` | Thêm bài vào ngày |
| PATCH | `/workout-plans/:id/days/:dayId/exercises/:peId` | `workout_plan.update` | Cập nhật bài trong ngày |
| DELETE | `/workout-plans/:id/days/:dayId/exercises/:peId` | `workout_plan.update` | Xoá bài khỏi ngày |
| GET | `/workout-plans/members/:memberId/assignments` | JWT | Kế hoạch được gán cho hội viên |
| POST | `/workout-plans/members/:memberId/assign` | JWT | Gán kế hoạch cho hội viên |
| GET | `/workout-plans/:id/assignments` | `workout_plan.create` | Danh sách gán của kế hoạch |
| DELETE | `/workout-plans/assignments/:assignmentId` | JWT | Huỷ gán kế hoạch |

### Workout — Logs (`/api/v1/workout-logs`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/workout-logs` | `workout_log.read` | Nhật ký tập của bản thân |
| POST | `/workout-logs` | `workout_log.create` | Tạo nhật ký buổi tập |
| PATCH | `/workout-logs/:id` | `workout_log.update` | Cập nhật nhật ký |

### Feedback (`/api/v1/feedback`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/feedback` | `feedback.read` | Danh sách phản hồi |
| POST | `/feedback` | `feedback.create` | Gửi phản hồi |
| GET | `/feedback/:id` | `feedback.read` | Chi tiết phản hồi |
| PATCH | `/feedback/:id/assign` | `feedback.handle` | Phân công nhân viên xử lý |
| PATCH | `/feedback/:id/status` | `feedback.handle` | Cập nhật trạng thái |
| DELETE | `/feedback/:id` | `feedback.create` | Xoá phản hồi (soft) |

### Reports (`/api/v1/reports`)

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/reports/revenue` | `report.view` | Báo cáo doanh thu (lọc theo phương thức) |
| GET | `/reports/members` | `report.view` | Tăng trưởng hội viên |
| GET | `/reports/renewals` | `report.view` | Phân tích gia hạn đăng ký |
| GET | `/reports/employee-performance` | `report.view` | Hiệu suất nhân viên tổng hợp |
| GET | `/reports/employee-performance/:staffId/detail` | `report.view` | Chi tiết hiệu suất nhân viên cụ thể |
| GET | `/reports/staff-performance` | `report.view` | Hiệu suất cá nhân nhân viên |
| GET | `/reports/top-packages` | `report.view` | Gói tập phổ biến nhất |

### Health

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/health` | Public | Kiểm tra kết nối DB và liveness |

---

## Prisma Models — Module sử dụng

| Model | Module sử dụng |
|-------|---------------|
| User | Auth, RBAC, Members, Staff |
| Member | Members, Training, Subscriptions, Payments, Feedback, Workout |
| Staff | Staff, Training, Feedback, Workout |
| Group / Permission / UserGroup / GroupPermission | RBAC, Auth |
| Package | Packages, Subscriptions |
| Subscription | Subscriptions, Payments, Training, Schedule |
| Payment | Payments, Subscriptions, Reports |
| PaymentAccount | Payments |
| GymRoom | Facility, Training |
| Equipment | Facility |
| MaintenanceLog | Facility |
| TrainingSession | Training, Reports |
| AttendanceLog | Training |
| MemberProgress | Training, Members |
| Feedback | Feedback |
| Exercise | Workout |
| WorkoutPlan / WorkoutPlanDay / WorkoutPlanExercise | Workout |
| MemberWorkoutPlan | Workout |
| WorkoutLog / WorkoutLogSet | Workout |
| StaffSchedule | Staff |
| StaffAttendanceLog | Staff |
| OtpCode | Auth |
| AuditLog | Auth, RBAC |
