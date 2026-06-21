# Báo cáo Cohesion của thiết kế backend

## 1. Mục đích và phạm vi

Báo cáo này kiểm tra các method trong cùng một class và các thành phần trong cùng một module có phục vụ mục tiêu chung hay không.

**Cohesion** là mức độ liên quan giữa các chức năng bên trong một thành phần. Cohesion càng cao thì thành phần càng dễ hiểu, dễ sửa, dễ test và ít có nguy cơ ảnh hưởng ngoài ý muốn.

Kết quả được đối chiếu trực tiếp với `server/src` ngày 21/06/2026. Phạm vi gồm:

- 32 service;
- 19 controller;
- 16 module;
- các guard, strategy, filter và class hỗ trợ chính;
- public method và private method;
- dữ liệu mà các method cùng đọc hoặc sửa;
- thứ tự và luồng dữ liệu giữa các method.

DTO, exception đơn giản và type chỉ chứa dữ liệu không được phân loại riêng vì chúng gần như không có hành vi.

## 2. Cách đọc kết quả

Tài liệu dùng tám mức cohesion, từ thấp đến cao:

| Mức | Giải thích đơn giản | Mức liên kết bên trong |
| --- | --- | --- |
| **Coincidental** | Các chức năng được đặt chung nhưng gần như không liên quan. | Rất thấp |
| **Logical** | Các chức năng chỉ cùng một chủ đề lớn. | Thấp đến trung bình |
| **Temporal** | Các chức năng được đặt chung vì chạy cùng một thời điểm hoặc cùng vòng đời. | Trung bình |
| **Procedural** | Các chức năng liên quan vì phải chạy theo một thứ tự. | Trung bình |
| **Communicational** | Các chức năng cùng dùng hoặc cùng sửa một nhóm dữ liệu. | Trung bình đến cao |
| **Sequential** | Kết quả của bước trước được dùng làm đầu vào cho bước sau. | Cao |
| **Functional** | Mọi method cùng phục vụ một chức năng rõ ràng. | Rất cao |
| **Informational** | Nhiều thao tác cùng làm việc trên một loại dữ liệu, ví dụ CRUD. | Rất cao |

Mỗi thành phần có một **mức chính** dựa trên lý do quan trọng nhất khiến các chức năng được đặt chung. Một thành phần vẫn có thể mang đặc điểm của mức khác. Ví dụ, `LineOAuthService` có mức chính là Functional vì chỉ phục vụ đăng nhập LINE, đồng thời có luồng Sequential vì kết quả của bước trước được chuyển sang bước sau.

## 3. Coincidental Cohesion

### 3.1. Đặc điểm

Coincidental Cohesion xảy ra khi một class hoặc module chứa các chức năng gần như ngẫu nhiên, không cùng mục tiêu, không cùng dữ liệu và cũng không tạo thành một luồng xử lý.

Đây là mức thấp nhất. Một thành phần thuộc mức này thường khó đặt tên rõ ràng, khó test và có nhiều lý do không liên quan để thay đổi.

### 3.2. Kết quả kiểm tra

**Không phát hiện class hoặc module nào có Coincidental Cohesion làm mức chính.**

Một số thành phần có phạm vi rộng nhưng vẫn không phải Coincidental:

- [`TrainingService`](../../server/src/training/training.service.ts) chứa session, attendance, device access và progress, nhưng tất cả vẫn thuộc hoạt động tập luyện;
- [`ReportsService`](../../server/src/reports/reports.service.ts) tạo nhiều loại báo cáo khác nhau, nhưng tất cả cùng phục vụ việc tổng hợp số liệu;
- [`AppModule`](../../server/src/app.module.ts) chứa nhiều module nghiệp vụ không trực tiếp liên quan, nhưng chúng được đặt chung đúng mục tiêu là khởi tạo ứng dụng.

Các thành phần trên được xếp vào Logical hoặc Temporal thay vì Coincidental.

## 4. Logical Cohesion

### 4.1. Đặc điểm

Logical Cohesion xuất hiện khi các chức năng cùng một chủ đề lớn nhưng xử lý các dữ liệu hoặc quy trình khác nhau. Đây chưa phải cohesion tốt vì thành phần thường có nhiều lý do để thay đổi.

### 4.2. Service

