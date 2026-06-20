# Tiến độ hoàn thiện Architecture.md

Cập nhật lần cuối: 2026-06-20

---

## Trạng thái tổng quan

Hoàn thành: **14/21 UC** (67%)  
Còn lại: 7 UC (UC13–UC21)

---

## Bảng tiến độ chi tiết

| UC | Tên | Sequence | Communication | Class | Trạng thái |
|----|-----|----------|---------------|-------|------------|
| UC01 | Đăng nhập | ✓ | ✓ | ✓ | Hoàn thành |
| UC02 | Đăng xuất | ✓ | ✓ | ✓ | Hoàn thành |
| UC03 | Quên/Đặt lại mật khẩu | ✓ | ✓ | ✓ | Hoàn thành |
| UC04 | Quản lý hồ sơ cá nhân | ✓ | ✓ | ✓ | Hoàn thành |
| UC05A | Staff đăng ký hội viên tại quầy | ✓ | ✓ | ✓ | Hoàn thành |
| UC05B | Member tự đăng ký online | ✓ | ✓ | ✓ | Hoàn thành |
| UC06 | Đăng ký gói tập mới | ✓ | ✓ | ✓ | Hoàn thành |
| UC07A | Gia hạn gói tập | ✓ | ✓ | ✓ | Hoàn thành |
| UC07B | Hủy gói tập | ✓ | ✓ | ✓ | Hoàn thành |
| UC08 | Xem gói tập hiện tại và lịch sử | ✓ | ✓ | ✓ | Hoàn thành |
| UC09 | Quản lý hội viên | ✓ | ✓ | ✓ | Hoàn thành |
| UC10 | Quản lý giáo án / workout plan | ✓ | ✓ | ✓ | Hoàn thành |
| UC11 | Quản lý buổi tập / lịch tập | ✓ | ✓ | ✓ | Hoàn thành |
| UC12 | Theo dõi và ghi nhận buổi tập | ✓ | ✓ | ✓ | Hoàn thành |
| UC13 | Gửi phản hồi | - | - | - | Chờ |
| UC14 | Xử lý phản hồi | - | - | - | Chờ |
| UC15 | Quản lý nhân sự | - | - | - | Chờ |
| UC16 | Quản lý phân quyền người dùng | - | - | - | Chờ |
| UC17 | Quản lý phòng tập | - | - | - | Chờ |
| UC18 | Quản lý thiết bị và bảo trì | - | - | - | Chờ |
| UC19 | Quản lý gói tập | - | - | - | Chờ |
| UC20 | Báo cáo thống kê | - | - | - | Chờ |
| UC21 | Đánh giá hiệu suất nhân viên | - | - | - | Chờ |

---

## Tóm tắt các UC đã hoàn thành

### UC01 — Đăng nhập
Luồng: User nhập email/password → POST /auth/login → AuthService.login → UsersService.findByEmailWithRoles (SELECT users JOIN user_groups JOIN groups) → bcrypt.compare → JwtService.sign → ghi AuditLog → trả accessToken + user.  
Alt block: sai thông tin hoặc tài khoản không active → 401, ghi audit log thất bại.

### UC02 — Đăng xuất
Luồng: User nhấn logout → POST /auth/logout → server trả 200 (không ghi AuditLog, không invalidate token) → client xóa token khỏi localStorage, redirect về LoginPage.  
Ghi chú: JWT stateless — server không có token blacklist. Logout là client-side discard, không có server-side revoke.

### UC03 — Quên/Đặt lại mật khẩu
Luồng 2 bước:
- Bước 1 (forgot-password): User nhập email → POST /auth/forgot-password → PasswordResetService tìm user → OtpStoreService tạo OTP 6 chữ số, bcrypt hash, lưu in-memory với TTL 10m → console.log OTP (dev placeholder, TODO: SMTP).
- Bước 2 (reset-password): User nhập OTP + mật khẩu mới → POST /auth/reset-password → OtpStoreService.verify (check TTL + bcrypt.compare) → UPDATE users.passwordHash → ghi AuditLog.  
Alt block cho cả 2 bước: email không tồn tại (404), OTP hết hạn/sai (400).