| Service | Các nhóm chức năng | Đánh giá |
| --- | --- | --- |
| [`AuthService`](../../server/src/auth/auth.service.ts) | Đăng nhập, đổi mật khẩu và chuyển tiếp quên mật khẩu, xác minh email, LINE login | Trung bình. Các method cùng chủ đề xác thực nhưng thuộc nhiều luồng khác nhau. Việc giao phần lớn xử lý cho service chuyên trách giúp class chưa quá nặng. |
| [`MembersService`](../../server/src/members/members.service.ts) | CRUD hội viên, đăng ký, OTP, subscription, payment, gán PT và tiến độ | Trung bình. Các chức năng cùng liên quan hội viên nhưng tạo hội viên đã đi xa hơn CRUD và chạm nhiều dữ liệu khác. |
| [`PaymentsService`](../../server/src/payments/payments.service.ts) | Giao dịch thanh toán và tài khoản nhận thanh toán | Trung bình. Hai nhóm cùng chủ đề thanh toán nhưng có vòng đời và quy tắc khác nhau. |
| [`RbacService`](../../server/src/rbac/rbac.service.ts) | Permission, group, group-permission, user và user-group | Trung bình. Class quản lý nhiều loại dữ liệu trong cùng hệ thống phân quyền. |
| [`ReportsService`](../../server/src/reports/reports.service.ts) | Báo cáo doanh thu, hội viên, gia hạn, nhân viên và gói tập | Trung bình đến thấp. Các method chỉ giống nhau ở đầu ra là báo cáo; dữ liệu và công thức của từng báo cáo khác nhau. |
| [`TrainingService`](../../server/src/training/training.service.ts) | Session, attendance, device access, progress, quyền truy cập và liên kết workout plan | Trung bình đến thấp. Đây là service nghiệp vụ có phạm vi rộng nhất và có nhiều lý do để thay đổi. |

`TrainingService` là trường hợp Logical rõ nhất. Session và progress được xử lý trực tiếp, còn attendance và device access lại được chuyển tiếp đến service khác. Vì vậy class vừa xử lý nghiệp vụ, vừa làm điểm gọi chung cho nhiều nhóm chức năng.

### 4.3. Controller

| Controller | Các nhóm API | Đánh giá |
| --- | --- | --- |
| [`AuthController`](../../server/src/auth/auth.controller.ts) | Login, user hiện tại, OTP, LINE và đổi mật khẩu | Cùng chủ đề xác thực nhưng là nhiều luồng riêng. |
| [`MembersController`](../../server/src/members/members.controller.ts) | Hồ sơ, CRUD member, PT và progress | Cùng chủ đề hội viên nhưng có nhiều nhóm endpoint. |
| [`TrainingController`](../../server/src/training/training.controller.ts) | Session, attendance và progress | Phản ánh phạm vi rộng của `TrainingService`. |
| [`StaffController`](../../server/src/staff/staff.controller.ts) | CRUD staff, lịch và chấm công | Ba nhóm API cùng đặt dưới chủ đề nhân viên. |
| [`FacilityController`](../../server/src/facility/facility.controller.ts) | Room, equipment và maintenance | Ba resource khác nhau cùng thuộc cơ sở vật chất. |
| [`ReportsController`](../../server/src/reports/reports.controller.ts) | Nhiều loại báo cáo | Các endpoint chỉ cùng mục tiêu tổng quát là xem báo cáo. |

Các controller trên chủ yếu nhận request và gọi service nên vấn đề chưa nghiêm trọng như ở service. Tuy nhiên, controller Logical thường là dấu hiệu cho thấy module phía sau cũng đang có phạm vi rộng.

### 4.4. Module

| Module | Thành phần được gom chung | Đánh giá |
| --- | --- | --- |
| [`AuthModule`](../../server/src/auth/auth.module.ts) | Login, JWT, OTP, email và LINE | Trung bình. Cùng chủ đề xác thực nhưng có nhiều luồng. |
| [`RbacModule`](../../server/src/rbac/rbac.module.ts) | Permission, group và user admin | Trung bình. Gồm nhiều loại dữ liệu phân quyền. |
| [`PaymentsModule`](../../server/src/payments/payments.module.ts) | Payment và payment account | Trung bình. Hai resource cùng chủ đề thanh toán. |
| [`TrainingModule`](../../server/src/training/training.module.ts) | Session, attendance, device và progress | Trung bình đến thấp. Đây là module nghiệp vụ rộng nhất. |
| [`ReportsModule`](../../server/src/reports/reports.module.ts) | Các loại báo cáo | Trung bình đến thấp. Các thành phần được gom theo đầu ra “report”, không theo một nhóm dữ liệu chung. |