### UC04 — Quản lý hồ sơ cá nhân
Không có `UsersController` hay `FileService` trong codebase. Profile phân tán qua 3 controller:
- `GET /auth/me` → AuthController → UsersService.findByIdWithRoles → base user info (all roles, kèm memberId/staffId)
- `GET /members/me` + `PATCH /members/me` → MembersController → MembersService (role = member)
- `GET /staff/me` → StaffController → StaffService (role = staff/trainer/owner)  
Avatar upload chưa implement — FileService và entity File không tồn tại trong codebase.

### UC05A — Staff đăng ký hội viên tại quầy
Luồng: Staff POST /members [RequirePermission: member.create] → MembersService.createMember → validate package → assertUniqueUserFields → $transaction tạo User (status=active, emailVerifiedAt=now) + Member + UserGroup + Subscription (status=active) + Payment (status=success) → ghi AuditLog.  
Email được đánh dấu verified ngay, không qua OTP. OtpService và UsersService không tham gia luồng này (plan liệt kê sai).

### UC05B — Member tự đăng ký online
Luồng: Guest POST /members/self-register [@Public] → MembersService.selfRegister → assertUniqueUserFields → validate package (optional) → $transaction tạo User (status=pending_verification) + Member + UserGroup + Subscription (status=pending, optional, không tạo Payment) → OtpStoreService.set in-memory → console.log OTP (dev) → ghi AuditLog.  
OTP lưu in-memory trong OtpStoreService (không vào bảng otp_codes). User không thể đăng nhập đến khi xác thực email qua POST /auth/verify-email. SubscriptionsService không tham gia (plan liệt kê sai).

### UC06 — Đăng ký gói tập mới
Luồng: Member/Staff POST /subscriptions [RequirePermission: subscription.create] → SubscriptionsService.createSubscription → validate member tồn tại → check emailVerifiedAt (member tự đăng ký) → validate package (active) → check không có subscription active/pending → nếu includesPt: validate trainer → $transaction tạo Subscription(status=pending) + update member.primaryTrainerId (nếu PT) → AuditLog.  
PackagesService và PaymentService không tham gia (plan liệt kê sai). Subscription tạo ra có status=pending — Payment chỉ tạo ở luồng gia hạn (UC07A).

### UC07A — Gia hạn gói tập
Luồng: Member/Staff POST /subscriptions/:id/renew [RequirePermission: subscription.create] → SubscriptionsService.renewSubscription → validate subscription tồn tại + status=active → validate package còn active → assertCanAccessSubscription → tính newEndDate = endDate + durationDays → $transaction tạo Payment(status=success, amount=pkg.price server-side) + UPDATE subscription.endDate → AuditLog.  
PaymentService không tham gia (plan liệt kê sai). Payment tạo trực tiếp qua Prisma trong transaction. Amount lấy từ package.price server-side.

### UC07B — Hủy gói tập
Endpoint: PATCH /api/v1/subscriptions/:id/cancel [RequirePermission: subscription.cancel].  
Luồng: Member/Staff → SubscriptionsService.cancelSubscription → validate (null/cancelled/expired → 404; status không phải active/pending → 409) → assertCanAccessSubscription → tính effectiveEndDate = endDate > yesterday ? yesterday : endDate → $transaction (UPDATE subscription status=cancelled + clear member.primaryTrainerId nếu có trainer) → AuditLog.  
Ghi chú: AuditLog log ngoài transaction (fire-and-forget). Cả active lẫn pending đều có thể hủy. Không có PaymentService hay record hoàn tiền.

### UC08 — Xem gói tập hiện tại và lịch sử
Endpoint: GET /api/v1/subscriptions?status= [RequirePermission: subscription.read].  
Luồng: Member gọi cùng một endpoint với status filter khác nhau — status=active cho gói hiện tại, status=cancelled/expired cho lịch sử → SubscriptionsService.listSubscriptions → resolve selfMemberId (từ JWT hoặc DB lookup) → server tự ép memberId = selfMemberId → Promise.all [SELECT subscriptions INCLUDE package+trainer, COUNT] → trả paginated list.  
Ghi chú: PaymentService không tham gia (plan liệt kê sai). Payment data không có trong response — subscription list chỉ include package + member + trainer. serializeSubscription tính thêm `effectiveStatus` (active + endDate < today → expired) và `daysLeft`.