## 5. Temporal Cohesion

### 5.1. Đặc điểm

Temporal Cohesion xuất hiện khi các chức năng được đặt chung vì chúng chạy tại cùng một thời điểm, cùng lịch hoặc cùng vòng đời. Mức này phù hợp với code hạ tầng và tác vụ định kỳ.

### 5.2. Các thành phần được xếp loại

| Thành phần | Các chức năng | Đánh giá |
| --- | --- | --- |
| [`PrismaService`](../../server/src/prisma/prisma.service.ts) | Kết nối khi module khởi động và ngắt kết nối khi module dừng | Cao. Hai method quản lý trọn vòng đời kết nối database. |
| [`SubscriptionScheduleService`](../../server/src/membership/schedule/subscription-schedule.service.ts) | Hết hạn, kích hoạt và hủy subscription chưa thanh toán theo lịch | Trung bình đến cao. Ba tác vụ độc lập nhưng chạy theo lịch và cùng sửa trạng thái subscription. |
| [`AppModule`](../../server/src/app.module.ts) | Nạp cấu hình và các module khi ứng dụng khởi động | Phù hợp. Module gốc cần gom các thành phần tại thời điểm khởi tạo ứng dụng. |
| [`PrismaModule`](../../server/src/prisma/prisma.module.ts) | Cung cấp database client trong vòng đời ứng dụng | Cao. Module chỉ phục vụ kết nối database. |

Temporal Cohesion trong các trường hợp này không phải dấu hiệu xấu. Trách nhiệm về thời điểm chạy của từng thành phần đều rõ ràng.

## 6. Procedural Cohesion

### 6.1. Đặc điểm

Procedural Cohesion xuất hiện khi các bước liên quan chủ yếu vì phải chạy đúng thứ tự. Không phải kết quả của mọi bước đều trở thành đầu vào trực tiếp cho bước sau.

### 6.2. Kết quả kiểm tra

**Không có toàn bộ class hoặc module nào lấy Procedural làm mức chính.** Mức này chủ yếu xuất hiện bên trong các method nghiệp vụ phức tạp.

Ví dụ rõ nhất là `StaffService.delete` trong [`StaffService`](../../server/src/staff/staff.service.ts):

1. tìm training session của trainer;
2. bỏ liên kết session trong attendance log;
3. xóa maintenance log;
4. xóa lịch và chấm công;
5. bỏ các khóa ngoại còn tham chiếu;
6. ẩn danh audit log;
7. xóa file, staff và user.

Các bước đều phục vụ việc xóa nhân viên và cùng dùng `staffId`, nhưng thứ tự dọn dữ liệu quyết định method có chạy thành công hay không.

Các method xóa room, equipment, member và group cũng có dạng tương tự:

- kiểm tra dữ liệu đang được sử dụng;
- xử lý hoặc xóa dữ liệu liên quan;
- sau đó mới xóa dữ liệu chính.

Procedural Cohesion ở cấp method là hợp lý. Rủi ro chỉ tăng khi một method có quá nhiều bước, nhiều nhánh lỗi hoặc phải biết quá nhiều chi tiết của nhiều bảng dữ liệu.

## 7. Communicational Cohesion

### 7.1. Đặc điểm

Communicational Cohesion xuất hiện khi các method hoặc thành phần cùng dùng, đọc hoặc sửa một nhóm dữ liệu. Mức này khá tốt vì dữ liệu chung tạo ra ranh giới trách nhiệm dễ hiểu.

### 7.2. Service

| Service | Dữ liệu chung | Đánh giá |
| --- | --- | --- |
| [`FacilityService`](../../server/src/facility/facility.service.ts) | Room, equipment trong room và maintenance của equipment | Trung bình đến cao. Các nhóm có quan hệ dữ liệu trực tiếp, dù vẫn là ba loại resource khác nhau. |
| [`StaffService`](../../server/src/staff/staff.service.ts) | Staff, lịch và chấm công gắn với staff | Trung bình. Phần schedule và attendance đã có service riêng nhưng vẫn được đưa ra lại qua `StaffService`. |

Các service Logical sau cũng có Communicational Cohesion làm mức phụ:

- `MembersService` cùng dùng member và member ID;
- `PaymentsService` cùng dùng dữ liệu member, subscription và payment;
- `RbacService` cùng dùng quan hệ permission, group và user;
- `TrainingService` cùng dùng member, trainer, session và attendance.

### 7.3. Module

| Module | Dữ liệu chung | Đánh giá |
| --- | --- | --- |
| [`MembershipModule`](../../server/src/membership/membership.module.ts) | Package, subscription và lịch đổi trạng thái subscription | Trung bình đến cao |
| [`MembersModule`](../../server/src/members/members.module.ts) | Member, quan hệ member-trainer và member progress | Trung bình |
| [`WorkoutModule`](../../server/src/workout/workout.module.ts) | Exercise, workout plan và workout log | Trung bình đến cao |
| [`StaffModule`](../../server/src/staff/staff.module.ts) | Staff, staff schedule và staff attendance | Trung bình đến cao |
| [`FacilityModule`](../../server/src/facility/facility.module.ts) | Room, equipment và maintenance | Trung bình đến cao |

Các module này có phạm vi rộng hơn một resource, nhưng quan hệ dữ liệu giữa các phần vẫn đủ rõ. Vì vậy chưa cần tách chỉ vì module chứa nhiều service.

## 8. Sequential Cohesion

### 8.1. Đặc điểm

Sequential Cohesion xuất hiện khi kết quả của bước trước được dùng làm đầu vào cho bước sau. Đây là mức cao nếu cả chuỗi cùng hoàn thành một mục tiêu rõ ràng.

### 8.2. Các service được xếp loại

| Service | Chuỗi xử lý | Đánh giá |
| --- | --- | --- |
| [`PasswordResetService`](../../server/src/auth/password-reset.service.ts) | Yêu cầu quên mật khẩu → tạo OTP → kiểm tra OTP → đặt mật khẩu mới | Cao. Hai public method tạo thành một luồng khép kín. |
| [`EmailVerificationService`](../../server/src/auth/email-verification.service.ts) | Gửi OTP → đọc OTP → xác minh email | Cao. Mọi bước phục vụ xác minh email. |

### 8.3. Các luồng Sequential trong thành phần khác

- [`LineOAuthService`](../../server/src/auth/line-oauth.service.ts): LINE token → LINE profile → user → JWT;
- [`DeviceAccessService`](../../server/src/training/device-access.service.ts): mã hội viên → member → subscription → session → attendance;
- `MembersService.createMember`: package → user → member → subscription → payment;
- `PaymentsService.createPayment`: subscription → kiểm tra quyền → payment → cập nhật subscription;
- [`StaffAttendanceService`](../../server/src/staff/staff-attendance.service.ts): check-in tạo bản ghi để check-out hoàn tất;
- [`AttendanceService`](../../server/src/training/attendance.service.ts): check-in tạo attendance để check-out cập nhật.

Các chuỗi trên có liên quan chặt chẽ. Tuy nhiên, một method Sequential quá dài vẫn nên được chia thành các private method có tên rõ để dễ test từng bước.

## 9. Functional Cohesion

### 9.1. Đặc điểm

Functional Cohesion xuất hiện khi tất cả method của một thành phần cùng phục vụ một chức năng cụ thể. Đây là một trong hai mức tốt nhất.

### 9.2. Service

| Service | Chức năng duy nhất | Đánh giá |
| --- | --- | --- |
| [`LineOAuthService`](../../server/src/auth/line-oauth.service.ts) | Đăng nhập bằng LINE | Cao |
| [`AuditService`](../../server/src/common/audit/audit.service.ts) | Ghi audit log | Rất cao |
| [`RateLimitService`](../../server/src/common/rate-limit/rate-limit.service.ts) | Kiểm tra giới hạn request | Rất cao |
| [`MemberProgressService`](../../server/src/members/member-progress.service.ts) | Ghi tiến độ của hội viên | Rất cao |
| [`DeviceAccessService`](../../server/src/training/device-access.service.ts) | Xử lý một sự kiện thiết bị ra vào | Cao |

### 9.3. Controller và module