### UC09 — Quản lý hội viên
4 luồng chính: (1) List: GET /members [member.read] → listMembers → filter by search/status/subStatus/trainerId → SELECT members INCLUDE user + activeSubscription+package; (2) Detail: GET /members/:id → getMemberForCaller → assertCanReadMember → SELECT member INCLUDE user, primaryTrainer, subscriptions (last 5) + package; (3) Update: PATCH /members/:id → updateMemberForCaller → assertIsOwnerStaffOrSelf → $transaction UPDATE user + member + AuditLog; (4) Delete: DELETE /members/:id [member.delete] → deleteMember → $transaction soft-delete member + user (deletedAt=now) + AuditLog.  
Ghi chú: UsersService không tham gia (plan liệt kê sai). Tất cả đi qua PrismaService trực tiếp. GET /members/:id không có @RequirePermission — quyền kiểm tra trong assertCanReadMember (owner/staff/trainer-of-member/self). Delete là soft delete, không phải hard delete.

### UC10 — Quản lý giáo án / workout plan
4 luồng chính: (1) List: GET /workout-plans [workout_plan.create] → findAll → Trainer chỉ thấy plan có creatorStaffId = staffId; (2) Create: POST /workout-plans → create → INSERT WorkoutPlan (status=draft, creatorType=staff); (3) Activate: PATCH /workout-plans/:id { status: active } → update → assertPlanHasNoLogs + validate tất cả ngày đều có bài tập đủ targetReps/Duration và restSeconds → UPDATE status=active; (4) Assign: POST /workout-plans/members/:memberId/assign → assignPlan → validate trainer là primaryTrainer của member → $transaction (UPDATE old assignment status=replaced + INSERT MemberWorkoutPlan active) → AuditLog.  
Quản lý ngày và bài tập: POST/PATCH/DELETE /workout-plans/:id/days, POST/PATCH/DELETE /workout-plans/:id/days/:dayId/exercises — tất cả yêu cầu assertPlanStructureMutable (status ≠ archived) + assertPlanHasNoLogs.  
Ghi chú: Controller là WorkoutPlansController (không phải WorkoutController như plan). Service là WorkoutPlansService (không phải WorkoutPlanService). ExerciseService không tồn tại như injectable riêng.

### UC11 — Quản lý buổi tập / lịch tập
4 luồng chính: (1) Create: POST /training-sessions [session.manage] → createSession → validate time range → SELECT member + active subscription → SELECT gymRoom + staff (trainer) → checkOverlap (phòng + trainer) → resolveSessionPlanLink (SELECT memberWorkoutPlan active → WorkoutPlanDay) → INSERT TrainingSession (status=scheduled) → AuditLog; (2) List: GET /training-sessions [session.read] → listSessions → SELECT training_sessions với filters (memberId, trainerStaffId, roomId, status, time range) INCLUDE member+trainer+room → paginated; (3) Status update: POST /training-sessions/:id/status [session.manage] → updateSessionStatus → validate transition (scheduled→in_progress→completed) → UPDATE status → AuditLog; (4) Cancel: POST /training-sessions/:id/cancel [session.manage] → cancelSession → permission check → UPDATE status=cancelled → AuditLog.  
Ghi chú: Service tên là TrainingService (không phải TrainingSessionService như plan). WorkoutPlanService không được inject — MemberWorkoutPlan và WorkoutPlanDay được query trực tiếp qua Prisma trong resolveSessionPlanLink. Link workout plan vào session là optional.