| Thành phần | Chức năng duy nhất | Đánh giá |
| --- | --- | --- |
| [`HealthController`](../../server/src/health/health.controller.ts) | Trả trạng thái health check | Rất cao |
| `DeviceController` trong [`training.controller.ts`](../../server/src/training/training.controller.ts) | Nhận sự kiện từ thiết bị | Rất cao |
| [`HealthModule`](../../server/src/health/health.module.ts) | Cung cấp health check | Rất cao |

### 9.4. Guard, strategy và filter

| Class | Chức năng | Đánh giá |
| --- | --- | --- |
| [`JwtAuthGuard`](../../server/src/auth/guards/jwt-auth.guard.ts) | Kiểm tra route public và xác thực JWT | Cao |
| [`RolesGuard`](../../server/src/auth/guards/roles.guard.ts) | Kiểm tra vai trò | Rất cao |
| [`PermissionsGuard`](../../server/src/common/guards/permissions.guard.ts) | Kiểm tra quyền của request | Cao. Các private method đều hỗ trợ `canActivate`. |
| [`DeviceApiKeyGuard`](../../server/src/training/guards/device-api-key.guard.ts) | Kiểm tra API key của thiết bị | Rất cao |
| [`JwtStrategy`](../../server/src/auth/strategies/jwt.strategy.ts) | Chuyển JWT payload thành user hiện tại | Cao |
| [`HttpExceptionFilter`](../../server/src/common/filters/http-exception.filter.ts) | Chuẩn hóa exception thành response lỗi | Cao |
| `MemberCallerQueryFilter` | Thêm điều kiện member vào query | Rất cao |
| `TrainerCallerQueryFilter` | Thêm điều kiện trainer vào query | Rất cao |
| `AdminCallerQueryFilter` | Giữ query không giới hạn đối với admin | Rất cao |

Ba caller query filter cùng nằm trong [`caller-query-filter.ts`](../../server/src/training/filters/caller-query-filter.ts). Mỗi class chỉ có một nhiệm vụ rõ ràng.

## 10. Informational Cohesion

### 10.1. Đặc điểm

Informational Cohesion xuất hiện khi nhiều method cùng thao tác trên một loại dữ liệu hoặc một cụm dữ liệu thống nhất. CRUD service là ví dụ phổ biến. Đây cũng là một trong hai mức tốt nhất.

### 10.2. Service

| Service | Dữ liệu được quản lý | Đánh giá |
| --- | --- | --- |
| [`UsersService`](../../server/src/auth/users.service.ts) | User được tìm theo email, LINE ID hoặc user ID | Cao |
| [`InMemoryPermissionCacheService`](../../server/src/common/cache/in-memory-permission-cache.service.ts) | Permission cache | Rất cao |
| [`OtpStoreService`](../../server/src/common/otp-store/otp-store.service.ts) | OTP và số lần thử | Rất cao |
| [`EquipmentService`](../../server/src/facility/equipment.service.ts) | Equipment | Cao |
| [`MaintenanceService`](../../server/src/facility/maintenance.service.ts) | Maintenance log | Cao |
| [`FeedbackService`](../../server/src/feedback/feedback.service.ts) | Feedback và trạng thái của feedback | Cao |
| [`TrainerAssignmentService`](../../server/src/members/trainer-assignment.service.ts) | Quan hệ member-trainer | Cao |
| [`PackagesService`](../../server/src/membership/packages/packages.service.ts) | Package | Cao |
| [`SubscriptionsService`](../../server/src/membership/subscriptions/subscriptions.service.ts) | Subscription | Cao |
| [`StaffAttendanceService`](../../server/src/staff/staff-attendance.service.ts) | Staff attendance | Cao |
| [`StaffScheduleService`](../../server/src/staff/staff-schedule.service.ts) | Staff schedule | Cao |
| [`AttendanceService`](../../server/src/training/attendance.service.ts) | Training attendance | Cao |
| [`ExercisesService`](../../server/src/workout/exercises/exercises.service.ts) | Exercise, kể cả tìm và import từ nguồn ngoài | Trung bình đến cao |
| [`WorkoutLogsService`](../../server/src/workout/workout-logs/workout-logs.service.ts) | Workout log và log set | Cao |
| [`WorkoutPlansService`](../../server/src/workout/workout-plans/workout-plans.service.ts) | Plan, plan day, plan exercise và assignment | Trung bình đến cao |