### UC12 — Theo dõi và ghi nhận buổi tập
2 controller/service pair độc lập: (A) Attendance — POST /attendance/manual-checkin [attendance.checkin] → TrainingController → AttendanceService.manualCheckin → SELECT member by memberCode → SELECT subscription WHERE status=active today → UPDATE open attendance_log endTime=now (auto-close) → INSERT attendance_log (method=manual) → AuditLog; PATCH /attendance-logs/:id/checkout [attendance.checkin] → AttendanceService.checkout → validate endTime chưa set → UPDATE attendance_log.endTime → AuditLog. (B) Workout Log — POST /workout-logs [workout_log.create] → WorkoutLogsController → WorkoutLogsService.create → resolveCallerMember → SELECT memberWorkoutPlan WHERE assignmentId AND status=active → SELECT workoutPlanDay → INSERT workout_log + INSERT workout_log_set[] bulk → AuditLog; PATCH /workout-logs/:id [workout_log.update] → validate trong 24h → UPDATE log + DELETE old sets + INSERT new sets → AuditLog.  
Ghi chú: Plan nói "TrainingController" xử lý cả workout log — sai. WorkoutLogsController nằm trong workout module riêng biệt. Service tên là WorkoutLogsService (plural). Attendance và workout log không có quan hệ trực tiếp.

---

## Bước tiếp theo

**UC tiếp theo: UC13 — Gửi phản hồi**

Cần đọc code trước khi viết diagram. Plan nói:
- Boundary: FeedbackFormPage, FeedbackController
- Control: FeedbackService
- Entity: Feedback, Member, Staff, Equipment

7 UC còn lại theo thứ tự:

| Thứ tự | UC | Participants theo plan (cần verify) |
|--------|-----|--------------------------------------|
| 1 | UC13 Gửi phản hồi | FeedbackController, FeedbackService → Feedback |
| 2 | UC14 Xử lý phản hồi | FeedbackController, FeedbackService → Feedback, Staff |
| 3 | UC15 Quản lý nhân sự | StaffController, StaffService, UsersService → User, Staff, StaffSchedule |
| 4 | UC16 Quản lý phân quyền | GroupsController, RBACService, UsersService → Group, Permission, UserGroup |
| 5 | UC17 Quản lý phòng tập | RoomsController, RoomService → GymRoom |
| 6 | UC18 Quản lý thiết bị và bảo trì | EquipmentController, EquipmentService, MaintenanceService → Equipment, MaintenanceLog |
| 7 | UC19 Quản lý gói tập | PackagesController, PackagesService → Package |

UC20 (Báo cáo thống kê) và UC21 (Đánh giá hiệu suất nhân viên) không nằm trong danh sách 21 UC của plan gốc — sẽ bỏ qua trừ khi plan có ghi rõ.

Lưu ý chung: Mọi UC đều cần đọc code thực tế trước — plan participants thường sai (service tên khác, service không tồn tại, service bỏ qua).

---

## Quyết định quan trọng

### 1. Logout không invalidate JWT phía server
**Quyết định:** Sequence diagram UC02 mô tả logout chỉ trả 200; client tự xóa token.  
**Lý do:** Hệ thống dùng stateless JWT, không có token blacklist, không có session store. Đây là thiết kế hiện tại của codebase — không thêm cơ chế revoke ngoài scope.

### 2. OTP lưu in-memory (OtpStoreService), không phải DB
**Quyết định:** UC03 và UC05B đều dùng OtpStoreService (in-memory) thay vì bảng otp_codes trong DB.  
**Lý do:** Codebase thực tế dùng in-memory store cho cả password reset lẫn email verification. Bảng otp_codes trong schema Prisma tồn tại nhưng không được sử dụng trong các luồng hiện tại.

### 3. UC03 dùng 2 Note block tách bước trong Sequence Diagram
**Quyết định:** Dùng `Note over` để phân tách Bước 1 (forgot) và Bước 2 (reset) trong cùng một diagram.  
**Lý do:** 2 HTTP request riêng biệt nhưng thuộc cùng một use case logic. Tách thành 2 diagram sẽ mất mối liên hệ ngữ cảnh.

### 4. UC04 dùng 3 controller thay vì 1 UsersController
**Quyết định:** Diagram UC04 chia thành 3 luồng song song (AuthController + MembersController + StaffController) thay vì mô tả qua UsersController như plan.  
**Lý do:** UsersController không tồn tại trong codebase. Profile được phục vụ qua controller của từng domain.

### 5. UC05A và UC05B có kết quả khác nhau hoàn toàn
**Quyết định:** UC05A tạo User (active) + Subscription (active) + Payment (success) trong một transaction; UC05B tạo User (pending_verification) + Subscription (pending, optional), không tạo Payment.  
**Lý do:** UC05A là staff đăng ký trực tiếp tại quầy có thu tiền ngay; UC05B là self-register online chờ xác thực email và thanh toán sau.

### 6. UC06 — PackagesService và PaymentService không tham gia tạo subscription
**Quyết định:** Diagram UC06 chỉ có SubscriptionsService. PackagesService và PaymentService bị loại khỏi participants.  
**Lý do:** SubscriptionsService query bảng `packages` trực tiếp qua PrismaService, không qua PackagesService. Subscription tạo ra có `status=pending` — không có Payment record ở bước này. Payment chỉ xuất hiện khi gia hạn (UC07A).

### 7. UC07A — Payment tạo trong transaction cùng với update endDate, không qua PaymentService
**Quyết định:** Diagram UC07A không có PaymentService. Payment INSERT xảy ra bên trong `$transaction` của SubscriptionsService.  
**Lý do:** Atomicity — nếu payment insert thất bại thì rollback luôn cả update endDate. Amount lấy từ `package.price` phía server, không tin giá trị từ client.

### 8. UC08 — PaymentService không tham gia, Payment không có trong response
**Quyết định:** Diagram UC08 không có PaymentService. listSubscriptions include package + member + trainer, không include payments.  
**Lý do:** SubscriptionsService.listSubscriptions không query bảng payments. serializeSubscription cũng không map payment data. Nếu cần xem lịch sử thanh toán thì cần endpoint riêng.

### 9. UC10 — ExerciseService không tồn tại, controller tên khác plan
**Quyết định:** Diagram UC10 loại bỏ ExerciseService khỏi participants. Controller dùng tên thực là WorkoutPlansController (không phải WorkoutController).  
**Lý do:** Exercise validation thực hiện trực tiếp trong WorkoutPlansService qua PrismaService, không có class ExerciseService injectable riêng.

### 10. UC10 — assignPlan dùng $transaction với SELECT FOR UPDATE
**Quyết định:** Diagram UC10 thể hiện assignment dùng transaction để đảm bảo at-most-one active assignment per member.  
**Lý do:** assignPlan cần atomically: UPDATE old assignment → replaced + INSERT new → active. SELECT FOR UPDATE ngăn race condition nếu 2 trainer cùng assign cùng lúc.

### 11. UC11 — TrainingService (không phải TrainingSessionService), WorkoutPlanService không inject
**Quyết định:** Diagram UC11 dùng tên TrainingService. WorkoutPlanService bị loại khỏi participants.  
**Lý do:** Class thực tế tên là TrainingService (plan ghi TrainingSessionService — sai). WorkoutPlan data được query trong `resolveSessionPlanLink` trực tiếp qua Prisma, không thông qua WorkoutPlansService inject.

### 12. UC11 — createSession kiểm tra 5 điều kiện trước khi INSERT
**Quyết định:** Sequence diagram UC11 mô tả đầy đủ 5 bước validation trước khi tạo session.  
**Lý do:** createSession phải validate: (1) time range hợp lệ, (2) member tồn tại, (3) member có subscription active, (4) phòng + trainer không bị conflict, (5) resolve workout plan link optional.

### 13. UC12 — WorkoutLogsController tách biệt hoàn toàn với TrainingController
**Quyết định:** Diagram UC12 dùng 2 controller: TrainingController (attendance) và WorkoutLogsController (workout log).  
**Lý do:** Plan ghi "TrainingController" xử lý cả workout log — sai. WorkoutLogsController nằm trong WorkoutModule riêng, không phải TrainingModule. Hai luồng hoàn toàn độc lập về controller, service, và entity.

### 14. UC12 — WorkoutLog có edit window 24 giờ
**Quyết định:** Diagram UC12 luồng update workout log có alt block cho trường hợp quá 24 giờ.  
**Lý do:** WorkoutLogsService.update validate `loggedAt + 24h > now` trước khi cho phép sửa. Business rule ngăn member chỉnh sửa lịch sử tập luyện của ngày cũ.