`WorkoutPlansService` dài nhưng các phần plan, day, exercise và assignment vẫn tạo thành một cụm giáo án thống nhất. Vì vậy số dòng lớn chưa đủ để kết luận cohesion thấp. Chỉ nên tách phần assignment nếu nó tiếp tục có thêm nhiều quy tắc và lý do thay đổi riêng.

### 10.3. Controller

| Controller | Resource chính | Đánh giá |
| --- | --- | --- |
| [`PermissionsController`](../../server/src/rbac/permissions.controller.ts) | Permission | Cao |
| [`GroupsController`](../../server/src/rbac/groups.controller.ts) | Group và permission của group | Cao |
| [`UsersAdminController`](../../server/src/rbac/users-admin.controller.ts) | User và group của user | Cao |
| [`PackagesController`](../../server/src/membership/packages/packages.controller.ts) | Package | Cao |
| [`SubscriptionsController`](../../server/src/membership/subscriptions/subscriptions.controller.ts) | Subscription | Cao |
| `PaymentsController` trong [`payments.controller.ts`](../../server/src/payments/payments.controller.ts) | Payment | Cao |
| `PaymentAccountsController` trong [`payments.controller.ts`](../../server/src/payments/payments.controller.ts) | Payment account | Cao |
| [`FeedbackController`](../../server/src/feedback/feedback.controller.ts) | Feedback | Cao |
| [`ExercisesController`](../../server/src/workout/exercises/exercises.controller.ts) | Exercise | Trung bình đến cao |
| [`WorkoutLogsController`](../../server/src/workout/workout-logs/workout-logs.controller.ts) | Workout log | Cao |
| [`WorkoutPlansController`](../../server/src/workout/workout-plans/workout-plans.controller.ts) | Workout plan và các phần của plan | Trung bình đến cao |

### 10.4. Module

| Module | Dữ liệu được cung cấp | Đánh giá |
| --- | --- | --- |
| [`PermissionCacheModule`](../../server/src/common/cache/permission-cache.module.ts) | Permission cache | Cao |
| [`OtpStoreModule`](../../server/src/common/otp-store/otp-store.module.ts) | OTP store | Cao |
| [`FeedbackModule`](../../server/src/feedback/feedback.module.ts) | Feedback | Cao |

## 11. Tổng hợp kết quả

### 11.1. Phân bố mức chính của 32 service

| Mức chính | Số service | Nhận xét |
| --- | ---: | --- |
| Coincidental | 0 | Không có chức năng bị gom chung một cách ngẫu nhiên. |
| Logical | 6 | Các service lớn, cùng chủ đề nhưng gồm nhiều nhóm việc. |
| Temporal | 2 | Vòng đời Prisma và tác vụ subscription theo lịch. |
| Procedural | 0 | Chỉ xuất hiện rõ bên trong một số method. |
| Communicational | 2 | Các nhóm method cùng dùng một cụm dữ liệu. |
| Sequential | 2 | Hai luồng OTP có các bước nối tiếp nhau. |
| Functional | 5 | Service có một chức năng hoặc một luồng rõ ràng. |
| Informational | 15 | Phần lớn service quản lý một resource hoặc một cụm dữ liệu. |

### 11.2. Nhìn chung theo loại thành phần

- **Service:** phần lớn có Informational hoặc Functional Cohesion, nhưng một số service điều phối lớn chỉ đạt Logical.
- **Controller:** đa số có cohesion cao vì endpoint cùng thao tác một resource. Controller Logical thường phản ánh module nghiệp vụ có phạm vi rộng.
- **Module:** đa số có ranh giới theo dữ liệu hoặc nghiệp vụ. `TrainingModule` và `ReportsModule` là hai module có cohesion thấp hơn phần còn lại.
- **Class hỗ trợ:** guard, strategy và filter có Functional Cohesion cao, trách nhiệm rõ ràng.

## 12. Kết luận và đánh giá

### 12.1. Cohesion của backend có thấp không?

**Không. Cohesion chung của backend ở mức trung bình đến cao.**

Các lý do chính:

- 20/32 service có mức chính là Functional hoặc Informational;
- không phát hiện Coincidental Cohesion;
- phần lớn CRUD và quy tắc của một resource được đặt trong service riêng;
- attendance, schedule, maintenance, trainer assignment, OTP và device access đã được tách thành các class chuyên trách;
- guard và filter đều có một mục tiêu rõ ràng.

Điểm chưa tốt nằm ở một số class Logical. Các class này không chứa chức năng ngẫu nhiên, nhưng các method chỉ liên quan qua một chủ đề lớn nên vẫn có nhiều lý do khác nhau để thay đổi.

### 12.2. Class hoặc module nào đang làm quá nhiều việc?

| Mức ưu tiên | Thành phần | Có làm quá nhiều việc không? | Lý do |
| ---: | --- | --- | --- |
| 1 | `TrainingService`, `TrainingModule` | **Có, rõ nhất** | Cùng lúc quản lý session, attendance, device access, progress, quyền và liên kết workout plan. |
| 2 | `ReportsService`, `ReportsModule` | **Có xu hướng** | Mỗi loại báo cáo dùng dữ liệu và công thức khác nhau; class sẽ phình nhanh khi thêm báo cáo. |
| 3 | `RbacService`, `RbacModule` | **Có** | Quản lý permission, group và user access trong một service. |
| 4 | `MembersService` | **Có** | Vừa CRUD member, vừa đăng ký/OTP, vừa tạo subscription/payment, vừa chuyển tiếp PT và progress. |
| 5 | `PaymentsService`, `PaymentsModule` | **Hơi nhiều** | Payment transaction và payment account là hai resource có vòng đời riêng. |
| 6 | `AuthService`, `AuthModule` | **Hiện vẫn chấp nhận được** | Có nhiều luồng xác thực nhưng phần xử lý lớn đã được giao cho service riêng. Sẽ quá tải nếu tiếp tục thêm logic trực tiếp. |

Các thành phần rộng nhưng **chưa thể kết luận là làm quá nhiều việc**:

- `FacilityService` và `StaffService` chủ yếu là điểm điều phối mỏng; dữ liệu bên trong có quan hệ trực tiếp và service chuyên trách đã tồn tại;
- `WorkoutPlansService` dài nhưng các method vẫn cùng làm việc trên một cụm dữ liệu giáo án;
- `AppModule` chứa nhiều module vì đó là trách nhiệm tự nhiên của module gốc.

### 12.3. Ảnh hưởng của các điểm cohesion thấp

- **Khó sửa:** sửa một service Logical có thể ảnh hưởng nhiều nhóm chức năng trong cùng file. Ví dụ thay đổi `TrainingService` có thể chạm session, progress hoặc quyền truy cập.
- **Khó test:** test phải dựng nhiều dependency và nhiều nhóm dữ liệu không cùng một kịch bản. Điều này rõ ở `TrainingService`, `RbacService` và `ReportsService`.
- **Khó mở rộng:** thêm chức năng mới vào class cùng “chủ đề” rất tiện lúc đầu nhưng làm class phình dần. `ReportsService` là ví dụ dễ gặp nhất.
- **Khó phân công:** nhiều thay đổi độc lập cùng tập trung vào một file sẽ tăng xung đột khi nhiều người cùng phát triển.

### 12.4. Hướng cải thiện

Ưu tiên chia theo **lý do thay đổi**, không chia chỉ vì file dài:

1. tách `TrainingSessionService` và `TrainingProgressService` khỏi `TrainingService`; giữ một service điều phối mỏng nếu API cần một điểm gọi chung;
2. tách báo cáo theo nhóm như revenue, member, staff và package khi số báo cáo hoặc test tiếp tục tăng;
3. tách `RbacService` thành `PermissionService`, `GroupService` và `UserAccessService`;
4. giữ CRUD member trong `MembersService`, chuyển đăng ký và luồng member-subscription-payment sang service điều phối riêng;
5. tách giao dịch thanh toán và tài khoản thanh toán thành hai service;
6. tiếp tục giữ các service Functional và Informational hiện có, không gộp ngược vào service lớn.

Kết luận cuối cùng: thiết kế hiện tại **không có cohesion thấp trên diện rộng**. Vấn đề tập trung ở một số service Logical đang làm nhiều nhóm việc. `TrainingService` nên được ưu tiên xử lý trước; các service còn lại có thể tách dần khi số method, số dependency hoặc độ phức tạp test tiếp tục tăng.
